import { getSupabaseAdmin } from "./supabase";

export type CredentialRow = { name: string; password_hash: string };

export async function getCredentialHash(name: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("xifado_credentials")
    .select("password_hash")
    .eq("name", name)
    .maybeSingle();
  if (error) {
    if (error.code === "42P01" || /relation .* does not exist/i.test(error.message)) return null;
    throw new Error("Erro ao consultar a credencial. Código: XIFADO_CREDENTIAL_READ");
  }
  return typeof data?.password_hash === "string" ? data.password_hash : null;
}

export async function listCredentialHashes(): Promise<string[]> {
  const { data, error } = await getSupabaseAdmin().from("xifado_credentials").select("password_hash");
  if (error) {
    if (error.code === "42P01" || /relation .* does not exist/i.test(error.message)) return [];
    throw new Error("Erro ao listar credenciais. Código: XIFADO_CREDENTIAL_LIST");
  }
  return (data ?? []).map((row) => row.password_hash).filter((value): value is string => typeof value === "string");
}

export async function upsertCredentialHash(name: string, passwordHash: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("xifado_credentials").upsert({ name, password_hash: passwordHash }, { onConflict: "name" });
  if (error) throw new Error("Erro ao salvar a credencial. Código: XIFADO_CREDENTIAL_SAVE");
}

export async function deleteCredential(name: string): Promise<void> {
  const { error } = await getSupabaseAdmin().from("xifado_credentials").delete().eq("name", name);
  if (error && error.code !== "42P01" && !/relation .* does not exist/i.test(error.message)) {
    throw new Error("Erro ao remover a credencial. Código: XIFADO_CREDENTIAL_DELETE");
  }
}

/** Migra hashes antigos do payload para a tabela normalizada sem sobrescrever senhas já existentes. */
export async function migrateLegacyCredentialHashes(credentials: Record<string, string>): Promise<void> {
  const names = Object.keys(credentials);
  if (!names.length) return;
  const client = getSupabaseAdmin();
  const { data, error } = await client.from("xifado_credentials").select("name").in("name", names);
  if (error) {
    if (error.code === "42P01" || /relation .* does not exist/i.test(error.message)) return;
    throw new Error("Erro ao verificar credenciais legadas. Código: XIFADO_CREDENTIAL_MIGRATE");
  }
  const existing = new Set((data ?? []).map((row) => row.name));
  const missing = names.filter((name) => !existing.has(name)).map((name) => ({ name, password_hash: credentials[name] }));
  if (!missing.length) return;
  const result = await client.from("xifado_credentials").insert(missing);
  if (result.error) throw new Error("Erro ao migrar credenciais legadas. Código: XIFADO_CREDENTIAL_MIGRATE");
}
