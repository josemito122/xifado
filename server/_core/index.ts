import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers.js";
import { createContext } from "./context.js";
import { supabaseAdmin } from "../supabase.js";
import { serveStatic, setupVite } from "./vite.js";

const app = express();
const server = createServer(app);

// Configure body parser with larger size limit for file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.get("/api/health", async (_req, res) => {
  try {
    const { error } = await supabaseAdmin.from("xifado_state").select("id").eq("id", 1).maybeSingle();
    if (error) return res.status(503).json({ status: "degraded", database: "error", version: "1.0.0" });
    return res.status(200).json({ status: "ok", database: "ok", version: "1.0.0" });
  } catch { 
    return res.status(503).json({ status: "degraded", database: "error", version: "1.0.0" }); 
  }
});

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const serverCheck = net.createServer();
    serverCheck.listen(port, () => {
      serverCheck.close(() => resolve(true));
    });
    serverCheck.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Só inicia o listen se não estiver rodando na Vercel
  if (!process.env.VERCEL) {
    const preferredPort = parseInt(process.env.PORT || "3000");
    const port = await findAvailablePort(preferredPort);

    if (port !== preferredPort) {
      console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
    }

    server.listen(port, () => {
      console.log(`Server running on http://localhost:${port}/`);
    });
  }
}

startServer().catch(console.error);

// Exportação obrigatória para a Vercel controlar as chamadas de API
export default app;
