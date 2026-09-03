import { createHmac, timingSafeEqual } from "node:crypto";

function getSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error("JWT_SECRET não configurado para sessões de participante.");
  return secret;
}

const encode = (value: string) => Buffer.from(value, "utf8").toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");
const sign = (body: string) => createHmac("sha256", getSecret()).update(body).digest("base64url");

export type ParticipantSession = { name: string; sessionVersion: number };

export function createParticipantSession(name: string, sessionVersion: number): string {
  const body = encode(JSON.stringify({ name, sessionVersion, exp: Date.now() + 1000 * 60 * 60 * 12 }));
  return `${body}.${sign(body)}`;
}

export function readParticipantSession(token: string): ParticipantSession | null {
  try {
    const [body, signature] = token.split(".");
    if (!body || !signature) return null;
    const expected = Buffer.from(sign(body));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const payload = JSON.parse(decode(body)) as { name?: unknown; sessionVersion?: unknown; exp?: unknown };
    if (typeof payload.name !== "string" || typeof payload.sessionVersion !== "number" || typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return { name: payload.name, sessionVersion: payload.sessionVersion };
  } catch {
    return null;
  }
}
