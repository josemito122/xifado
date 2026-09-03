import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { describe, expect, it, vi } from "vitest";
import { hashParticipantPassword } from "./security";
import type { XifadoData } from "@shared/xifado";

const state: XifadoData = { schedule: { start: "2026-01-01T00:00:00-03:00", end: "2026-12-31T23:59:00-03:00" }, members: { Cadu: { eliminated: false, timestamp: null, reason: "", rank: null, duration: null, sessionVersion: 1, active: true, lossHistory: [] } }, credentials: {}, penalties: [], rules: [] };
state.credentials.Cadu = await hashParticipantPassword("TEST1234");

vi.mock("./db", () => ({
  getXifadoState: vi.fn(async () => structuredClone(state)),
  saveXifadoState: vi.fn(async (next: XifadoData) => Object.assign(state, next)),
  mutateXifadoState: vi.fn(async (mutator: (data: XifadoData) => Promise<XifadoData> | XifadoData) => { const next = await mutator(structuredClone(state)); Object.assign(state, next); return next; }),
}));
vi.mock("./rate-limit", () => ({ assertRateLimit: vi.fn(async () => undefined), requestKey: vi.fn(() => "http-test") }));

process.env.XIFADO_MASTER_CODE = "TEST-MASTER-HTTP";
const { appRouter } = await import("./routers");
const { createContext } = await import("./_core/context");

function request(app: express.Express, path: string, body: unknown) {
  return new Promise<{ status: number; type: string | undefined; body: any; cookies: string[] }>((resolve, reject) => {
    const server = app.listen(0, () => {
      const address = server.address(); const port = typeof address === "object" && address ? address.port : 0;
      fetch(`http://127.0.0.1:${port}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ 0: { json: body } }) }).then(async (response) => { const text = await response.text(); server.close(); resolve({ status: response.status, type: response.headers.get("content-type") ?? undefined, body: JSON.parse(text), cookies: response.headers.getSetCookie?.() ?? [] }); }).catch((error) => { server.close(); reject(error); });
    });
  });
}

describe("Xifado HTTP authentication", () => {
  it("returns JSON and a participant cookie for valid login", async () => {
    const app = express(); app.use(express.json()); app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
    const result = await request(app, "/api/trpc/xifado.participantLogin?batch=1", { name: "Cadu", password: "TEST1234" });
    expect(result.status).toBe(200); expect(result.type).toContain("application/json"); expect(result.body[0]?.result?.data?.json?.name).toBe("Cadu"); expect(result.cookies.some((cookie) => cookie.startsWith("xifado_participant_session="))).toBe(true);
  });

  it("returns JSON and a master cookie for valid login", async () => {
    const app = express(); app.use(express.json()); app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
    const result = await request(app, "/api/trpc/xifado.master.verify?batch=1", { masterCode: "TEST-MASTER-HTTP" });
    expect(result.status).toBe(200); expect(result.type).toContain("application/json"); expect(result.body[0]?.result?.data?.json?.success).toBe(true); expect(result.cookies.some((cookie) => cookie.startsWith("xifado_master_session="))).toBe(true);
  });
});
