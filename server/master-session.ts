import { createHmac, timingSafeEqual } from "node:crypto";

function getSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret) throw new Error("JWT_SECRET não configurado para sessões do mestre.");
  return secret;
}

const encode = (value: string) => Buffer.from(value, "utf8").toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");
const sign = (body: string) => createHmac("sha256", getSecret()).update(body).digest("base64url");

export function createMasterSession(): string {
  const body = encode(JSON.stringify({ role: "master", exp: Date.now() + 1000 * 60 * 60 * 12 }));
  return `${body}.${sign(body)}`;
}

export function readMasterSession(token: string): boolean {
  try {
    const [body, signature] = token.split(".");
    if (!body || !signature) return false;
    const expected = Buffer.from(sign(body));
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
    const payload = JSON.parse(decode(body)) as { role?: unknown; exp?: unknown };
    return payload.role === "master" && typeof payload.exp === "number" && payload.exp >= Date.now();
  } catch {
    return false;
  }
}
