/**
 * Design: Terminal de Sobrevivência — navy de baixa luz, Âmbar de Vigília e dados operacionais prioritários.
 */
import { useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  ArrowUp,
  Award,
  BadgeCheck,
  CalendarClock,
  Check,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Copy,
  Crown,
  Flag,
  LockKeyhole,
  Instagram,
  ShieldCheck,
  Skull,
  Swords,
  Trophy,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

type Tab = "comando" | "ranking" | "participante" | "penalidades" | "mestre" | "cemiterio" | "regras";
type Filter = "todos" | "vivos" | "baixas";
import {
  DEFAULT_SCHEDULE,
  BRAZIL_TIME_ZONE,
  Data,
  duration,
  emptyMember,
  formatDateTime,
  getPhase,
  initials,
  localParts,
  currentDay,
  defaultData,
  pad,
  rankFor,
  RANKS,
  MemberName,
  STORAGE,
  parseBrazilDateTime,
} from "@/lib/xifado-domain";

type Schedule = { start: string; end: string };
const ASSETS = {
  logo: "/xifado-logo-complementar.png",
};
const SURVIVOR_MESSAGES = [
  "Um segundo de cada vez. Mantenha o foco, respeite seus limites e continue avançando.",
  "A disciplina de hoje constrói a confiança que você levará para amanhã.",
  "Você não precisa vencer o mês inteiro agora; concentre-se no próximo minuto.",
  "Respire, reorganize sua atenção e siga firme no seu próprio ritmo.",
  "Cada intervalo vencido é uma prova de que sua decisão continua de pé.",
  "Seu progresso é feito de escolhas pequenas repetidas com constância.",
  "A força não é ausência de dificuldade; é continuar apesar dela.",
  "Você está escrevendo uma marca de disciplina que só você pode construir.",
  "Quando a vontade apertar, volte ao motivo pelo qual você começou.",
  "Seu cronômetro corre, mas sua atitude é o que define esta jornada.",
  "Não compare seu ritmo com o de ninguém. Proteja o seu próximo passo.",
  "Foco no presente: esta decisão também pode ser renovada agora.",
  "A resistência cresce quando você troca impulso por escolha consciente.",
  "Você já chegou até aqui. Reconheça o caminho e continue com calma.",
  "Disciplina também é pedir apoio, descansar e cuidar da própria mente.",
  "Um dia difícil não apaga sua capacidade de seguir em frente.",
  "Seu compromisso merece paciência, honestidade e respeito aos seus limites.",
  "A cada atualização do relógio, você confirma uma escolha feita por você.",
  "Não transforme um momento de pressão em uma decisão definitiva.",
  "A constância silenciosa também é uma grande vitória.",
  "Mantenha seus objetivos visíveis e sua próxima ação simples.",
  "Você está no comando da próxima escolha. Faça uma escolha que cuide de você.",
  "Persistência não precisa ser perfeita; precisa ser retomada com sinceridade.",
  "Sua jornada é individual, e cada avanço merece ser reconhecido.",
  "Continue firme, com responsabilidade, equilíbrio e atenção ao que você sente.",
] as const;
const ELIMINATED_MESSAGES = [
  "Sua participação foi registrada. Respire, aprenda com o momento e trate-se com respeito.",
  "Uma queda não resume quem você é nem apaga todo o caminho que percorreu.",
  "O registro terminou, mas a oportunidade de recomeçar continua disponível.",
  "Use esta experiência como informação, não como motivo para se punir.",
  "Você pode identificar o que aconteceu e voltar mais preparado no próximo ciclo.",
  "Perder uma etapa não significa perder sua capacidade de mudar.",
  "Seja honesto com sua história e gentil com o próximo passo.",
  "O cronômetro parou, mas seu aprendizado pode continuar avançando.",
  "Não transforme um resultado em uma sentença sobre o seu valor.",
  "Reconheça o que funcionou, observe o que falhou e construa uma nova estratégia.",
  "A disciplina também inclui recomeçar sem vergonha e sem exageros.",
  "Seu histórico é um ponto de partida para entender melhor suas escolhas.",
  "A próxima tentativa pode começar com uma mudança pequena e concreta.",
  "Você não está definido pelo momento em que perdeu, mas pelo que decide fazer depois.",
  "Permita-se aprender, ajustar o plano e cuidar de si com responsabilidade.",
  "O fim desta contagem não precisa ser o fim da sua evolução.",
  "Procure apoio de pessoas confiáveis se sentir que precisa conversar.",
  "Uma pausa consciente pode ajudar a transformar frustração em clareza.",
  "O resultado foi salvo; agora você pode salvar também uma lição para o futuro.",
  "Evite culpa exagerada. Foque em compreender o gatilho e preparar o próximo passo.",
  "Você continua merecendo respeito, inclusive quando o resultado não foi o esperado.",
  "Toda retomada começa quando você decide olhar para o ocorrido com honestidade.",
  "A queda é um evento do desafio, não a definição da sua identidade.",
  "Leve desta etapa uma informação útil e deixe para trás a autocrítica destrutiva.",
  "Quando estiver pronto, recomece com metas possíveis, apoio e cuidado.",
] as const;
const hues = [210, 232, 192, 168, 275, 8, 340, 42, 25, 176, 112, 288, 47];
const timeParts = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 }; };
const dateTime = formatDateTime;
const dateShort = (timestamp: number) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: BRAZIL_TIME_ZONE }).format(new Date(timestamp));
const liveClock = (timestamp: number) => new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", timeZone: BRAZIL_TIME_ZONE }).format(new Date(timestamp));
function Countdown({ label, ms, color }: { label: string; ms: number; color: "amber" | "blue" | "green" }) {
  const t = timeParts(ms);
  const textColor = color === "amber" ? "text-[#f4b942]" : color === "green" ? "text-[#65d6a0]" : "text-[#79b9e8]";
  const accent = color === "amber" ? "bg-[#f4b942]" : color === "green" ? "bg-[#65d6a0]" : "bg-[#79b9e8]";

  return (
    <article className="relative min-w-0 overflow-hidden rounded-lg border border-white/10 bg-[#0c1920]/90 p-3 shadow-[0_12px_24px_rgba(0,0,0,.16)] sm:p-4">
      <span className={`absolute left-3 right-3 top-0 h-[2px] sm:left-4 sm:right-4 ${accent}`} />
      <p className="mb-3 truncate font-['Barlow_Condensed'] text-[.68rem] font-bold tracking-[.15em] text-[#91a3a7] uppercase sm:mb-4 sm:text-xs">
        {label}
      </p>
      <div className="grid min-w-0 grid-cols-4 items-end gap-1 font-['Barlow_Condensed'] sm:flex sm:gap-1">
        <TimeUnit value={t.d} unit="D" />
        <i className="hidden pb-1 text-[#62767a] not-italic sm:block">:</i>
        <TimeUnit value={t.h} unit="H" />
        <i className="hidden pb-1 text-[#62767a] not-italic sm:block">:</i>
        <TimeUnit value={t.m} unit="M" />
        <i className="hidden pb-1 text-[#62767a] not-italic sm:block">:</i>
        <TimeUnit value={t.s} unit="S" />
      </div>
      <span className={`sr-only ${textColor}`}>{duration(ms)}</span>
    </article>
  );
}
function TimeUnit({ value, unit }: { value: number; unit: string }) {
  return (
    <span className="grid min-w-0 justify-items-center sm:justify-items-start">
      <b className="text-[clamp(1.55rem,5vw,2.25rem)] leading-[.8] font-bold tabular-nums text-[#f1f6f2]">
        {pad(value)}
      </b>
      <small className="mt-1 text-[.55rem] font-bold tracking-[.1em] text-[#62767a] sm:text-[.61rem]">{unit}</small>
    </span>
  );
}
function Heading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) { return <div className="mb-6"><p className="font-['Barlow_Condensed'] text-xs font-bold tracking-[.16em] text-[#f4b942] uppercase">{eyebrow}</p><h2 className="mt-1 font-['Barlow_Condensed'] text-4xl leading-none font-bold tracking-[-.025em] text-[#eef4f1] uppercase md:text-5xl">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#91a3a7]">{text}</p></div>; }
function Empty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-white/20 bg-black/10 px-6 text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-[#65d6a0]/25 bg-[#65d6a0]/10 text-[#65d6a0]">{icon}</span><h3 className="mt-3 font-['Barlow_Condensed'] text-xl font-bold uppercase">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm text-[#91a3a7]">{text}</p></div></div>; }

export default function XifadoDashboard() {
  const stored = useMemo(() => defaultData(), []);
  const stateQuery = trpc.xifado.state.useQuery(undefined, { refetchInterval: 2000, refetchOnWindowFocus: true });
  const participantLoginMutation = trpc.xifado.participantLogin.useMutation();
  const loginMutation = trpc.xifado.login.useMutation();
  const participantLogoutMutation = trpc.xifado.participantLogout.useMutation();
  const masterLogoutMutation = trpc.xifado.master.logout.useMutation();
  const declareLossSessionMutation = trpc.xifado.declareLossSession.useMutation();
  const reviveMutation = trpc.xifado.master.revive.useMutation();
  const replaceStateMutation = trpc.xifado.master.replaceState.useMutation();
  const addMemberMutation = trpc.xifado.master.addMember.useMutation();
  const removeMemberMutation = trpc.xifado.master.removeMember.useMutation();
  const verifyMasterMutation = trpc.xifado.master.verify.useMutation();
  const [data, setData] = useState<Data>(stored);
  const [now, setNow] = useState(Date.now());
  const [tab, setTab] = useState<Tab>("comando");
  const [filter, setFilter] = useState<Filter>("todos");
  const [memberModal, setMemberModal] = useState<MemberName | null>(null);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [memberError, setMemberError] = useState("");
  const [masterOpen, setMasterOpen] = useState(false);
  const [masterSessionCode, setMasterSessionCode] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [participantName, setParticipantName] = useState<MemberName | null>(null);
  const [participantLoginName, setParticipantLoginName] = useState("");
  const [participantPassword, setParticipantPassword] = useState("");
  const [participantError, setParticipantError] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [memberManagementError, setMemberManagementError] = useState("");
  const [newPenaltyText, setNewPenaltyText] = useState("");
  const [newRuleText, setNewRuleText] = useState("");
  const [contentManagementError, setContentManagementError] = useState("");
  const [participantMessageIndex, setParticipantMessageIndex] = useState(0);
  const [participantLossOpen, setParticipantLossOpen] = useState(false);
  const [participantLossDateTime, setParticipantLossDateTime] = useState("");
  const [participantLossReason, setParticipantLossReason] = useState("");
  const [participantLossError, setParticipantLossError] = useState("");
  const firstStart = localParts(stored.schedule.start), firstEnd = localParts(stored.schedule.end);
  const [scheduleForm, setScheduleForm] = useState({ startDate: firstStart.date, startTime: firstStart.time, endDate: firstEnd.date, endTime: firstEnd.time });

  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  useEffect(() => { if (stateQuery.data) setData((previous) => ({ ...previous, ...stateQuery.data, credentials: previous.credentials } as Data)); }, [stateQuery.data]);
  const save = (next: Data) => {
    setData(next);
    if (masterSessionCode) {
      replaceStateMutation.mutate({ state: { schedule: next.schedule, members: next.members, penalties: next.penalties, rules: next.rules } }, { onError: (error) => { stateQuery.refetch(); toast.error("Alteração concorrente detectada", { description: error.message }); } });
    }
  };
  const start = +new Date(data.schedule.start), end = +new Date(data.schedule.end), phase = getPhase(now, data.schedule);
  const day = currentDay(now, data.schedule, phase);
  const memberNames = Object.keys(data.members).filter((name) => data.members[name].active !== false) as MemberName[];
  const rank = rankFor(day), alive = memberNames.filter((name) => !data.members[name].eliminated), dead = memberNames.filter((name) => data.members[name].eliminated), retention = Math.round(alive.length / memberNames.length * 100);
  const visiblePenalties = data.penalties.filter((penalty) => penalty.visible);
  const penaltyDone = visiblePenalties.reduce((total, penalty) => total + memberNames.filter((name) => penalty.completedBy[name]).length, 0);
  const penaltyPending = visiblePenalties.length * memberNames.length - penaltyDone;
  const participantRecord = participantName ? data.members[participantName] : null;
  const participantElapsed = participantRecord ? (participantRecord.eliminated && participantRecord.timestamp ? participantRecord.timestamp - start : phase === "pre" ? 0 : Math.max(0, (phase === "encerrado" ? end : now) - start)) : 0;
  const participantMessagePool = participantRecord?.eliminated ? ELIMINATED_MESSAGES : SURVIVOR_MESSAGES;
  const participantMessage = participantMessagePool[participantMessageIndex % participantMessagePool.length];
  useEffect(() => { setParticipantMessageIndex(0); const id = window.setInterval(() => setParticipantMessageIndex((index) => index + 1), 5000); return () => window.clearInterval(id); }, [participantName, participantRecord?.eliminated, phase]);
  const active = memberModal ? data.members[memberModal] : null;
  const visible = [...memberNames].sort((a, b) => +data.members[a].eliminated - +data.members[b].eliminated).filter((name) => filter === "todos" || filter === "vivos" ? filter === "todos" || !data.members[name].eliminated : data.members[name].eliminated);
  const rankings = useMemo(() => memberNames.map((name) => { const member = data.members[name]; const stop = member.eliminated && member.timestamp ? member.timestamp : phase === "encerrado" ? end : phase === "pre" ? start : now; return { name, member, ms: Math.max(0, stop - start) }; }).sort((a,b) => b.ms - a.ms), [data, end, now, phase, start]);
  const participantRanking = participantName ? rankings.findIndex((entry) => entry.name === participantName) + 1 : 0;
  const fastest = useMemo(() => dead.map((name) => ({ name, member: data.members[name] })).sort((a,b) => (a.member.timestamp ?? 0) - (b.member.timestamp ?? 0)), [data, dead]);
  const critical = useMemo(() => { if (!dead.length) return "Nenhum"; const counts = new Map<string, number>(); dead.forEach((name) => { const t = data.members[name].timestamp; if (t) counts.set(dateShort(t), (counts.get(dateShort(t)) ?? 0) + 1); }); return Array.from(counts.entries()).sort((a,b) => b[1] - a[1])[0]?.[0] ?? "—"; }, [data, dead]);
  const average = dead.length ? duration(dead.reduce((total, name) => total + Math.max(0, (data.members[name].timestamp ?? start) - start), 0) / dead.length) : "—";

  const phaseCopy = { pre: ["Operação programada", "Aguardando a abertura", "O período de NoFap ainda não começou. O cronômetro oficial inicia em 31/08/2026 às 23:59."], ativo: ["Período de NoFap iniciado", "O cronômetro está valendo", "Cada participante acumula seu próprio tempo desde 31/08/2026 às 23:59 até sobreviver ou ser eliminado."], encerrado: ["Operação concluída", "Placar final congelado", "O período terminou em 30/09/2026 às 23:59. Cada sobrevivente recebe sua patente final e o tempo total de resistência."] }[phase];
  const dayEnd = (() => { const d = new Date(now); return +new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0); })();
  const weekEnd = (() => { const d = new Date(now); return +new Date(d.getFullYear(), d.getMonth(), d.getDate() + ((7 - d.getDay()) % 7), 23, 59, 59); })();

  function openMember(name: MemberName) { if (phase !== "ativo") { toast.message(phase === "pre" ? "Operação bloqueada" : "Placar final congelado", { description: phase === "pre" ? "As baixas só podem ser registradas após o horário de abertura." : "O desafio foi concluído e não aceita novas alterações." }); return; } setMemberModal(name); setPassword(""); setReason(""); setMemberError(""); }
  function confirmMember() {
    if (!memberModal || !active) return;
    if (active.eliminated) {
      reviveMutation.mutate({ name: memberModal }, { onSuccess: () => { toast.success(`${memberModal} reativado pelo mestre.`); setMemberModal(null); stateQuery.refetch(); }, onError: (error) => setMemberError(error.message) });
      return;
    }
    toast.error("Use a aba do participante para registrar a própria baixa.");
  }
  function openSchedule() { if (!masterOpen) { setTab("participante"); toast.message("Acesso necessário", { description: "Faça login para continuar." }); return; } const s = localParts(data.schedule.start), e = localParts(data.schedule.end); setScheduleForm({ startDate:s.date, startTime:s.time, endDate:e.date, endTime:e.time }); setScheduleOpen(true); }
  function setGlobalPenalty(text: string) { const members = Object.fromEntries(memberNames.map((name) => [name, { ...data.members[name], penaltyDone: false }])) as Data["members"]; save({ ...data, globalPenalty: text, globalPenaltyComplete: false, members }); }
  function saveSchedule() { if (!masterOpen) { setScheduleOpen(false); toast.error("Acesso mestre expirado"); return; } const s = +parseBrazilDateTime(scheduleForm.startDate, scheduleForm.startTime), e = +parseBrazilDateTime(scheduleForm.endDate, scheduleForm.endTime); if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) { toast.error("Agenda inválida", { description:"O encerramento precisa ser posterior ao início." }); return; } save({ ...data, schedule:{ start:new Date(s).toISOString(), end:new Date(e).toISOString() } }); setScheduleOpen(false); toast.success("Ciclo agendado", { description:"Cronômetros recalculados." }); }
  function addMember() {
    if (!masterOpen || !masterSessionCode) return;
    const name = newMemberName.trim().replace(/\s+/g, " ");
    const code = newMemberPassword.trim().toUpperCase();
    if (name.length < 2) { setMemberManagementError("Informe um nome válido para o novo participante."); return; }
    if (!/^[A-Z0-9]{4,12}$/.test(code)) { setMemberManagementError("A senha deve ter de 4 a 12 letras ou números."); return; }
    addMemberMutation.mutate({ name, password: code }, { onSuccess: () => { setNewMemberName(""); setNewMemberPassword(""); setMemberManagementError(""); toast.success(`${name} foi adicionado ao pelotão.`); stateQuery.refetch(); }, onError: (error) => setMemberManagementError(error.message) });
  }
  function removeMember(name: MemberName) {
    if (!masterOpen || !masterSessionCode) return;
    if (memberNames.length <= 1) { toast.error("O pelotão precisa ter pelo menos um participante."); return; }
    if (!window.confirm(`Remover ${name}? O histórico, ranking e senha desse participante será excluído do desafio.`)) return;
    removeMemberMutation.mutate({ name }, { onSuccess: () => { if (participantName === name) { setParticipantName(null); setParticipantPassword(""); } toast.success(`${name} foi removido do pelotão.`); stateQuery.refetch(); }, onError: (error) => toast.error(error.message) });
  }
  function openParticipantLoss() {
    if (!participantName || !participantRecord || participantRecord.eliminated) return;
    if (phase !== "ativo") { toast.message(phase === "pre" ? "O ciclo ainda não começou" : "O desafio já foi encerrado", { description: phase === "pre" ? "A declaração de perda fica disponível após a abertura oficial." : "O placar final está congelado." }); return; }
    const parts = localParts(new Date(now).toISOString());
    setParticipantLossDateTime(`${parts.date}T${parts.time.slice(0, 5)}`);
    setParticipantLossReason("");
    setParticipantLossError("");
    setParticipantLossOpen(true);
  }
  function confirmParticipantLoss(useNow = false) {
    if (!participantName || !participantRecord || participantRecord.eliminated) return;
    if (phase !== "ativo") { setParticipantLossError("A declaração só pode ser feita durante o período ativo."); return; }
    let timestamp = now;
    if (!useNow) {
      const [date, time] = participantLossDateTime.split("T");
      if (!date || !time) { setParticipantLossError("Informe a data e o horário da perda."); return; }
      timestamp = +parseBrazilDateTime(date, time);
    }
    if (!Number.isFinite(timestamp) || timestamp < start || timestamp > now + 1000) { setParticipantLossError("O horário precisa estar entre a abertura do ciclo e o momento atual, no horário de Brasília."); return; }
    if (!window.confirm(`Confirmar eliminação de ${participantName} em ${dateTime(timestamp)}? Essa ação registra sua baixa no ranking.`)) return;
    const lossDay = Math.max(1, Math.min(30, Math.floor((timestamp - start) / 86400000) + 1));
    declareLossSessionMutation.mutate({ timestamp, reason: participantLossReason.trim() }, { onSuccess: () => stateQuery.refetch(), onError: (error) => { setParticipantLossError(error.message); return; } });
    setParticipantLossOpen(false);
    setParticipantLossError("");
    toast.success("Sua eliminação foi registrada.", { description: `Horário: ${dateTime(timestamp)} · Resistência: ${duration(timestamp - start)}.` });
  }
  function addPenalty() {
    if (!masterOpen) return;
    const text = newPenaltyText.trim();
    if (text.length < 3) { setContentManagementError("Digite uma prenda com pelo menos 3 caracteres."); return; }
    const completedBy = Object.fromEntries(memberNames.map((name) => [name, false]));
    const item = { id: `penalty-${Date.now()}`, text, visible: true, completedBy };
    save({ ...data, penalties: [...data.penalties, item] });
    setNewPenaltyText(""); setContentManagementError("");
    toast.success("Prenda adicionada para o pelotão.");
  }
  function editPenalty(id: string, current: string) {
    if (!masterOpen) return;
    const text = window.prompt("Editar prenda", current)?.trim();
    if (!text || text === current) return;
    save({ ...data, penalties: data.penalties.map((item) => item.id === id ? { ...item, text } : item) });
    toast.success("Prenda atualizada.");
  }
  function togglePenalty(id: string) {
    if (!masterOpen) return;
    save({ ...data, penalties: data.penalties.map((item) => item.id === id ? { ...item, visible: !item.visible } : item) });
  }
  function removePenalty(id: string) {
    if (!masterOpen) return;
    if (!window.confirm("Remover esta prenda? O acompanhamento dela também será removido.")) return;
    save({ ...data, penalties: data.penalties.filter((item) => item.id !== id) });
    toast.success("Prenda removida.");
  }
  function togglePenaltyCompletion(id: string, name: MemberName) {
    if (!masterOpen) return;
    save({ ...data, penalties: data.penalties.map((item) => item.id === id ? { ...item, completedBy: { ...item.completedBy, [name]: !item.completedBy[name] } } : item) });
  }
  function addRule() {
    if (!masterOpen) return;
    const text = newRuleText.trim();
    if (text.length < 3) { setContentManagementError("Digite uma regra com pelo menos 3 caracteres."); return; }
    save({ ...data, rules: [...data.rules, { id: `rule-${Date.now()}`, text, visible: true }] });
    setNewRuleText(""); setContentManagementError("");
    toast.success("Regra adicionada.");
  }
  function editRule(id: string, current: string) {
    if (!masterOpen) return;
    const text = window.prompt("Editar regra", current)?.trim();
    if (!text || text === current) return;
    save({ ...data, rules: data.rules.map((item) => item.id === id ? { ...item, text } : item) });
    toast.success("Regra atualizada.");
  }
  function toggleRule(id: string) {
    if (!masterOpen) return;
    save({ ...data, rules: data.rules.map((item) => item.id === id ? { ...item, visible: !item.visible } : item) });
  }
  function removeRule(id: string) {
    if (!masterOpen) return;
    if (!window.confirm("Remover esta regra? Ela deixará de aparecer para o pelotão.")) return;
    save({ ...data, rules: data.rules.filter((item) => item.id !== id) });
    toast.success("Regra removida.");
  }
  function scrollToTop() { window.scrollTo({ top: 0, behavior: "smooth" }); }
  function unlockParticipant() {
    const name = participantLoginName.trim();
    const submitted = participantPassword;
    if (!name) { setParticipantError("Digite seu nome."); return; }
    if (!submitted) { setParticipantError("Digite sua senha."); return; }

    // Um único formulário público decide o destino pelo nome informado:
    // "mestre" -> área mestre; qualquer outro nome -> área do participante.
    loginMutation.mutate({ name, password: submitted }, {
      onSuccess: (result) => {
        setParticipantPassword("");
        setParticipantLoginName("");
        setParticipantError("");
        if (result.role === "master") {
          setMasterOpen(true);
          setMasterSessionCode("cookie");
          setParticipantName(null);
          setTab("mestre");
          toast.success("Login realizado.");
          return;
        }
        setParticipantName(result.name as MemberName);
        setMasterOpen(false);
        setMasterSessionCode("");
        setTab("participante");
        toast.success(`Aba de ${result.name} liberada.`);
      },
      onError: (error) => setParticipantError(error.message),
    });
  }
  async function copyReport() { const status = phase === "pre" ? `PRÉ-DESAFIO · abertura em ${duration(start-now)}` : phase === "ativo" ? `EM COMBATE · Dia ${pad(day)}` : "DESAFIO CONCLUÍDO"; const report = ["*XIFADO — RELATÓRIO TÁTICO*", `Status: ${status}`, `Ciclo: ${dateTime(start)} → ${dateTime(end)}`, `Sobreviventes: ${alive.length}/${memberNames.length} (${retention}%)`, `Prendas: ${visiblePenalties.length ? visiblePenalties.map((penalty) => penalty.text).join(" | ") : "Nenhuma publicada"}`, "", `⚔️ *EM COMBATE (${alive.length})*`, alive.map((name) => `• ${name} — ${phase === "encerrado" ? "Monge ♾️ (Campeão)" : `${rank.label} · Dia ${day}`}`).join("\n") || "• Pelotão sem sobreviventes.", "", "💀 *BAIXAS*", dead.map((name) => { const m = data.members[name]; return `• ${name}: ${dateTime(m.timestamp)} · Resistiu ${m.duration}${m.reason ? ` · ${m.reason}` : ""}`; }).join("\n") || "• Nenhuma baixa registrada.", "", "Disciplina em registro. #XifadoSetembro"].join("\n"); try { await navigator.clipboard.writeText(report); toast.success("Relatório copiado", { description:"Pronto para colar no WhatsApp." }); } catch { toast.error("Não foi possível copiar automaticamente."); } }

  return <div className="xifado-root min-h-screen bg-[#071017] text-[#eef4f1] selection:bg-[#f4b942]/30"><div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 opacity-30 [background-image:linear-gradient(rgba(177,212,209,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(177,212,209,.03)_1px,transparent_1px)] [background-size:46px_46px]" /><div className="relative z-10 mx-auto grid min-h-screen max-w-[1520px] lg:grid-cols-[270px_minmax(0,1fr)]">
    <aside className="border-b border-white/10 bg-[#050d12]/90 px-3 py-4 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0 lg:px-5 lg:py-8">
      <div className="flex items-center gap-3 px-1"><img src={ASSETS.logo} alt="Símbolo Xifado" className="h-12 w-12 object-contain drop-shadow-[0_7px_16px_rgba(244,185,66,.18)]" /><div><p className="font-['Barlow_Condensed'] text-[.66rem] font-bold tracking-[.16em] text-[#f4b942] uppercase">Centro de Comando</p><h1 className="mt-1 font-['Barlow_Condensed'] text-3xl leading-none font-bold tracking-[.1em]">XIFADO</h1></div></div>
      <div className="my-5 hidden items-center gap-2 border-y border-white/10 px-2 py-2 font-['Barlow_Condensed'] text-xs font-bold tracking-[.12em] text-[#91a3a7] sm:flex lg:my-8"><span className={`h-2 w-2 rounded-full ${phase === "ativo" ? "bg-[#65d6a0] shadow-[0_0_12px_rgba(101,214,160,.7)]" : phase === "encerrado" ? "bg-[#f4b942]" : "bg-[#79b9e8]"}`} />{phase === "ativo" ? "SINAL AO VIVO" : phase === "encerrado" ? "ARQUIVO FINAL" : "SISTEMA AGENDADO"}</div>
      <nav aria-label="Navegação do painel"><div className="rounded-lg border border-white/10 bg-white/[.02] p-2 sm:hidden"><label className="grid gap-1 font-['Barlow_Condensed'] text-xs font-bold tracking-[.1em] text-[#91a3a7] uppercase" htmlFor="mobile-section">Abrir seção<select id="mobile-section" value={tab} onChange={(e) => setTab(e.target.value as Tab)} className="h-11 w-full rounded-md border border-[#f4b942]/35 bg-[#081218] px-3 text-sm font-semibold normal-case tracking-normal text-white outline-none focus:border-[#f4b942]">{([{id:"comando",label:"Comando"},{id:"ranking",label:"Hall da Fama"},{id:"participante",label:"Aba participante"},{id:"penalidades",label:"Prendas"},{id:"cemiterio",label:"Cemitério"},{id:"regras",label:"Regras"}] as const).map(({id,label}) => <option key={id} value={id}>{label}</option>)}</select></label></div><div className="hidden grid-cols-2 gap-2 sm:grid md:grid-cols-3 lg:grid-cols-1 lg:gap-1">{([{id:"comando",label:"Comando",icon:ShieldCheck},{id:"ranking",label:"Hall da Fama",icon:Trophy},{id:"participante",label:"Participante",icon:UsersRound},{id:"penalidades",label:"Prenda coletiva",icon:LockKeyhole},{id:"cemiterio",label:"Cemitério",icon:Skull},{id:"regras",label:"Regras",icon:ClipboardCheck}] as const).map(({id,label,icon:Icon}) => <button key={id} onClick={() => setTab(id)} aria-current={tab===id ? "page" : undefined} title={label} className={`flex min-h-11 min-w-0 w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs font-semibold leading-tight transition duration-150 active:scale-[.98] sm:px-3 sm:text-sm ${tab===id ? "border-[#f4b942]/45 bg-gradient-to-r from-[#f4b942]/20 to-transparent text-white shadow-[inset_3px_0_0_#f4b942]" : "border-white/10 text-[#b8c7c5] hover:bg-white/[.05] hover:text-white"}`}><Icon className="h-4 w-4 shrink-0" /><span className="min-w-0 break-words">{label}</span>{tab===id && <ChevronRight className="ml-auto hidden h-4 w-4 shrink-0 text-[#f4b942] lg:block" />}</button>)}</div></nav>
      <div className="relative mt-5 min-h-44 overflow-hidden rounded-lg border border-white/10 bg-[#091116] lg:mt-auto"><div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,rgba(244,185,66,.22),transparent_36%),linear-gradient(135deg,#091116_25%,#102731_50%,#071017_80%)] opacity-80" /><div className="relative z-10 flex h-full min-h-44 flex-col justify-end gap-2 p-3"><p className="font-['Barlow_Condensed'] text-[.65rem] font-bold tracking-[.14em] text-[#f4b942] uppercase">Ordem do dia</p><strong className="break-words font-['Barlow_Condensed'] text-2xl leading-none font-bold tabular-nums text-white sm:text-3xl">{liveClock(now)}</strong><p className="break-words text-xs text-[#b8c7c5]">Horário oficial de Brasília</p><span className="inline-flex w-fit items-center gap-1 rounded border border-[#65d6a0]/25 bg-[#65d6a0]/10 px-2 py-1 font-['Barlow_Condensed'] text-[.62rem] font-bold tracking-[.12em] text-[#65d6a0]"><span className="h-1.5 w-1.5 rounded-full bg-[#65d6a0] shadow-[0_0_8px_rgba(101,214,160,.8)]" />AO VIVO</span></div><div className="absolute inset-0 bg-gradient-to-t from-[#040a0d] via-transparent to-transparent" /></div>
    </aside>
    <main className="min-w-0 px-3 py-4 sm:px-5 lg:px-12 lg:py-8"><header className="relative isolate overflow-hidden rounded-xl border border-white/10 bg-[#0a171c] p-4 shadow-[0_18px_50px_rgba(0,0,0,.22)] sm:p-6 lg:p-8">
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_80%_20%,rgba(121,185,232,.22),transparent_28%),linear-gradient(120deg,#061014,#0d242c_55%,#122f38)] opacity-80" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#061014] via-[#061014]/90 to-[#061014]/20" />
        <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="min-w-0 flex-1 pt-12 sm:pt-10 lg:pt-0">
            <p className="font-['Barlow_Condensed'] text-xs font-bold tracking-[.16em] text-[#f4b942] uppercase">{phaseCopy[0]}</p>
            <h2 className="mt-2 max-w-3xl break-words font-['Barlow_Condensed'] text-[clamp(2.5rem,7vw,4.5rem)] leading-[.88] font-bold tracking-[-.02em] uppercase">{phaseCopy[1]}</h2>
            <p className="mt-3 max-w-2xl break-words text-sm leading-relaxed text-[#b8c7c5] sm:text-base">{phaseCopy[2]}</p>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2 self-end lg:self-start">
            
            <button onClick={openSchedule} aria-label="Agendar ciclo" title="Agendar ciclo" className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-white/20 bg-[#050f13]/70 text-white transition hover:border-[#f4b942] hover:bg-[#f4b942]/10"><CalendarClock className="h-4 w-4" /></button>
            <button onClick={copyReport} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-[#f4b942]/35 bg-[#050f13]/70 px-3 text-xs font-bold text-[#f4b942] transition hover:border-[#f4b942] hover:bg-[#f4b942]/10"><Copy className="h-4 w-4" /><span className="hidden sm:inline">Copiar relatório</span></button>
          </div>
        </div>
      </header>

      {tab === "comando" && <section className="pt-5"><div className="grid gap-3">{phase === "pre" && <PhaseBanner icon={<AlarmClock />} title={`Abertura oficial em ${duration(start-now)}`} text="Baixas e reativações ficam bloqueadas até o início do ciclo." action="Acesso mestre" onClick={() => setMasterOpen(true)} />}{phase === "encerrado" && <PhaseBanner icon={<Crown />} title="Desafio concluído. O placar foi selado." text={`${alive.length} sobrevivente(s) receberam a patente Monge.`} action="Ver Hall da Fama" onClick={() => setTab("ranking")} />}</div><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3"><Countdown label={phase === "pre" ? "Abertura oficial" : "Fim do dia"} ms={phase === "pre" ? start-now : phase === "encerrado" ? 0 : dayEnd-now} color="amber" /><Countdown label="Fim da semana" ms={phase === "encerrado" ? 0 : weekEnd-now} color="blue" /><Countdown label="Fim do desafio" ms={phase === "encerrado" ? 0 : end-now} color="green" /></div>
      <section className="relative mt-3 isolate grid min-h-44 overflow-hidden rounded-xl border border-white/10 bg-[#0b1820] p-5 sm:grid-cols-[1fr_.8fr] sm:p-6"><div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_45%,rgba(101,214,160,.2),transparent_27%),linear-gradient(135deg,#09161b,#0e2830_55%,#102d2c)] opacity-80" /><div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#09161b] via-[#09161b]/90 to-[#09161b]/25" /><div><p className="font-['Barlow_Condensed'] text-xs font-bold tracking-[.16em] text-[#f4b942] uppercase">Integridade do pelotão</p><div className="mt-2 flex items-baseline gap-1 font-['Barlow_Condensed']"><strong className="text-6xl leading-none text-[#65d6a0]">{pad(alive.length)}</strong><span className="text-2xl text-[#e1ebe6]">/ {pad(memberNames.length)}</span><em className="ml-2 text-xs font-bold tracking-[.14em] text-[#65d6a0] not-italic">VIVOS</em></div><p className="mt-2 text-sm text-[#91a3a7]">{retention}% de retenção. {dead.length ? `${dead.length} baixa(s) em arquivo.` : "Nenhuma baixa registrada."}</p></div><div className="self-end"><div className="mb-2 flex justify-between gap-3 text-xs"><span className="inline-flex items-center gap-1 text-[#65d6a0]"><Swords className="h-3 w-3" /> {alive.length} em combate</span><span className="inline-flex items-center gap-1 text-[#ff756e]"><Skull className="h-3 w-3" /> {dead.length} eliminados</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-gradient-to-r from-[#65d6a0] to-[#a0e6ba] shadow-[0_0_15px_rgba(101,214,160,.5)] transition-[width] duration-300" style={{width:`${retention}%`}} /></div></div></section>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-['Barlow_Condensed'] text-xs font-bold tracking-[.16em] text-[#f4b942] uppercase">Pelotão principal</p><h3 className="mt-1 font-['Barlow_Condensed'] text-3xl leading-none font-bold uppercase">Registro de sobrevivência</h3></div><div className="flex w-full gap-1 rounded-lg border border-white/10 bg-[#091419]/70 p-1 sm:w-auto">{(["todos","vivos","baixas"] as Filter[]).map((item) => <button key={item} onClick={() => setFilter(item)} className={`flex-1 rounded px-3 py-1.5 font-['Barlow_Condensed'] text-xs font-bold tracking-wide capitalize transition sm:flex-none ${filter===item ? "bg-[#142631] text-white" : "text-[#62767a] hover:text-[#91a3a7]"}`}>{item} {item === "todos" ? memberNames.length : item === "vivos" ? alive.length : dead.length}</button>)}</div></div><div className="mt-3 grid gap-2 lg:grid-cols-2">{visible.map((name,index) => { const member=data.members[name], down=member.eliminated; const memberRank=down ? member.rank : phase === "encerrado" ? "Monge · Campeão" : `${rank.label} · Nível ${rank.symbol}`; const detail=down ? `Caiu em ${dateTime(member.timestamp)}` : phase === "pre" ? "Aguardando início oficial" : phase === "encerrado" ? `Sobreviveu ${duration(end - start)}` : `Em resistência há ${duration(now-start)}`; return <article key={name} className={`flex min-h-28 items-center gap-3 rounded-lg border p-3 transition hover:-translate-y-0.5 ${down ? "border-[#ff756e]/20 bg-[#0c1920]/60 opacity-60 hover:opacity-90" : "border-white/10 bg-[#0c1920]/85 hover:border-[#b9d0d1]/25 hover:bg-[#10212a]"}`}><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-[hsl(var(--hue)_50%_28%)] font-['Barlow_Condensed'] text-sm font-bold" style={{"--hue":hues[index % hues.length]} as React.CSSProperties}>{initials(name)}</div><div className="min-w-0 flex-1"><h4 className={`break-words text-sm font-bold ${down ? "text-[#a3b3b3] line-through" : ""}`}>{name}</h4><p className="mt-1 flex items-center gap-1 break-words font-['Barlow_Condensed'] text-xs font-semibold tracking-wide text-[#79b9e8]"><Award className="h-3 w-3" />{memberRank}</p><p className={`mt-1 break-words text-[.68rem] ${down ? "text-[#d18a87]" : "text-[#91a3a7]"}`}>{detail}</p></div><div className="flex self-stretch flex-col items-end justify-between"><span className={`inline-flex items-center gap-1 font-['Barlow_Condensed'] text-[.64rem] font-bold tracking-[.08em] ${down ? "text-[#ff756e]" : "text-[#65d6a0]"}`}><span className={`h-1.5 w-1.5 rounded-full ${down ? "bg-[#ff756e]" : "bg-[#65d6a0] shadow-[0_0_9px_rgba(101,214,160,.8)]"}`} />{down ? "CAIU" : phase === "encerrado" ? "CAMPEÃO" : "VIVO"}</span><button disabled={phase!=="ativo"} onClick={() => openMember(name)} aria-label={down ? `Reativar ${name}` : `Registrar baixa de ${name}`} className="grid h-8 w-8 place-items-center rounded border border-white/15 bg-white/[.02] text-[#91a3a7] transition enabled:hover:border-[#ff756e]/60 enabled:hover:bg-[#ff756e]/10 enabled:hover:text-[#ff756e] disabled:cursor-not-allowed disabled:opacity-30"><Skull className="h-4 w-4" /></button></div></article>; })}</div>{!visible.length && <div className="mt-3"><Empty icon={<UsersRound className="h-5 w-5" />} title="Nenhum integrante neste filtro" text="Altere o filtro para voltar ao registro completo." /></div>}</section>}

      {tab === "ranking" && <section className="pt-6"><Heading eyebrow="Classificação" title="Hall da Fama & Rankings" text="A resistência é medida do início oficial até o instante preciso de cada baixa." /><div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3"><Stat icon={<Trophy />} label="Maior resistência" value={rankings[0]?.name ?? "—"} sub={rankings[0] ? duration(rankings[0].ms) : "Sem dados"} color="blue" /><Stat icon={<Crown />} label="Campeões" value={phase === "encerrado" ? String(alive.length) : "—"} sub={phase === "encerrado" ? "Sobreviventes condecorados" : "Ao fim do ciclo"} color="amber" /><Stat icon={<Flag />} label="Queda mais rápida" value={fastest[0]?.name ?? "—"} sub={fastest[0]?.member.duration ?? "Nenhuma baixa"} color="red" /></div>{phase === "encerrado" && <div className="mt-3 flex gap-3 rounded-lg border border-[#f4b942]/35 bg-gradient-to-r from-[#f4b942]/15 to-[#f4b942]/5 p-4"><Crown className="mt-1 h-6 w-6 shrink-0 text-[#f4b942]" /><div><p className="font-['Barlow_Condensed'] text-xs font-bold tracking-[.16em] text-[#f4b942] uppercase">Condecoração máxima</p><h3 className="mt-1 font-['Barlow_Condensed'] text-2xl leading-none font-bold uppercase">Monge ♾️ — Campeões Invictos</h3><p className="mt-1 text-sm text-[#91a3a7]">{alive.length ? alive.join(" · ") : "Nenhum integrante concluiu o ciclo como sobrevivente."}</p></div></div>}<div className="mt-3 grid gap-3 xl:grid-cols-[1.08fr_.92fr]"><RankingList title="Quem aguentou mais" eyebrow="Ranking 01" items={rankings.map((r) => ({name:r.name, main:r.member.eliminated ? r.member.rank ?? "Patente não registrada" : phase === "encerrado" ? "Monge · Campeão" : `${rank.label} atual`, time:phase==="pre"&&!r.member.eliminated ? "—" : duration(r.ms)}))} /><RankingList title="Queda mais rápida" eyebrow="Ranking 02" danger items={fastest.map((r) => ({name:r.name, main:`Caiu em ${dateTime(r.member.timestamp)}`, time:r.member.duration ?? "—"}))} empty={!fastest.length} /></div></section>}

      {tab === "participante" && <section className="pt-6"><Heading eyebrow="Acesso individual" title="Aba participante" text="Digite sua senha individual para consultar apenas suas informações de resistência." />{!participantName ? <div className="mx-auto grid min-h-80 max-w-xl justify-items-center rounded-xl border border-[#79b9e8]/25 bg-gradient-to-br from-[#0d1d23] to-[#081015] p-8 text-center"><span className="grid h-16 w-16 place-items-center rounded-full border border-[#79b9e8]/35 bg-[#79b9e8]/10 text-[#79b9e8]"><UsersRound className="h-7 w-7" /></span><p className="mt-4 font-['Barlow_Condensed'] text-xs font-bold tracking-[.16em] text-[#79b9e8] uppercase">Identificação individual</p><h3 className="mt-2 break-words font-['Barlow_Condensed'] text-3xl leading-none font-bold uppercase">Seu painel pessoal</h3><p className="mt-2 max-w-sm text-sm text-[#91a3a7]">Informe seu nome e sua senha individual. A sessão é protegida por cookie HttpOnly e não fica exposta no navegador.</p><label className="mt-5 w-full max-w-sm text-left font-['Barlow_Condensed'] text-xs font-bold tracking-[.08em] text-[#91a3a7] uppercase">Nome do participante<input value={participantLoginName} onChange={(e) => { setParticipantLoginName(e.target.value); setParticipantError(""); }} placeholder="Ex.: Ana" className="mt-1 h-10 w-full rounded border border-white/20 bg-[#081218] px-3 text-sm text-white outline-none focus:border-[#79b9e8]" /></label><label className="mt-3 w-full max-w-sm text-left font-['Barlow_Condensed'] text-xs font-bold tracking-[.08em] text-[#91a3a7] uppercase">Senha do participante<div className="mt-1 flex gap-2"><input type="password" value={participantPassword} onKeyDown={(e) => e.key === "Enter" && unlockParticipant()} onChange={(e) => { setParticipantPassword(e.target.value); setParticipantError(""); }} placeholder="Digite sua senha" className="h-10 min-w-0 flex-1 rounded border border-white/20 bg-[#081218] px-3 text-sm text-white outline-none focus:border-[#79b9e8]" /><button onClick={unlockParticipant} className="rounded border border-[#79b9e8] bg-[#79b9e8] px-4 text-xs font-bold text-[#071017]">Entrar</button></div></label>{participantError && <p role="alert" className="mt-2 w-full max-w-sm text-left text-xs text-[#ff756e]">{participantError}</p>}</div> : <div className="grid gap-4"><div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#79b9e8]/25 bg-[#79b9e8]/10 p-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#79b9e8]/35 bg-[#79b9e8]/15 font-['Barlow_Condensed'] text-sm font-bold text-[#79b9e8]">{initials(participantName)}</div><div className="min-w-0 flex-1"><p className="font-['Barlow_Condensed'] text-xs font-bold tracking-[.16em] text-[#79b9e8] uppercase">Participante autenticado</p><h3 className="mt-1 break-words font-['Barlow_Condensed'] text-3xl font-bold uppercase">{participantName}</h3></div><button onClick={() => { participantLogoutMutation.mutate(undefined, { onSettled: () => { setParticipantName(null); setParticipantPassword(""); setParticipantLoginName(""); } }); }} className="rounded border border-white/20 px-3 py-2 text-xs font-bold text-[#91a3a7] hover:text-white">Sair</button></div><section className={`rounded-xl border p-5 ${participantRecord?.eliminated ? "border-[#ff756e]/30 bg-[#ff756e]/10" : phase === "encerrado" ? "border-[#f4b942]/30 bg-[#f4b942]/10" : phase === "pre" ? "border-[#79b9e8]/30 bg-[#79b9e8]/10" : "border-[#65d6a0]/30 bg-[#65d6a0]/10"}`}><p className="font-['Barlow_Condensed'] text-xs font-bold tracking-[.16em] uppercase text-[#f4b942]">Seu status</p><h3 className="mt-1 break-words font-['Barlow_Condensed'] text-3xl font-bold uppercase">{participantRecord?.eliminated ? "Você foi eliminado" : phase === "pre" ? "O período ainda não começou" : phase === "encerrado" ? "Você completou o período" : "Você está resistindo"}</h3><p className="mt-2 break-words text-sm text-[#b8c7c5]">{participantRecord?.eliminated ? "Sua participação foi encerrada, mas seu histórico continua registrado abaixo." : phase === "pre" ? "Aguarde a abertura oficial em 31/08/2026 às 23:59 para iniciar sua contagem." : phase === "encerrado" ? "Parabéns. Seu tempo total ficou registrado no ranking final." : "Continue firme. Seu cronômetro está correndo neste momento."}</p></section>{participantRecord && !participantRecord.eliminated && phase === "ativo" && <section className="rounded-xl border border-[#ff756e]/25 bg-[#ff756e]/[.06] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="font-['Barlow_Condensed'] text-xs font-bold tracking-[.16em] text-[#ff756e] uppercase">Declaração voluntária</p><p className="mt-1 break-words text-sm text-[#d8b1ae]">Se você perdeu, registre o horário correto. O tempo será salvo no ranking e no cemitério.</p></div><button onClick={openParticipantLoss} className="shrink-0 rounded border border-[#ff756e]/45 bg-[#ff756e]/10 px-3 py-2 text-xs font-bold text-[#ff9a94] hover:bg-[#ff756e]/20">Dizer que fui eliminado</button></div></section>}{participantLossOpen && <Modal onClose={() => setParticipantLossOpen(false)}><div className="grid h-12 w-12 place-items-center rounded-lg border border-[#ff756e]/35 bg-[#ff756e]/10 text-[#ff756e]"><Skull /></div><p className="mt-4 font-['Barlow_Condensed'] text-xs font-bold tracking-[.15em] text-[#ff756e] uppercase">Registro do participante</p><h2 className="mt-1 break-words font-['Barlow_Condensed'] text-3xl leading-none font-bold uppercase">Dizer que fui eliminado</h2><p className="mt-2 break-words text-sm leading-relaxed text-[#91a3a7]">Informe quando a perda aconteceu. O horário será interpretado como horário oficial de Brasília.</p><div className="mt-4 grid gap-3"><label className="grid gap-1 font-['Barlow_Condensed'] text-xs font-bold tracking-[.08em] text-[#91a3a7] uppercase">Horário exato da perda<input type="datetime-local" value={participantLossDateTime} onChange={(e) => { setParticipantLossDateTime(e.target.value); setParticipantLossError(""); }} className="mt-1 h-10 min-w-0 rounded border border-white/20 bg-[#081218] px-3 text-sm font-normal tracking-normal text-white outline-none focus:border-[#ff756e]" /></label><label className="grid gap-1 font-['Barlow_Condensed'] text-xs font-bold tracking-[.08em] text-[#91a3a7] uppercase">Motivo <span className="font-normal normal-case tracking-normal text-[#62767a]">opcional</span><textarea value={participantLossReason} onChange={(e) => setParticipantLossReason(e.target.value)} rows={3} className="resize-y rounded border border-white/20 bg-[#081218] p-2 font-['IBM_Plex_Sans'] text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-[#ff756e]" placeholder="Ex.: perdi a disciplina durante a noite." /></label></div>{participantLossError && <p role="alert" className="mt-3 break-words text-xs text-[#ff756e]">{participantLossError}</p>}<div className="mt-4 flex flex-col-reverse justify-end gap-2 sm:flex-row"><button onClick={() => setParticipantLossOpen(false)} className="h-10 rounded border border-white/20 px-3 text-xs font-bold text-[#91a3a7] hover:text-white">Cancelar</button><button onClick={() => confirmParticipantLoss(true)} className="h-10 rounded border border-[#ff756e]/45 bg-[#ff756e]/10 px-3 text-xs font-bold text-[#ff9a94]">Perdi agora</button><button onClick={() => confirmParticipantLoss(false)} className="h-10 rounded bg-[#ff756e] px-3 text-xs font-bold text-[#160809]">Registrar este horário</button></div></Modal>}<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat icon={<Clock3 />} label="Tempo sobrevivido" value={duration(participantElapsed)} sub={participantRecord?.eliminated ? "Tempo até a eliminação" : phase === "pre" ? "Aguardando abertura" : "Contagem atual"} color="blue" /><Stat icon={<Trophy />} label="Posição no ranking" value={participantRanking ? `#${participantRanking}` : "—"} sub="Classificação por duração" color="amber" /><Stat icon={<Award />} label="Patente" value={participantRecord?.eliminated ? participantRecord.rank ?? "Registrada" : phase === "encerrado" ? "Monge" : `${rank.label}`} sub={participantRecord?.eliminated ? "Patente no momento da queda" : `Nível ${rank.symbol}`} color="blue" /><Stat icon={<Flag />} label="Horário da perda" value={participantRecord?.eliminated && participantRecord.timestamp ? dateTime(participantRecord.timestamp) : "Ainda não perdeu"} sub={participantRecord?.eliminated ? "Registro oficial" : "Você segue no desafio"} color={participantRecord?.eliminated ? "red" : "blue"} /></div><section className="rounded-xl border border-white/10 bg-[#0c1920]/85 p-5"><p className="font-['Barlow_Condensed'] text-xs font-bold tracking-[.16em] text-[#f4b942] uppercase">Mensagem para você</p><p className="mt-2 break-words text-base leading-relaxed text-[#eef4f1]">{participantMessage}</p></section>{participantRecord?.eliminated && participantRecord.reason && <blockquote className="rounded border-l-2 border-[#ff756e]/35 bg-[#ff756e]/5 p-4 text-sm italic text-[#d18a87]">Motivo registrado: “{participantRecord.reason}”</blockquote>}<p className="text-xs leading-relaxed text-[#62767a]">A posição é calculada a partir do estado oficial sincronizado pelo servidor.</p></div>}</section>}

{tab === "penalidades" && <section className="pt-6"><Heading eyebrow="Desafios coletivos" title="Prendas do pelotão" text="Cada prenda é independente. O mestre pode publicar, ocultar, retirar e acompanhar cada tarefa separadamente." />{visiblePenalties.length ? <div className="grid gap-3">{visiblePenalties.map((penalty, index) => { const done = memberNames.filter((name) => penalty.completedBy[name]).length; return <article key={penalty.id} className="rounded-xl border border-white/10 bg-[#0c1920]/85 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-['Barlow_Condensed'] text-xs font-bold tracking-[.16em] text-[#f4b942] uppercase">Prenda {String(index + 1).padStart(2, "0")}</p><h3 className="mt-2 break-words font-['Barlow_Condensed'] text-3xl font-bold uppercase">Para todo o pelotão</h3><p className="mt-2 break-words text-sm leading-relaxed text-[#b8c7c5]">{penalty.text}</p></div><span className="shrink-0 rounded border border-[#f4b942]/35 bg-[#f4b942]/10 px-3 py-2 text-xs font-bold text-[#f4b942]">{done}/{memberNames.length} concluíram</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#65d6a0] transition-all" style={{ width: `${memberNames.length ? (done / memberNames.length) * 100 : 0}%` }} /></div><p className="mt-2 text-xs text-[#91a3a7]">O acompanhamento individual é controlado exclusivamente pela Aba mestre.</p></article>})}</div> : <Empty icon={<LockKeyhole className="h-5 w-5" />} title="Nenhuma prenda publicada" text="O mestre ainda não publicou uma prenda para o pelotão." />}</section>}

{tab === "mestre" && <section className="pt-6"><Heading eyebrow="Controle administrativo" title="Área do mestre" text="Área administrativa privada. Ela não aparece na navegação pública e só pode ser aberta com nome e senha do mestre." />{!masterOpen ? <div className="mx-auto grid min-h-64 max-w-xl justify-items-center rounded-xl border border-[#f4b942]/25 bg-gradient-to-br from-[#0d1d23] to-[#081015] p-8 text-center"><span className="grid h-16 w-16 place-items-center rounded-full border border-[#f4b942]/35 bg-[#f4b942]/10 text-[#f4b942]"><LockKeyhole className="h-7 w-7" /></span><p className="mt-4 font-['Barlow_Condensed'] text-xs font-bold tracking-[.16em] text-[#f4b942] uppercase">Acesso restrito</p><h3 className="mt-2 font-['Barlow_Condensed'] text-3xl leading-none font-bold uppercase">Área bloqueada</h3><p className="mt-2 max-w-sm text-sm text-[#91a3a7]">Acesso administrativo indisponível nesta tela.</p></div> : <div className="grid gap-4"><div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#65d6a0]/25 bg-[#65d6a0]/10 px-4 py-3 text-sm text-[#65d6a0]"><BadgeCheck className="h-4 w-4" />Aba mestre liberada nesta sessão.<button onClick={() => { masterLogoutMutation.mutate(undefined, { onSettled: () => { setMasterOpen(false); setMasterSessionCode(""); setScheduleOpen(false); } }); }} className="ml-auto text-xs text-[#91a3a7] underline">Bloquear</button></div><section className="rounded-xl border border-[#79b9e8]/25 bg-[#0c1920]/85 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-['Barlow_Condensed'] text-xs font-bold tracking-[.16em] text-[#79b9e8] uppercase">Administração do pelotão</p><h3 className="mt-1 break-words font-['Barlow_Condensed'] text-3xl font-bold uppercase">Adicionar participante</h3><p className="mt-2 break-words text-sm text-[#91a3a7]">Cadastre o nome e uma senha individual. Somente o código mestre libera esta alteração.</p></div><span className="rounded border border-[#79b9e8]/25 bg-[#79b9e8]/10 px-3 py-2 text-xs font-bold text-[#79b9e8]">{memberNames.length} participantes</span></div><div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,.7fr)_auto]"><label className="grid gap-1 text-xs text-[#91a3a7]">Nome<input value={newMemberName} onChange={(e) => { setNewMemberName(e.target.value); setMemberManagementError(""); }} placeholder="Ex.: João Silva" className="h-10 rounded border border-white/20 bg-[#081218] px-3 text-sm text-white outline-none focus:border-[#79b9e8]" /></label><label className="grid gap-1 text-xs text-[#91a3a7]">Senha individual<input type="password" value={newMemberPassword} maxLength={12} onChange={(e) => { setNewMemberPassword(e.target.value); setMemberManagementError(""); }} placeholder="4 a 12 caracteres" className="h-10 rounded border border-white/20 bg-[#081218] px-3 text-sm text-white outline-none focus:border-[#79b9e8]" /></label><button onClick={addMember} className="h-10 self-end rounded border border-[#79b9e8] bg-[#79b9e8] px-4 text-xs font-bold text-[#071017]">Adicionar</button></div>{memberManagementError && <p role="alert" className="mt-2 break-words text-xs text-[#ff756e]">{memberManagementError}</p>}<div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{memberNames.map((name) => <div key={name} className="flex min-w-0 items-center justify-between gap-2 rounded border border-white/10 bg-white/[.02] p-3"><div className="min-w-0"><strong className="block break-words text-sm">{name}</strong><span className="block break-words text-xs text-[#62767a]">Senha individual cadastrada</span></div><button onClick={() => removeMember(name)} className="shrink-0 rounded border border-[#ff756e]/35 px-2 py-1.5 text-xs font-bold text-[#ff756e] hover:bg-[#ff756e]/10">Remover</button></div>)}</div></section><section className="rounded-xl border border-white/10 bg-[#0c1920]/85 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-['Barlow_Condensed'] text-xs font-bold tracking-[.16em] text-[#f4b942] uppercase">Agenda oficial</p><h3 className="mt-1 font-['Barlow_Condensed'] text-3xl font-bold uppercase">Ciclo e cronômetros</h3><p className="mt-2 text-sm text-[#91a3a7]">31/08/2026 às 23:59 → 30/09/2026 às 23:59. Alterar a agenda recalcula tempos futuros.</p></div><button onClick={openSchedule} className="h-10 rounded border border-[#f4b942]/35 bg-[#f4b942]/10 px-4 text-xs font-bold text-[#f4b942]">Editar agenda</button></div></section><section className="rounded-xl border border-[#f4b942]/25 bg-[#0c1920]/85 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-['Barlow_Condensed'] text-xs font-bold tracking-[.16em] text-[#f4b942] uppercase">Gerenciamento de prendas</p><h3 className="mt-1 break-words font-['Barlow_Condensed'] text-3xl font-bold uppercase">Adicionar prenda</h3><p className="mt-2 break-words text-sm text-[#91a3a7]">Prendas são diferentes das regras e podem ser publicadas, ocultadas, editadas ou removidas somente pelo mestre.</p></div><span className="rounded border border-[#f4b942]/25 bg-[#f4b942]/10 px-3 py-2 text-xs font-bold text-[#f4b942]">{data.penalties.length} prendas</span></div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><textarea value={newPenaltyText} onChange={(e) => { setNewPenaltyText(e.target.value); setContentManagementError(""); }} rows={2} placeholder="Descreva uma nova prenda para todos..." className="min-w-0 flex-1 resize-y rounded border border-white/20 bg-[#081218] p-3 text-sm text-white outline-none focus:border-[#f4b942]" /><button onClick={addPenalty} className="min-h-10 shrink-0 rounded border border-[#f4b942] bg-[#f4b942] px-4 text-xs font-bold text-[#17130a]">Adicionar prenda</button></div><div className="mt-4 grid gap-2">{data.penalties.map((penalty) => <div key={penalty.id} className="rounded border border-white/10 bg-white/[.02] p-3"><div className="flex flex-wrap items-start justify-between gap-2"><p className="min-w-0 flex-1 break-words text-sm">{penalty.text}</p><span className={`shrink-0 rounded px-2 py-1 text-[.65rem] font-bold ${penalty.visible ? "bg-[#65d6a0]/10 text-[#65d6a0]" : "bg-white/10 text-[#91a3a7]"}`}>{penalty.visible ? "VISÍVEL" : "OCULTA"}</span></div><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => editPenalty(penalty.id, penalty.text)} className="rounded border border-white/20 px-2.5 py-1.5 text-xs font-bold text-[#b8c7c5]">Editar</button><button onClick={() => togglePenalty(penalty.id)} className="rounded border border-[#f4b942]/30 px-2.5 py-1.5 text-xs font-bold text-[#f4b942]">{penalty.visible ? "Ocultar" : "Publicar"}</button><button onClick={() => removePenalty(penalty.id)} className="rounded border border-[#ff756e]/35 px-2.5 py-1.5 text-xs font-bold text-[#ff756e]">Remover</button></div></div>)}</div></section><section className="rounded-xl border border-[#79b9e8]/25 bg-[#0c1920]/85 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-['Barlow_Condensed'] text-xs font-bold tracking-[.16em] text-[#79b9e8] uppercase">Gerenciamento de regras</p><h3 className="mt-1 break-words font-['Barlow_Condensed'] text-3xl font-bold uppercase">Adicionar regra</h3><p className="mt-2 break-words text-sm text-[#91a3a7]">Regras são orientações do desafio, independentes das prendas coletivas.</p></div><span className="rounded border border-[#79b9e8]/25 bg-[#79b9e8]/10 px-3 py-2 text-xs font-bold text-[#79b9e8]">{data.rules.length} regras</span></div><div className="mt-4 flex flex-col gap-2 sm:flex-row"><textarea value={newRuleText} onChange={(e) => { setNewRuleText(e.target.value); setContentManagementError(""); }} rows={2} placeholder="Descreva uma nova regra..." className="min-w-0 flex-1 resize-y rounded border border-white/20 bg-[#081218] p-3 text-sm text-white outline-none focus:border-[#79b9e8]" /><button onClick={addRule} className="min-h-10 shrink-0 rounded border border-[#79b9e8] bg-[#79b9e8] px-4 text-xs font-bold text-[#071017]">Adicionar regra</button></div>{contentManagementError && <p role="alert" className="mt-2 break-words text-xs text-[#ff756e]">{contentManagementError}</p>}<div className="mt-4 grid gap-2">{data.rules.map((rule, index) => <div key={rule.id} className="rounded border border-white/10 bg-white/[.02] p-3"><div className="flex flex-wrap items-start justify-between gap-2"><p className="min-w-0 flex-1 break-words text-sm"><span className="mr-2 font-['Barlow_Condensed'] text-xs text-[#79b9e8]">{String(index + 1).padStart(2, "0")}</span>{rule.text}</p><span className={`shrink-0 rounded px-2 py-1 text-[.65rem] font-bold ${rule.visible ? "bg-[#65d6a0]/10 text-[#65d6a0]" : "bg-white/10 text-[#91a3a7]"}`}>{rule.visible ? "VISÍVEL" : "OCULTA"}</span></div><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => editRule(rule.id, rule.text)} className="rounded border border-white/20 px-2.5 py-1.5 text-xs font-bold text-[#b8c7c5]">Editar</button><button onClick={() => toggleRule(rule.id)} className="rounded border border-[#79b9e8]/30 px-2.5 py-1.5 text-xs font-bold text-[#79b9e8]">{rule.visible ? "Ocultar" : "Publicar"}</button><button onClick={() => removeRule(rule.id)} className="rounded border border-[#ff756e]/35 px-2.5 py-1.5 text-xs font-bold text-[#ff756e]">Remover</button></div></div>)}</div></section><section className="rounded-xl border border-white/10 bg-[#0c1920]/85 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="font-['Barlow_Condensed'] text-xs font-bold tracking-[.16em] text-[#f4b942] uppercase">Acompanhamento individual</p><h3 className="mt-1 break-words font-['Barlow_Condensed'] text-3xl font-bold uppercase">Quem fez cada prenda</h3><p className="mt-1 break-words text-sm text-[#91a3a7]">Marque o participante em cada prenda. O mestre pode corrigir o status a qualquer momento.</p></div><div className="text-right text-xs"><strong className="block text-2xl text-[#65d6a0]">{penaltyDone}</strong><span className="text-[#91a3a7]">conclusões</span></div></div>{visiblePenalties.length ? <div className="mt-4 grid gap-3">{visiblePenalties.map((penalty, index) => <div key={penalty.id} className="rounded border border-white/10 bg-white/[.02] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="break-words text-sm">Prenda {String(index + 1).padStart(2, "0")}</strong><span className="text-xs text-[#91a3a7]">{memberNames.filter((name) => penalty.completedBy[name]).length}/{memberNames.length} feitos</span></div><p className="mt-1 break-words text-xs text-[#b8c7c5]">{penalty.text}</p><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{memberNames.map((name) => <button key={name} onClick={() => togglePenaltyCompletion(penalty.id, name)} className={`flex min-h-11 min-w-0 items-center justify-between gap-2 rounded border px-3 py-2 text-left text-xs transition ${penalty.completedBy[name] ? "border-[#65d6a0]/35 bg-[#65d6a0]/10 text-[#65d6a0]" : "border-white/10 bg-white/[.02] text-[#b8c7c5] hover:border-[#f4b942]/40"}`}><span className="min-w-0 break-words">{name}</span><span className="shrink-0 font-bold">{penalty.completedBy[name] ? "FEZ" : "NÃO FEZ"}</span></button>)}</div></div>)}</div> : <p className="mt-4 text-sm text-[#91a3a7]">Cadastre uma prenda acima para iniciar o acompanhamento.</p>}</section><section className="rounded-xl border border-white/10 bg-[#0c1920]/85 p-5"><p className="font-['Barlow_Condensed'] text-xs font-bold tracking-[.16em] text-[#f4b942] uppercase">Reativação</p><h3 className="mt-1 font-['Barlow_Condensed'] text-3xl font-bold uppercase">Integrantes eliminados</h3>{dead.length ? <div className="mt-3 grid gap-2">{dead.map((name) => <div key={name} className="flex flex-wrap items-center justify-between gap-2 rounded border border-white/10 p-3"><div><strong className="text-sm">{name}</strong><span className="ml-2 text-xs text-[#91a3a7]">{dateTime(data.members[name].timestamp)}</span></div><button onClick={() => openMember(name)} className="rounded border border-[#65d6a0]/35 bg-[#65d6a0]/10 px-3 py-2 text-xs font-bold text-[#65d6a0] hover:bg-[#65d6a0]/20">Reativar com mestre</button></div>)}</div> : <p className="mt-3 text-sm text-[#91a3a7]">Nenhum integrante eliminado no momento.</p>}</section></div>}</section>}

{tab === "cemiterio" && <section className="pt-6"><Heading eyebrow="Arquivo de eventos" title="Cemitério de Baixas" text="Linha do tempo com carimbo preciso, patente perdida, duração e motivo de cada queda." /><div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3"><Stat icon={<Skull/>} label="Baixas" value={pad(dead.length)} sub="Registros oficiais" color="red" /><Stat icon={<Flag/>} label="Dia crítico" value={critical} sub="Maior incidência" color="red" /><Stat icon={<Clock3/>} label="Média de resistência" value={average} sub="Entre eliminados" color="blue" /></div>{fastest.length ? <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-[#0a151b]/80">{[...fastest].reverse().map(({name,member},index)=><article key={name} className="grid gap-3 border-b border-white/10 p-4 last:border-b-0 sm:grid-cols-[20px_42px_minmax(0,1fr)_auto] sm:items-center"><div className="relative hidden h-full justify-items-center sm:grid"><span className="z-10 h-2 w-2 rounded-full bg-[#ff756e] shadow-[0_0_0_4px_rgba(255,117,110,.12)]" />{index<fastest.length-1&&<span className="absolute top-1/2 bottom-[-25px] w-px bg-[#ff756e]/25"/>}</div><span className="grid h-10 w-10 place-items-center rounded-full border border-[#ff756e]/35 bg-[#ff756e]/10 font-['Barlow_Condensed'] text-xs font-bold text-[#ff756e]">{initials(name)}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold">{name}</h3><span className="rounded border border-[#ff756e]/20 px-1.5 py-0.5 font-['Barlow_Condensed'] text-[.6rem] font-bold tracking-[.08em] text-[#ff756e]">BAIXA REGISTRADA</span></div><p className="mt-1 font-['Barlow_Condensed'] text-xs font-semibold text-[#df8b87]">Caiu em {dateTime(member.timestamp)}</p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[.7rem] text-[#91a3a7]"><span className="inline-flex items-center gap-1"><Award className="h-3 w-3 text-[#79b9e8]" />{member.rank}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3 text-[#79b9e8]" />Resistiu {member.duration}</span></div>{member.reason&&<blockquote className="mt-2 border-l-2 border-[#ff756e]/35 pl-2 text-xs italic text-[#9aacab]">“{member.reason}”</blockquote>}</div><button disabled={phase!=="ativo"} onClick={()=>openMember(name)} className="h-8 justify-self-start rounded border border-[#65d6a0]/35 bg-[#65d6a0]/10 px-3 font-['Barlow_Condensed'] text-xs font-bold text-[#65d6a0] disabled:opacity-30 sm:justify-self-end">Reativar</button></article>)}</div> : <div className="mt-3"><Empty icon={<Swords className="h-5 w-5"/>} title="Pelotão 100% intacto" text="Nenhuma baixa foi registrada. Que a disciplina mantenha este arquivo vazio." /></div>}</section>}

      {tab === "regras" && <section className="pt-6"><Heading eyebrow="Protocolo do desafio" title="Regras, ciclo e patentes" text="Os marcos abaixo orientam o painel e permanecem visíveis para todo o pelotão." /><section className="grid gap-5 rounded-xl border border-white/10 bg-gradient-to-br from-[#0f1f26] to-[#081015] p-5 lg:grid-cols-[1fr_1.3fr_auto] lg:items-center"><div><p className="font-['Barlow_Condensed'] text-xs font-bold tracking-[.15em] text-[#f4b942] uppercase">Ciclo oficial</p><h3 className="mt-1 font-['Barlow_Condensed'] text-3xl leading-none font-bold uppercase">Setembro de disciplina</h3><p className="mt-2 text-sm text-[#91a3a7]">Alterações na agenda atualizam cronômetros e cálculos futuros neste navegador.</p></div><div className="grid gap-2 sm:grid-cols-2"><TimeFact icon={<CalendarClock/>} title="Início" detail={dateTime(start)} /><TimeFact icon={<Flag/>} title="Encerramento" detail={dateTime(end)} /></div><button onClick={openSchedule} className="h-10 justify-self-start rounded border border-[#f4b942]/35 bg-[#f4b942]/10 px-4 text-xs font-bold text-[#f4b942] hover:bg-[#f4b942]/20">Agendar ciclo</button></section><div className="mt-3 grid gap-3 xl:grid-cols-[.85fr_1.15fr]"><section className="rounded-xl border border-white/10 bg-[#0b171d]/80 p-5"><p className="font-['Barlow_Condensed'] text-xs font-bold tracking-[.15em] text-[#f4b942] uppercase">Código de conduta</p><h3 className="mt-1 font-['Barlow_Condensed'] text-3xl leading-none font-bold uppercase">Quatro regras de operação</h3>{data.rules.filter((rule) => rule.visible).length ? data.rules.filter((rule) => rule.visible).map((rule, index) => <div key={rule.id} className="grid grid-cols-[30px_minmax(0,1fr)] gap-2 border-b border-white/10 py-3 last:border-0"><span className="grid h-7 w-7 place-items-center rounded border border-[#79b9e8]/30 bg-[#79b9e8]/10 font-['Barlow_Condensed'] text-xs font-bold text-[#79b9e8]">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0"><h4 className="break-words text-sm font-bold">Regra de operação</h4><p className="mt-1 break-words text-xs leading-relaxed text-[#91a3a7]">{rule.text}</p></div></div>) : <p className="py-4 text-sm text-[#91a3a7]">Nenhuma regra publicada no momento.</p>}</section><section className="rounded-xl border border-white/10 bg-[#0b171d]/80 p-5"><div className="flex justify-between gap-3"><div><p className="font-['Barlow_Condensed'] text-xs font-bold tracking-[.15em] text-[#f4b942] uppercase">Hierarquia</p><h3 className="mt-1 font-['Barlow_Condensed'] text-3xl leading-none font-bold uppercase">Patentes de setembro</h3></div><span className="h-fit rounded border border-[#f4b942]/30 bg-[#f4b942]/10 px-2 py-1 font-['Barlow_Condensed'] text-xs font-bold text-[#f4b942]">DIA {pad(day)}</span></div><div className="mt-4 grid gap-1">{RANKS.map(({min,max,label,symbol,mark})=>{const current=day>=min&&day<=max;return <div key={label} className={`grid min-h-9 grid-cols-[28px_1fr_auto_auto] items-center gap-2 rounded px-2 text-xs ${current?"border border-[#f4b942]/40 bg-[#f4b942]/10 text-white":"border border-transparent bg-white/[.015] text-[#91a3a7]"}`}><span className="grid h-6 w-6 place-items-center rounded border border-white/10 font-['Barlow_Condensed'] text-[.65rem] font-bold text-[#79b9e8]">{symbol}</span><strong>{label} <span aria-hidden="true">{mark}</span></strong><small className="font-['Barlow_Condensed']">{min}–{max} dias</small>{current&&<em className="rounded bg-[#f4b942] px-1 py-0.5 font-['Barlow_Condensed'] text-[.55rem] font-bold not-italic text-[#17130a]">ATUAL</em>}</div>})}</div></section></div></section>}
      <footer className="mt-6 flex flex-wrap justify-between gap-3 text-[.68rem] text-[#62767a]"><span className="inline-flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${phase==="ativo"?"bg-[#65d6a0]":"bg-[#79b9e8]"}`} />{phase==="ativo"?"Monitoramento em tempo real":phase==="pre"?"Agenda em espera":"Arquivo concluído"}</span><span>Dados sincronizados no servidor</span></footer>
    </main></div>

    {memberModal&&active&&<Modal onClose={()=>setMemberModal(null)}><div className={`grid h-12 w-12 place-items-center rounded-lg border ${active.eliminated?"border-[#65d6a0]/35 bg-[#65d6a0]/10 text-[#65d6a0]":"border-[#ff756e]/35 bg-[#ff756e]/10 text-[#ff756e]"}`}>{active.eliminated?<Swords/>:<Skull/>}</div><p className="mt-4 font-['Barlow_Condensed'] text-xs font-bold tracking-[.15em] text-[#f4b942] uppercase">Validação individual</p><h2 className="mt-1 break-words font-['Barlow_Condensed'] text-3xl leading-none font-bold uppercase">{active.eliminated?`Reativar ${memberModal}`:`Registrar baixa: ${memberModal}`}</h2><p className="mt-2 text-sm leading-relaxed text-[#91a3a7]">{active.eliminated?"Digite o código mestre para reativar este integrante.":"Confirme o código pessoal e, se desejar, registre uma observação para o arquivo."}</p><label className="mt-3 grid gap-1 font-['Barlow_Condensed'] text-xs font-bold tracking-[.08em] text-[#91a3a7] uppercase">{active.eliminated ? "Código mestre" : "Código de 6 caracteres"}<input autoFocus type="password" maxLength={active.eliminated ? 12 : 6} value={password} onChange={(e)=>{setPassword(e.target.value.toUpperCase());setMemberError("");}} className="h-10 rounded border border-white/20 bg-[#081218] px-3 text-sm text-white outline-none focus:border-[#f4b942]" placeholder="••••••" /></label>{!active.eliminated&&<label className="mt-2 grid gap-1 font-['Barlow_Condensed'] text-xs font-bold tracking-[.08em] text-[#91a3a7] uppercase">Motivo da queda <span className="font-normal normal-case tracking-normal text-[#62767a]">opcional</span><textarea value={reason} onChange={(e)=>setReason(e.target.value)} rows={3} className="resize-y rounded border border-white/20 bg-[#081218] p-2 font-['IBM_Plex_Sans'] text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-[#f4b942]" placeholder="Ex.: Não sustentou a disciplina no final do dia." /></label>}{memberError&&<p className="text-xs text-[#ff756e]">{memberError}</p>}<div className="mt-3 flex justify-end gap-2"><button onClick={()=>setMemberModal(null)} className="h-9 rounded border border-white/20 px-3 text-xs font-bold text-[#91a3a7] hover:text-white">Cancelar</button><button onClick={confirmMember} className={`h-9 rounded px-3 text-xs font-bold ${active.eliminated?"bg-[#65d6a0] text-[#06130c]":"bg-[#c94945] text-white"}`}>{active.eliminated?"Reativar com código mestre":"Validar baixa"}</button></div></Modal>}
    <footer className="relative mt-12 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d1d24] via-[#09151b] to-[#071017] px-5 py-6 shadow-[0_18px_50px_rgba(0,0,0,.22)] sm:px-7"><div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#f4b942]/[.06] blur-3xl" /><div className="relative grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:items-end"><div><div className="inline-flex items-center gap-2 rounded-full border border-[#65d6a0]/20 bg-[#65d6a0]/[.06] px-3 py-1.5 font-['Barlow_Condensed'] text-[.65rem] font-bold tracking-[.14em] text-[#65d6a0] uppercase"><span className="h-1.5 w-1.5 rounded-full bg-[#65d6a0] shadow-[0_0_12px_#65d6a0]" />{phase === "ativo" ? "Sinal ativo" : phase === "pre" ? "Aguardando abertura" : "Arquivo concluído"}</div><h2 className="mt-3 font-['Barlow_Condensed'] text-3xl font-bold tracking-[-.02em] text-[#eef4f1] uppercase sm:text-4xl">Disciplina registrada.</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-[#91a3a7]">O Xifado mantém o placar, o tempo oficial de Brasília e os registros do pelotão em um único lugar.</p></div><div className="lg:text-right"><p className="text-xs uppercase tracking-[.12em] text-[#62767a]">Projeto criado por</p><a href="https://www.instagram.com/expedito_mt?igsi=MTQydmp2NXJqMXJnbA==" target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-2 text-lg font-bold text-[#ff4f8b] transition hover:text-[#ff9fbe] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4f8b] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09151b]"><Instagram className="h-4 w-4" />@expedito</a><p className="mt-1 text-xs text-[#62767a]">Comunicação e interface do desafio</p></div></div><div className="relative mt-6 flex flex-col gap-3 border-t border-white/10 pt-4 text-xs text-[#62767a] sm:flex-row sm:items-center sm:justify-between"><span>Desafio Xifado · Monitoramento do pelotão</span><span>Horário oficial: America/Sao_Paulo</span></div></footer><button type="button" onClick={scrollToTop} aria-label="Voltar ao topo" title="Voltar ao topo" className="fixed bottom-5 right-5 z-50 grid h-12 w-12 place-items-center rounded-full border-2 border-[#f4b942]/70 bg-[#10242b]/95 text-[#f4b942] shadow-[0_10px_28px_rgba(0,0,0,.45),0_0_0_5px_rgba(244,185,66,.08)] backdrop-blur transition hover:-translate-y-1 hover:bg-[#f4b942] hover:text-[#17130a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4b942] focus-visible:ring-offset-2 focus-visible:ring-offset-[#071017] active:translate-y-0 sm:bottom-7 sm:right-7"><ArrowUp className="h-5 w-5" strokeWidth={2.5} /></button>

    {scheduleOpen&&<Modal onClose={()=>setScheduleOpen(false)}><div className="grid h-12 w-12 place-items-center rounded-lg border border-[#f4b942]/35 bg-[#f4b942]/10 text-[#f4b942]"><CalendarClock /></div><p className="mt-4 font-['Barlow_Condensed'] text-xs font-bold tracking-[.15em] text-[#f4b942] uppercase">Configuração de ciclo</p><h2 className="mt-1 break-words font-['Barlow_Condensed'] text-3xl leading-none font-bold uppercase">Agendar início e encerramento</h2><p className="mt-2 text-sm leading-relaxed text-[#91a3a7]">Defina os marcos com data, hora, minuto e segundo. Registros já salvos não são apagados.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><DateField title="Início oficial" date={scheduleForm.startDate} time={scheduleForm.startTime} onDate={(startDate)=>setScheduleForm({...scheduleForm,startDate})} onTime={(startTime)=>setScheduleForm({...scheduleForm,startTime})}/><DateField title="Encerramento" date={scheduleForm.endDate} time={scheduleForm.endTime} onDate={(endDate)=>setScheduleForm({...scheduleForm,endDate})} onTime={(endTime)=>setScheduleForm({...scheduleForm,endTime})}/></div><div className="mt-5 flex justify-end gap-2"><button onClick={()=>setScheduleOpen(false)} className="h-9 rounded border border-white/20 px-3 text-xs font-bold text-[#91a3a7] hover:text-white">Cancelar</button><button onClick={saveSchedule} className="h-9 rounded bg-[#f4b942] px-3 text-xs font-bold text-[#17130a]">Salvar agenda</button></div></Modal>}
  </div>;
}

function PhaseBanner({ icon, title, text, action, onClick }: { icon: React.ReactNode; title: string; text: string; action: string; onClick: () => void }) { return <div className="flex items-start gap-3 rounded-xl border border-[#f4b942]/35 bg-gradient-to-r from-[#f4b942]/15 to-[#f4b942]/5 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#f4b942]/35 bg-[#f4b942]/10 text-[#f4b942]">{icon}</span><div className="min-w-0"><strong className="block font-['Barlow_Condensed'] text-xl leading-none">{title}</strong><span className="mt-1 block break-words text-xs text-[#91a3a7]">{text}</span></div><button onClick={onClick} className="ml-auto hidden shrink-0 rounded border border-[#f4b942]/35 px-3 py-2 text-xs font-bold text-[#f4b942] sm:block">{action}</button></div>; }
function Stat({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: "amber" | "blue" | "red" }) { const tone = color==="amber"?"text-[#f4b942] border-[#f4b942]/25 bg-[#f4b942]/10":color==="red"?"text-[#ff756e] border-[#ff756e]/25 bg-[#ff756e]/10":"text-[#79b9e8] border-[#79b9e8]/25 bg-[#79b9e8]/10"; return <article className="min-h-32 rounded-xl border border-white/10 bg-[#0c1920]/85 p-3 sm:p-4"><span className={`grid h-7 w-7 place-items-center rounded border ${tone}`}>{icon}</span><p className="mt-3 break-words font-['Barlow_Condensed'] text-[.58rem] font-bold tracking-[.1em] text-[#62767a] uppercase sm:text-[.68rem]">{label}</p><strong className="mt-1 block break-words font-['Barlow_Condensed'] text-xl leading-none sm:text-2xl">{value}</strong><span className="mt-1 block break-words text-[.62rem] text-[#91a3a7] sm:text-xs">{sub}</span></article>; }
function RankingList({ title, eyebrow, items, danger=false, empty=false }: { title: string; eyebrow: string; items: { name:string; main:string|null; time:string }[]; danger?: boolean; empty?: boolean }) { return <section className="overflow-hidden rounded-xl border border-white/10 bg-[#0b171d]/80"><div className="flex items-start justify-between border-b border-white/10 p-4"><div><p className="font-['Barlow_Condensed'] text-xs font-bold tracking-[.15em] text-[#f4b942] uppercase">{eyebrow}</p><h3 className="mt-1 font-['Barlow_Condensed'] text-2xl leading-none font-bold uppercase">{title}</h3></div><span className="rounded border border-white/10 px-1.5 py-1 font-['Barlow_Condensed'] text-[.62rem] font-bold tracking-[.09em] text-[#62767a] uppercase">{danger?"Por horário":"Por duração"}</span></div>{empty?<Empty icon={<Skull className="h-5 w-5"/>} title="Ainda não há baixas" text="O ranking de queda será formado assim que houver registros."/>:<ol>{items.map((item,index)=><li key={item.name} className="grid min-h-15 grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-2 border-b border-white/10 px-4 py-2 last:border-0"><span className={`font-['Barlow_Condensed'] text-lg font-bold ${danger?"text-[#ff756e]":"text-[#f4b942]"}`}>{pad(index+1)}</span><div className="min-w-0"><strong className="block break-words text-sm">{item.name}</strong><small className="block break-words text-[.68rem] text-[#91a3a7]">{item.main}</small></div><time className={`font-['Barlow_Condensed'] text-sm font-bold ${danger?"text-[#ff756e]":"text-[#79b9e8]"}`}>{item.time}</time></li>)}</ol>}</section>; }
function TimeFact({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) { return <div className="grid min-w-0 grid-cols-[18px_minmax(0,1fr)] gap-x-2 border-l border-white/10 pl-3 text-xs text-[#91a3a7]"><span className="row-span-2 text-[#f4b942]">{icon}</span><b className="font-['Barlow_Condensed'] text-xs tracking-[.08em] text-[#eef4f1] uppercase">{title}</b><span className="break-words">{detail}</span></div>; }
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) { useEffect(() => { const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose(); window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [onClose]); return <div className="fixed inset-0 z-50 grid place-items-center bg-[#02070a]/80 p-4 backdrop-blur-md" onMouseDown={onClose}><section role="dialog" aria-modal="true" onMouseDown={(e)=>e.stopPropagation()} className="relative w-full max-w-xl rounded-xl border border-white/20 bg-gradient-to-br from-[#102029] to-[#071117] p-5 shadow-2xl sm:p-7"><button onClick={onClose} aria-label="Fechar" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded border border-white/10 text-[#91a3a7] hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>{children}</section></div>; }
function DateField({ title, date, time, onDate, onTime }: { title: string; date: string; time: string; onDate: (v:string)=>void; onTime: (v:string)=>void }) { return <fieldset className="grid gap-2 rounded-lg border border-white/15 p-3"><legend className="px-1 font-['Barlow_Condensed'] text-xs font-bold tracking-[.08em] text-[#f4b942] uppercase">{title}</legend><label className="grid gap-1 text-xs text-[#91a3a7]">Data<input type="date" value={date} onChange={(e)=>onDate(e.target.value)} className="h-9 rounded border border-white/20 bg-[#081218] px-2 text-xs text-white [color-scheme:dark] outline-none focus:border-[#f4b942]" /></label><label className="grid gap-1 text-xs text-[#91a3a7]">Horário<input type="time" step="1" value={time} onChange={(e)=>onTime(e.target.value)} className="h-9 rounded border border-white/20 bg-[#081218] px-2 text-xs text-white [color-scheme:dark] outline-none focus:border-[#f4b942]" /></label></fieldset>; }
