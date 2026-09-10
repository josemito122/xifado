import express, { type NextFunction, type Request, type Response } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../../server/routers.js";
import { createContext } from "../../server/_core/context.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb", type: ["application/json", "application/*+json"] }));
app.use(
  "/",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: { message: "Rota tRPC não encontrada.", code: "NOT_FOUND" } });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Vercel tRPC] request failed", error);
  if (res.headersSent) return;
  res.status(500).json({ error: { message: "O servidor não conseguiu processar a solicitação.", code: "INTERNAL_SERVER_ERROR" } });
});

export default app;
