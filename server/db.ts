import { defaultXifadoData, type XifadoData } from "@shared/xifado";
import { hashParticipantPassword } from "./security";
import { supabaseAdmin } from "./supabase";
import { listCredentialHashes, migrateLegacyCredentialHashes, upsertCredentialHash } from "./credentials";

const STATE_ID = 1;

async function initialXifadoData(): Promise<XifadoData> {
  const initial = defaultXifadoData();
  const raw = process.env.XIFADO_INITIAL_CREDENTIALS;
  if (!raw) return initial;

  try {
    const credentials = JSON.parse(raw) as Record<string, unknown>;
    for (const [name, password] of Object.entries(credentials)) {
      if (typeof password !== "string" || password.length < 6) continue;
      initial.members[name] ??= {
        eliminated: false,
        timestamp: null,
        reason: "",
        rank: null,
        duration: null,
        sessionVersion: 1,
        active: true,
        removedAt: null,
        removedBy: null,
        lossHistory: [],
      };
      initial.credentials[name] = await hashParticipantPassword(password);
    }
  } catch (error) {
    console.warn("[Xifado] Ignoring invalid XIFADO_INITIAL_CREDENTIALS JSON", error);
  }

  return initial;
}

function isMissingVersionColumn(error: { code?: string; message?: string } | null | undefined): boolean {
  const message = error?.message ?? "";
  return error?.code === "42703" || (/version/i.test(message) && /(column|schema cache|does not exist|could not find)/i.test(message));
}

function parsePayload(payload: unknown): XifadoData {
  if (!payload || typeof payload !== "object") return defaultXifadoData();
  const value = payload as Partial<XifadoData>;
  const credentials: Record<string, string> = {};
  for (const [name, password] of Object.entries(value.credentials ?? {})) {
    if (typeof password === "string" && password.startsWith("scrypt$")) credentials[name] = password;
  }
  return {
    version: typeof value.version === "number" ? value.version : 1,
    schedule: value.schedule ?? defaultXifadoData().schedule,
    members: value.members ?? {},
    credentials,
    penalties: value.penalties ?? [],
    rules: value.rules ?? [],
  };
}

export async function getXifadoState(): Promise<XifadoData> {
  let { data, error } = await supabaseAdmin.from("xifado_state").select("payload, version").eq("id", STATE_ID).maybeSingle();
  if (isMissingVersionColumn(error)) {
    const legacy = await supabaseAdmin.from("xifado_state").select("payload").eq("id", STATE_ID).maybeSingle();
    data = legacy.data ? { ...legacy.data, version: 1 } : null;
    error = legacy.error;
  }
  if (error) throw new Error("Erro ao carregar o estado. Código: XIFADO_STATE_READ");
  if (!data) {
    const initial = await initialXifadoData();
    let { error: insertError } = await supabaseAdmin.from("xifado_state").insert({ id: STATE_ID, payload: initial, version: 1 });
    if (isMissingVersionColumn(insertError)) ({ error: insertError } = await supabaseAdmin.from("xifado_state").insert({ id: STATE_ID, payload: initial }));
    if (insertError && insertError.code !== "23505") throw new Error("Erro ao inicializar o estado. Código: XIFADO_STATE_INIT");
    await migrateLegacyCredentialHashes(initial.credentials);
    return initial;
  }
  const parsed = parsePayload({ ...(data.payload as Record<string, unknown>), version: typeof data.version === "number" ? data.version : 1 });
  await migrateLegacyCredentialHashes(parsed.credentials);
  const configured = await initialXifadoData();
  const configuredNames = Object.keys(configured.credentials);
  if (!Object.keys(parsed.credentials).length && configuredNames.length && !(await listCredentialHashes()).length) {
    const seeded = { ...parsed, members: { ...parsed.members, ...configured.members }, credentials: configured.credentials };
    for (const [name, passwordHash] of Object.entries(seeded.credentials)) await upsertCredentialHash(name, passwordHash);
    await saveXifadoState(seeded);
    return seeded;
  }
  return parsed;
}

export async function mutateXifadoState(mutator: (data: XifadoData) => Promise<XifadoData> | XifadoData): Promise<XifadoData> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await getXifadoState();
    const next = await mutator(structuredClone(current));
    try {
      return await saveXifadoState(next);
    } catch (error) {
      lastError = error;
      if (!(error instanceof Error) || !error.message.includes("alterado por outro usuário")) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Não foi possível concluir a alteração concorrente.");
}

export async function saveXifadoState(data: XifadoData): Promise<XifadoData> {
  const expectedVersion = typeof data.version === "number" ? data.version : 1;
  const nextVersion = expectedVersion + 1;
  const payload = { ...data, version: nextVersion };
  const result = await supabaseAdmin.from("xifado_state").update({ payload, updated_at: new Date().toISOString(), version: nextVersion }).eq("id", STATE_ID).eq("version", expectedVersion).select("id").maybeSingle();
  if (isMissingVersionColumn(result.error)) {
    const fallback = await supabaseAdmin.from("xifado_state").upsert({ id: STATE_ID, payload, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (fallback.error) throw new Error("Erro ao salvar o estado. Código: XIFADO_STATE_SAVE");
    return payload;
  }
  if (result.error) throw new Error("Erro ao salvar o estado. Código: XIFADO_STATE_SAVE");
  if (!result.data) throw new Error("O estado foi alterado por outro usuário. Recarregue e tente novamente.");
  return payload;
}
