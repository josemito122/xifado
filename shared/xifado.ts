export type MemberRecord = {
  eliminated: boolean;
  timestamp: number | null;
  reason: string;
  rank: string | null;
  duration: string | null;
  sessionVersion?: number;
  active?: boolean;
  removedAt?: string | null;
  removedBy?: string | null;
  lossHistory?: Array<{ occurredAt: number; recordedAt: string; reason: string; status: "LOSS_DECLARED" | "REVIVED" }>;
};

export type PenaltyRecord = {
  id: string;
  text: string;
  visible: boolean;
  completedBy: Record<string, boolean>;
};

export type RuleRecord = { id: string; text: string; visible: boolean };
export type Schedule = { start: string; end: string };

export type XifadoData = {
  /** Server-only optimistic concurrency version; omitted from public responses. */
  version?: number;
  schedule: Schedule;
  members: Record<string, MemberRecord>;
  credentials: Record<string, string>;
  penalties: PenaltyRecord[];
  rules: RuleRecord[];
};

export const DEFAULT_SCHEDULE: Schedule = {
  start: "2026-08-31T23:59:00-03:00",
  end: "2026-09-30T23:59:00-03:00",
};

/** Public roster only. Participant passwords are created and stored server-side. */
export const DEFAULT_MEMBER_NAMES = [
  "Expedito",
  "Ruan Carlos",
  "Ruan Araujo",
  "Victor",
  "Cadu",
  "Dudu",
  "Kauan",
  "Felipe",
  "Fabrício",
  "Luis",
  "Guilherme",
  "Rafael",
  "Matheus",
] as const;

export const DEFAULT_RULES: RuleRecord[] = [
  { id: "rule-start", text: "Antes do marco inicial, o placar permanece bloqueado e todos iniciam como sobreviventes.", visible: true },
  { id: "rule-register", text: "Cada baixa deve registrar data, hora e motivo com honestidade.", visible: true },
  { id: "rule-progress", text: "O progresso fica salvo no servidor e não há reinício casual do ciclo.", visible: true },
  { id: "rule-end", text: "No fim do ciclo, o placar congela e os sobreviventes recebem a patente final.", visible: true },
];

export const emptyMember = (): MemberRecord => ({ eliminated: false, timestamp: null, reason: "", rank: null, duration: null, sessionVersion: 1, active: true, removedAt: null, removedBy: null, lossHistory: [] });

export function defaultXifadoData(): XifadoData {
  return {
    version: 1,
    schedule: DEFAULT_SCHEDULE,
    members: Object.fromEntries(DEFAULT_MEMBER_NAMES.map((name) => [name, emptyMember()])),
    credentials: {},
    penalties: [],
    rules: DEFAULT_RULES.map((rule) => ({ ...rule })),
  };
}

export function publicXifadoData(data: XifadoData) {
  const { version: _version, credentials: _credentials, ...publicData } = data;
  return publicData;
}
