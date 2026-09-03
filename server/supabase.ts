import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

function getSupabaseConfig(): { url: string; secretKey: string } {
  const url = process.env.SUPABASE_URL?.trim();
  const secretKey = (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

  if (!url || !/^https:\/\//i.test(url)) {
    throw new Error("SUPABASE_URL deve ser uma URL HTTPS válida.");
  }
  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY não está configurada no servidor.");
  }
  return { url, secretKey };
}

/**
 * Cliente exclusivamente server-side. Nunca importe este arquivo no frontend.
 * A inicialização é tardia para que a função Vercel possa responder em JSON
 * quando uma variável estiver ausente, em vez de falhar no carregamento do módulo.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const { url, secretKey } = getSupabaseConfig();
  cachedClient = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedClient;
}

/** Compatibilidade com os módulos existentes; o cliente só é criado quando usado. */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, property: string | symbol) {
    const client = getSupabaseAdmin() as unknown as Record<string | symbol, unknown>;
    const value = client[property];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
