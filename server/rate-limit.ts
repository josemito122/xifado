import { supabaseAdmin } from "./supabase.js";

type Bucket = { count: number; resetAt: number };
const localBuckets = new Map<string, Bucket>();

export async function assertRateLimit(key: string, limit: number, windowMs: number): Promise<void> {
  const { data, error } = await supabaseAdmin.rpc("xifado_rate_limit_check", { p_key: key, p_limit: limit, p_window_seconds: Math.ceil(windowMs / 1000) });
  if (!error && data === false) throw new Error("RATE_LIMITED");
  if (!error) return;

  // Compatibilidade de implantação: até a migration existir, mantém uma barreira
  // local para não deixar o endpoint completamente sem proteção.
  const now = Date.now(); const current = localBuckets.get(key);
  if (!current || current.resetAt <= now) { localBuckets.set(key, { count: 1, resetAt: now + windowMs }); return; }
  if (current.count >= limit) throw new Error("RATE_LIMITED");
  current.count += 1;
}

export function requestKey(req: { ip?: string; socket?: { remoteAddress?: string } } | undefined): string {
  return req?.ip || req?.socket?.remoteAddress || "unknown";
}
