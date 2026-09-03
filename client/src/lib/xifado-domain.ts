export type Phase = "pre" | "ativo" | "encerrado";
export type MemberName = string;

export type MemberRecord = {
  eliminated: boolean;
  timestamp: number | null;
  reason: string;
  rank: string | null;
  duration: string | null;
  penaltyDone: boolean;
};

export type Schedule = { start: string; end: string };
export type PenaltyRecord = { id: string; text: string; visible: boolean; completedBy: Record<MemberName, boolean> };
export type RuleRecord = { id: string; text: string; visible: boolean };
export type Data = {
  schedule: Schedule;
  members: Record<MemberName, MemberRecord>;
  credentials: Record<MemberName, string>;
  globalPenalty: string;
  globalPenaltyComplete: boolean;
  penalties: PenaltyRecord[];
  rules: RuleRecord[];
};

export const STORAGE = "xifado-dashboard-v9";
export const BRAZIL_TIME_ZONE = "America/Sao_Paulo";
export const NAMES: MemberName[] = [
  "Expedito", "Ruan Carlos", "Ruan Araujo", "Victor", "Cadu", "Dudu",
  "Kauan", "Felipe", "Fabrício", "Luis", "Guilherme", "Rafael", "Matheus",
];

export const DEFAULT_SCHEDULE: Schedule = {
  start: "2026-08-31T23:59:00-03:00",
  end: "2026-09-30T23:59:00-03:00",
};

export const RANKS = [
  { min: 29, max: 30, label: "Monge", symbol: "∞", mark: "♾️" },
  { min: 27, max: 28, label: "Rei", symbol: "XIV", mark: "👑" },
  { min: 25, max: 26, label: "General", symbol: "XIII", mark: "⭐⭐⭐" },
  { min: 23, max: 24, label: "Coronel", symbol: "XII", mark: "⭐" },
  { min: 21, max: 22, label: "Major", symbol: "XI", mark: "🎖️🎖️🎖️" },
  { min: 19, max: 20, label: "Capitão", symbol: "X", mark: "🎖️🎖️" },
  { min: 17, max: 18, label: "Primeiro Tenente", symbol: "IX", mark: "🎖️" },
  { min: 15, max: 16, label: "Segundo Tenente", symbol: "VIII", mark: "🏅" },
  { min: 13, max: 14, label: "Asp. a Oficial", symbol: "VII", mark: "⚜️⚜️" },
  { min: 11, max: 12, label: "Subtenente", symbol: "VI", mark: "⚜️" },
  { min: 9, max: 10, label: "Primeiro Sargento", symbol: "V", mark: "🥇" },
  { min: 7, max: 8, label: "Segundo Sargento", symbol: "IV", mark: "🥈" },
  { min: 5, max: 6, label: "Terceiro Sargento", symbol: "III", mark: "🥉" },
  { min: 3, max: 4, label: "Cabo", symbol: "II", mark: "🎗️" },
  { min: 0, max: 2, label: "Soldado", symbol: "I", mark: "🪂" },
] as const;

export const emptyMember = (): MemberRecord => ({ eliminated: false, timestamp: null, reason: "", rank: null, duration: null, penaltyDone: false });
export const defaultRules: RuleRecord[] = [
  { id: "rule-start", text: "Antes do marco inicial, o placar permanece bloqueado e todos iniciam como sobreviventes.", visible: true },
  { id: "rule-register", text: "Cada baixa deve registrar data, hora e motivo com honestidade.", visible: true },
  { id: "rule-progress", text: "O progresso fica salvo neste navegador e não há reinício casual do ciclo.", visible: true },
  { id: "rule-end", text: "No fim do ciclo, o placar congela e os sobreviventes recebem a patente final.", visible: true },
];
export const defaultData = (): Data => ({
  schedule: DEFAULT_SCHEDULE,
  members: Object.fromEntries(NAMES.map((name) => [name, emptyMember()])) as Record<MemberName, MemberRecord>,
  credentials: {},
  globalPenalty: "",
  globalPenaltyComplete: false,
  penalties: [],
  rules: defaultRules,
});

export function loadData(): Data {
  try {
    const raw = window.localStorage.getItem(STORAGE);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw) as Partial<Data>;
    return {
      schedule: parsed.schedule?.start && parsed.schedule.end ? parsed.schedule : DEFAULT_SCHEDULE,
      members: Object.fromEntries(Object.keys(parsed.members ?? {}).length ? Object.keys(parsed.members as Record<string, unknown>).map((name) => [name, { ...emptyMember(), ...(parsed.members?.[name] ?? {}) }]) : NAMES.map((name) => [name, emptyMember()])) as Record<MemberName, MemberRecord>,
      credentials: {},
      globalPenalty: typeof parsed.globalPenalty === "string" ? parsed.globalPenalty : "",
      globalPenaltyComplete: Boolean(parsed.globalPenaltyComplete),
      penalties: Array.isArray(parsed.penalties) ? parsed.penalties.map((item) => ({ id: String(item.id ?? crypto.randomUUID()), text: String(item.text ?? ""), visible: item.visible !== false, completedBy: { ...Object.fromEntries(Object.keys(parsed.members ?? {}).map((name) => [name, false])), ...(item.completedBy ?? {}) } })).filter((item) => item.text.trim()) : (typeof parsed.globalPenalty === "string" && parsed.globalPenalty.trim() ? [{ id: "legacy-penalty", text: parsed.globalPenalty, visible: true, completedBy: Object.fromEntries(Object.keys(parsed.members ?? {}).map((name) => [name, Boolean(parsed.members?.[name]?.penaltyDone)])) }] : []),
      rules: Array.isArray(parsed.rules) ? parsed.rules.map((item) => ({ id: String(item.id ?? crypto.randomUUID()), text: String(item.text ?? ""), visible: item.visible !== false })).filter((item) => item.text.trim()) : defaultRules,
    };
  } catch {
    return defaultData();
  }
}

export const pad = (value: number) => String(value).padStart(2, "0");
export const duration = (milliseconds: number) => {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return days ? `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s` : hours ? `${hours}h ${pad(minutes)}m ${pad(seconds)}s` : `${minutes}m ${pad(seconds)}s`;
};
export const localParts = (iso: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: BRAZIL_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(iso));
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}:${values.second}` };
};
export const parseBrazilDateTime = (date: string, time: string) => new Date(`${date}T${time.length === 5 ? `${time}:00` : time}-03:00`);
export const formatDateTime = (timestamp: number | null) => timestamp ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium", timeZone: BRAZIL_TIME_ZONE }).format(new Date(timestamp)) : "—";
export const getPhase = (now: number, schedule: Schedule): Phase => {
  const start = Date.parse(schedule.start);
  const end = Date.parse(schedule.end);
  return now < start ? "pre" : now >= end ? "encerrado" : "ativo";
};
export const currentDay = (now: number, schedule: Schedule, phase: Phase) => {
  if (phase === "pre") return 0;
  if (phase === "encerrado") return 30;
  return Math.max(1, Math.min(30, Math.floor((now - Date.parse(schedule.start)) / 86400000) + 1));
};
export const rankFor = (day: number) => RANKS.find((rank) => day >= rank.min && day <= rank.max) ?? RANKS[RANKS.length - 1];
export const initials = (name: string) => { const parts = name.split(" "); return (parts.length > 1 ? `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}` : name.slice(0, 2)).toUpperCase(); };
