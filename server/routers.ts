import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "node:crypto";
import { publicProcedure, router } from "./_core/trpc.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { ENV } from "./_core/env.js";
import {
  getXifadoState,
  saveXifadoState,
  mutateXifadoState,
} from "./db.js";
import type { XifadoData } from "../shared/xifado.js";
import {
  hashParticipantPassword,
  verifyParticipantPassword,
} from "./security.js";
import {
  getCredentialHash,
  listCredentialHashes,
  upsertCredentialHash,
} from "./credentials.js";
import {
  createParticipantSession,
  readParticipantSession,
} from "./participant-session.js";
import {
  createMasterSession,
  readMasterSession,
} from "./master-session.js";
import {
  assertRateLimit,
  requestKey,
} from "./rate-limit.js";

const PARTICIPANT_COOKIE = "xifado_participant_session";
const MASTER_COOKIE = "xifado_master_session";

const memberSchema = z.object({
  eliminated: z.boolean(),
  timestamp: z.number().nullable(),
  reason: z.string(),
  rank: z.string().nullable(),
  duration: z.string().nullable(),
  sessionVersion: z.number().optional(),
  active: z.boolean().optional(),
  removedAt: z.string().nullable().optional(),
  removedBy: z.string().nullable().optional(),
  lossHistory: z
    .array(
      z.object({
        occurredAt: z.number(),
        recordedAt: z.string(),
        reason: z.string(),
        status: z.enum(["LOSS_DECLARED", "REVIVED"]),
      }),
    )
    .optional(),
});

const safeStateSchema = z.object({
  schedule: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  members: z.record(z.string(), memberSchema),
  penalties: z.array(
    z.object({
      id: z.string(),
      text: z.string().min(1),
      visible: z.boolean(),
      completedBy: z.record(z.string(), z.boolean()),
    }),
  ),
  rules: z.array(
    z.object({
      id: z.string(),
      text: z.string().min(1),
      visible: z.boolean(),
    }),
  ),
});

const publicState = (data: XifadoData) => ({
  schedule: data.schedule,
  members: data.members,
  penalties: data.penalties,
  rules: data.rules,
});

const normalizeName = (value: string) =>
  value.trim().replace(/\s+/g, " ");

const cookieValue = (
  req: {
    headers?: {
      cookie?: string;
    };
  },
  name: string,
) =>
  req.headers?.cookie
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1) ?? null;

const clearXifadoCookie = (
  ctx: {
    req: any;
    res: any;
  },
  name: string,
) => {
  ctx.res.clearCookie(name, {
    ...getSessionCookieOptions(ctx.req),
    maxAge: -1,
  });
};

const requireMasterSession = (ctx: { req: any }) => {
  const token = cookieValue(ctx.req, MASTER_COOKIE);

  if (!token || !readMasterSession(token)) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sessão mestre expirada.",
    });
  }
};

const requireParticipantSession = async (ctx: { req: any }) => {
  const token = cookieValue(ctx.req, PARTICIPANT_COOKIE);

  const session = token
    ? readParticipantSession(token)
    : null;

  if (!session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sessão de participante expirada.",
    });
  }

  const data = await getXifadoState();
  const member = data.members[session.name];

  if (
    !member ||
    member.active === false ||
    (member.sessionVersion ?? 1) !== session.sessionVersion
  ) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sessão de participante revogada.",
    });
  }

  return {
    data,
    name: session.name,
  };
};

const assertActiveCycle = (data: XifadoData) => {
  const now = Date.now();
  const start = Date.parse(data.schedule.start);
  const end = Date.parse(data.schedule.end);

  if (now < start || now >= end) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "A ação só pode ser feita durante o período ativo.",
    });
  }

  return {
    start,
    end,
    now,
  };
};

export const appRouter = router({
  xifado: router({
    // ============================================================
    // ESTADO PÚBLICO
    // ============================================================

    state: publicProcedure.query(async () => {
      return publicState(await getXifadoState());
    }),

    // ============================================================
    // LOGIN UNIFICADO
    //
    // mestre + senha mestre = acesso mestre
    // participante + senha = acesso participante
    // ============================================================

    login: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(80),
          password: z.string().min(1).max(128),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const name = normalizeName(input.name);

        // ----------------------------------------------------------
        // LOGIN MESTRE
        // ----------------------------------------------------------

        if (name.toLowerCase() === "mestre") {
          try {
            await assertRateLimit(
              `master-login:${requestKey(ctx.req as never)}`,
              5,
              5 * 60_000,
            );
          } catch {
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message:
                "Muitas tentativas. Aguarde alguns minutos.",
            });
          }

          if (
            !ENV.xifadoMasterCode ||
            input.password !== ENV.xifadoMasterCode
          ) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Nome ou senha incorretos.",
            });
          }

          const token = createMasterSession();

          ctx.res.cookie(
            MASTER_COOKIE,
            token,
            {
              ...getSessionCookieOptions(ctx.req),
              maxAge: 1000 * 60 * 60 * 12,
            },
          );

          clearXifadoCookie(
            ctx,
            PARTICIPANT_COOKIE,
          );

          return {
            role: "master",
          } as const;
        }

        // ----------------------------------------------------------
        // LOGIN PARTICIPANTE
        // ----------------------------------------------------------

        try {
          await assertRateLimit(
            `participant-login:${requestKey(ctx.req as never)}`,
            10,
            60_000,
          );
        } catch {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message:
              "Muitas tentativas. Aguarde um minuto.",
          });
        }

        const data = await getXifadoState();

        const memberName = Object.keys(data.members).find(
          (key) =>
            normalizeName(key).toLowerCase() ===
            name.toLowerCase(),
        );

        const resolvedName = memberName ?? name;

        const stored =
          (await getCredentialHash(resolvedName)) ??
          data.credentials[resolvedName];

        const member = data.members[resolvedName];

        if (
          !stored ||
          !member ||
          member.active === false ||
          !(await verifyParticipantPassword(
            input.password,
            stored,
          ))
        ) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Nome ou senha incorretos.",
          });
        }

        const token = createParticipantSession(
          resolvedName,
          member.sessionVersion ?? 1,
        );

        ctx.res.cookie(
          PARTICIPANT_COOKIE,
          token,
          {
            ...getSessionCookieOptions(ctx.req),
            maxAge: 1000 * 60 * 60 * 12,
          },
        );

        clearXifadoCookie(
          ctx,
          MASTER_COOKIE,
        );

        return {
          role: "participant",
          name: resolvedName,
        } as const;
      }),

    // ============================================================
    // LOGIN ANTIGO
    // Mantido para compatibilidade
    // ============================================================

    participantLogin: publicProcedure
      .input(
        z.object({
          name: z.string().min(1).max(80),
          password: z.string().min(1).max(128),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        try {
          await assertRateLimit(
            `participant-login:${requestKey(ctx.req as never)}`,
            10,
            60_000,
          );
        } catch {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message:
              "Muitas tentativas. Aguarde um minuto.",
          });
        }

        const data = await getXifadoState();

        const name = normalizeName(input.name);

        const resolvedName =
          Object.keys(data.members).find(
            (key) =>
              normalizeName(key).toLowerCase() ===
              name.toLowerCase(),
          ) ?? name;

        const stored =
          (await getCredentialHash(resolvedName)) ??
          data.credentials[resolvedName];

        const member = data.members[resolvedName];

        if (
          !stored ||
          !member ||
          member.active === false ||
          !(await verifyParticipantPassword(
            input.password,
            stored,
          ))
        ) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message:
              "Nome ou senha de participante incorretos.",
          });
        }

        const token = createParticipantSession(
          resolvedName,
          member.sessionVersion ?? 1,
        );

        ctx.res.cookie(
          PARTICIPANT_COOKIE,
          token,
          {
            ...getSessionCookieOptions(ctx.req),
            maxAge: 1000 * 60 * 60 * 12,
          },
        );

        clearXifadoCookie(
          ctx,
          MASTER_COOKIE,
        );

        return {
          name: resolvedName,
        } as const;
      }),

    // ============================================================
    // LOGOUT PARTICIPANTE
    // ============================================================

    participantLogout: publicProcedure.mutation(
      ({ ctx }) => {
        clearXifadoCookie(
          ctx,
          PARTICIPANT_COOKIE,
        );

        return {
          success: true,
        } as const;
      },
    ),

    // ============================================================
    // DECLARAR PERDA
    // ============================================================

    declareLossSession: publicProcedure
      .input(
        z.object({
          timestamp: z.number().int(),
          reason: z.string().max(500).optional(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const session =
          await requireParticipantSession(ctx);

        const updated =
          await mutateXifadoState((data) => {
            const current =
              data.members[session.name];

            if (
              !current ||
              current.eliminated ||
              current.active === false
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Este participante já está eliminado.",
              });
            }

            const { start, now } =
              assertActiveCycle(data);

            if (
              input.timestamp < start ||
              input.timestamp > now + 1000
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "O horário informado está fora do período permitido.",
              });
            }

            const reason =
              input.reason?.trim() ?? "";

            data.members[session.name] = {
              ...current,
              eliminated: true,
              timestamp: input.timestamp,
              reason,
              rank: null,
              duration: null,
              lossHistory: [
                ...(current.lossHistory ?? []),
                {
                  occurredAt: input.timestamp,
                  recordedAt:
                    new Date().toISOString(),
                  reason,
                  status: "LOSS_DECLARED",
                },
              ],
            };

            return data;
          });

        return publicState(updated);
      }),

    // ============================================================
    // PRENDA DO PARTICIPANTE
    // ============================================================

    togglePenaltyCompletion: publicProcedure
      .input(
        z.object({
          penaltyId: z.string().min(1),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const session =
          await requireParticipantSession(ctx);

        const updated =
          await mutateXifadoState((data) => {
            const member =
              data.members[session.name];

            if (
              !member ||
              member.active === false
            ) {
              throw new TRPCError({
                code: "UNAUTHORIZED",
                message:
                  "Participante não está ativo.",
              });
            }

            const penalty =
              data.penalties.find(
                (item) =>
                  item.id === input.penaltyId,
              );

            if (
              !penalty ||
              !penalty.visible
            ) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message:
                  "Prenda não encontrada.",
              });
            }

            penalty.completedBy[session.name] =
              !penalty.completedBy[session.name];

            return data;
          });

        return publicState(updated);
      }),

    // ============================================================
    // ÁREA MESTRE
    // ============================================================

    master: router({
      // ==========================================================
      // LOGIN MESTRE ANTIGO
      // ==========================================================

      verify: publicProcedure
        .input(
          z.object({
            username: z.string().min(1).max(40),
            masterCode: z.string().min(1).max(128),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          try {
            await assertRateLimit(
              `master-login:${requestKey(ctx.req as never)}`,
              5,
              5 * 60_000,
            );
          } catch {
            throw new TRPCError({
              code: "TOO_MANY_REQUESTS",
              message:
                "Muitas tentativas. Aguarde alguns minutos.",
            });
          }

          if (
            input.username.trim().toLowerCase() !==
            "mestre"
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "Nome de acesso mestre incorreto.",
            });
          }

          if (
            !ENV.xifadoMasterCode ||
            input.masterCode !==
              ENV.xifadoMasterCode
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "Senha mestre incorreta.",
            });
          }

          const token =
            createMasterSession();

          ctx.res.cookie(
            MASTER_COOKIE,
            token,
            {
              ...getSessionCookieOptions(ctx.req),
              maxAge:
                1000 * 60 * 60 * 12,
            },
          );

          clearXifadoCookie(
            ctx,
            PARTICIPANT_COOKIE,
          );

          return {
            success: true,
          } as const;
        }),

      // ==========================================================
      // LOGOUT MESTRE
      // ==========================================================

      logout: publicProcedure.mutation(
        ({ ctx }) => {
          clearXifadoCookie(
            ctx,
            MASTER_COOKIE,
          );

          return {
            success: true,
          } as const;
        },
      ),

      // ==========================================================
      // ADICIONAR / REATIVAR PARTICIPANTE
      // ==========================================================

      addMember: publicProcedure
        .input(
          z.object({
            name: z.string().min(2).max(80),
            password: z
              .string()
              .regex(/^[A-Za-z0-9]{4,12}$/),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          requireMasterSession(ctx);

          const data =
            await getXifadoState();

          const name =
            normalizeName(input.name);

          const code =
            input.password.toUpperCase();

          const existing =
            data.members[name];

          // ------------------------------------------------------
          // REATIVAR USUÁRIO REMOVIDO
          //
          // O cadastro antigo continua existindo.
          // A senha antiga continua disponível no banco/estado.
          // O mestre pode informar a MESMA senha novamente.
          // ------------------------------------------------------

          if (
            existing &&
            existing.active === false
          ) {
            const ownHash =
              (await getCredentialHash(name)) ??
              data.credentials[name];

            if (!ownHash) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Esse participante foi removido, mas sua senha não foi encontrada. Cadastre uma nova senha.",
              });
            }

            const allHashes =
              await listCredentialHashes();

            let duplicatePassword = false;

            for (const stored of allHashes) {
              // É a própria senha do participante.
              // Portanto, ela pode ser reutilizada.
              if (
                stored === ownHash
              ) {
                continue;
              }

              if (
                await verifyParticipantPassword(
                  code,
                  stored,
                )
              ) {
                duplicatePassword = true;
                break;
              }
            }

            if (duplicatePassword) {
              throw new TRPCError({
                code: "CONFLICT",
                message:
                  "Essa senha já está cadastrada para outro participante.",
              });
            }

            data.members[name] = {
              ...existing,
              eliminated: false,
              timestamp: null,
              reason: "",
              rank: null,
              duration: null,
              active: true,
              removedAt: null,
              removedBy: null,
              sessionVersion:
                (existing.sessionVersion ?? 1) +
                1,
              lossHistory:
                existing.lossHistory ?? [],
            };

            // Regrava a senha informada.
            // Se for a mesma senha antiga, o resultado continua
            // sendo válido, apenas com um novo hash/salt.
            const passwordHash =
              await hashParticipantPassword(
                code,
              );

            data.credentials[name] =
              passwordHash;

            await upsertCredentialHash(
              name,
              passwordHash,
            );

            await mutateXifadoState(
              () => data,
            );

            return publicState(data);
          }

          // ------------------------------------------------------
          // PARTICIPANTE JÁ ATIVO
          // ------------------------------------------------------

          if (existing) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "Nome já cadastrado.",
            });
          }

          // ------------------------------------------------------
          // LIMITE
          // ------------------------------------------------------

          const activeCount =
            Object.values(data.members)
              .filter(
                (member) =>
                  member.active !== false,
              )
              .length;

          if (activeCount >= 100) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Limite de participantes atingido.",
            });
          }

          // ------------------------------------------------------
          // SENHA DUPLICADA
          // ------------------------------------------------------

          const dbHashes =
            await listCredentialHashes();

          const allHashes = [
            ...dbHashes,
            ...Object.values(
              data.credentials,
            ),
          ];

          const duplicatePassword =
            (
              await Promise.all(
                allHashes.map(
                  (stored) =>
                    verifyParticipantPassword(
                      code,
                      stored,
                    ),
                ),
              )
            ).some(Boolean);

          if (duplicatePassword) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "Nome ou senha já cadastrados.",
            });
          }

          // ------------------------------------------------------
          // CRIAR NOVO PARTICIPANTE
          // ------------------------------------------------------

          data.members[name] = {
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

          const passwordHash =
            await hashParticipantPassword(
              code,
            );

          data.credentials[name] =
            passwordHash;

          await upsertCredentialHash(
            name,
            passwordHash,
          );

          await mutateXifadoState(
            () => data,
          );

          return publicState(data);
        }),

      // ==========================================================
      // REMOVER PARTICIPANTE
      //
      // IMPORTANTE:
      // NÃO apaga o participante.
      // NÃO apaga a credencial.
      // Apenas marca active = false.
      //
      // Assim, "Adicionar participante" poderá encontrar
      // esse mesmo cadastro e reativá-lo depois.
      // ==========================================================

      removeMember: publicProcedure
        .input(
          z.object({
            name: z.string().min(1),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          requireMasterSession(ctx);

          const data =
            await getXifadoState();

          const name =
            normalizeName(input.name);

          const member =
            data.members[name];

          if (!member) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message:
                "Participante não encontrado.",
            });
          }

          const activeMembers =
            Object.values(data.members)
              .filter(
                (item) =>
                  item.active !== false,
              );

          if (
            member.active !== false &&
            activeMembers.length <= 1
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "O pelotão precisa ter pelo menos um participante.",
            });
          }

          // ======================================================
          // NÃO APAGAR:
          //
          // delete data.members[name]
          // delete data.credentials[name]
          // deleteCredential(name)
          //
          // O cadastro e a senha precisam continuar existindo
          // para permitir a reativação posterior.
          // ======================================================

          data.members[name] = {
            ...member,
            active: false,
            removedAt:
              new Date().toISOString(),
            removedBy: "mestre",
            sessionVersion:
              (member.sessionVersion ?? 1) +
              1,
          };

          // Remove somente as marcações das prendas.
          for (const penalty of data.penalties) {
            delete penalty.completedBy[name];
          }

          await mutateXifadoState(
            () => data,
          );

          return publicState(data);
        }),

      // ==========================================================
      // REATIVAR PARTICIPANTE
      //
      // Funciona para registros antigos/inativos.
      // Não altera a senha.
      // ==========================================================

      revive: publicProcedure
        .input(
          z.object({
            name: z.string().min(1),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          requireMasterSession(ctx);

          const data =
            await getXifadoState();

          const name =
            normalizeName(input.name);

          const current =
            data.members[name];

          if (!current) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message:
                "Participante não encontrado.",
            });
          }

          const history =
            current.timestamp
              ? [
                  ...(current.lossHistory ??
                    []),
                  {
                    occurredAt:
                      current.timestamp,
                    recordedAt:
                      new Date().toISOString(),
                    reason:
                      current.reason,
                    status:
                      "REVIVED" as const,
                  },
                ]
              : current.lossHistory ?? [];

          data.members[name] = {
            ...current,
            eliminated: false,
            timestamp: null,
            reason: "",
            rank: null,
            duration: null,
            active: true,
            removedAt: null,
            removedBy: null,
            sessionVersion:
              (current.sessionVersion ?? 1) +
              1,
            lossHistory: history,
          };

          await mutateXifadoState(
            () => data,
          );

          return publicState(data);
        }),

      // ==========================================================
      // AGENDA
      // ==========================================================

      setSchedule: publicProcedure
        .input(
          z.object({
            start: z.string().datetime(),
            end: z.string().datetime(),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          requireMasterSession(ctx);

          if (
            Date.parse(input.end) <=
            Date.parse(input.start)
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Agenda inválida.",
            });
          }

          const data =
            await getXifadoState();

          data.schedule = {
            start: input.start,
            end: input.end,
          };

          await mutateXifadoState(
            () => data,
          );

          return publicState(data);
        }),

      // ==========================================================
      // PRENDAS
      // ==========================================================

      addPenalty: publicProcedure
        .input(
          z.object({
            text: z
              .string()
              .min(3)
              .max(500),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          requireMasterSession(ctx);

          const data =
            await getXifadoState();

          if (
            data.penalties.length >= 100
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Limite de prendas atingido.",
            });
          }

          data.penalties.push({
            id: `penalty-${randomUUID()}`,
            text: input.text.trim(),
            visible: true,
            completedBy:
              Object.fromEntries(
                Object.keys(data.members)
                  .filter(
                    (name) =>
                      data.members[name]
                        .active !== false,
                  )
                  .map((name) => [
                    name,
                    false,
                  ]),
              ),
          });

          await mutateXifadoState(
            () => data,
          );

          return publicState(data);
        }),

      editPenalty: publicProcedure
        .input(
          z.object({
            id: z.string(),
            text: z
              .string()
              .min(3)
              .max(500),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          requireMasterSession(ctx);

          const data =
            await getXifadoState();

          const item =
            data.penalties.find(
              (penalty) =>
                penalty.id === input.id,
            );

          if (!item) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message:
                "Prenda não encontrada.",
            });
          }

          item.text =
            input.text.trim();

          await mutateXifadoState(
            () => data,
          );

          return publicState(data);
        }),

      togglePenalty: publicProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          requireMasterSession(ctx);

          const data =
            await getXifadoState();

          const item =
            data.penalties.find(
              (penalty) =>
                penalty.id === input.id,
            );

          if (!item) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message:
                "Prenda não encontrada.",
            });
          }

          item.visible =
            !item.visible;

          await mutateXifadoState(
            () => data,
          );

          return publicState(data);
        }),

      removePenalty: publicProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          requireMasterSession(ctx);

          const data =
            await getXifadoState();

          const item =
            data.penalties.find(
              (penalty) =>
                penalty.id === input.id,
            );

          if (!item) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message:
                "Prenda não encontrada.",
            });
          }

          item.visible = false;

          await mutateXifadoState(
            () => data,
          );

          return publicState(data);
        }),

      // ==========================================================
      // REGRAS
      // ==========================================================

      addRule: publicProcedure
        .input(
          z.object({
            text: z
              .string()
              .min(3)
              .max(500),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          requireMasterSession(ctx);

          const data =
            await getXifadoState();

          if (
            data.rules.length >= 100
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Limite de regras atingido.",
            });
          }

          data.rules.push({
            id: `rule-${randomUUID()}`,
            text: input.text.trim(),
            visible: true,
          });

          await mutateXifadoState(
            () => data,
          );

          return publicState(data);
        }),

      editRule: publicProcedure
        .input(
          z.object({
            id: z.string(),
            text: z
              .string()
              .min(3)
              .max(500),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          requireMasterSession(ctx);

          const data =
            await getXifadoState();

          const item =
            data.rules.find(
              (rule) =>
                rule.id === input.id,
            );

          if (!item) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message:
                "Regra não encontrada.",
            });
          }

          item.text =
            input.text.trim();

          await mutateXifadoState(
            () => data,
          );

          return publicState(data);
        }),

      toggleRule: publicProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          requireMasterSession(ctx);

          const data =
            await getXifadoState();

          const item =
            data.rules.find(
              (rule) =>
                rule.id === input.id,
            );

          if (!item) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message:
                "Regra não encontrada.",
            });
          }

          item.visible =
            !item.visible;

          await mutateXifadoState(
            () => data,
          );

          return publicState(data);
        }),

      removeRule: publicProcedure
        .input(
          z.object({
            id: z.string(),
          }),
        )
        .mutation(async ({ input, ctx }) => {
          requireMasterSession(ctx);

          const data =
            await getXifadoState();

          const item =
            data.rules.find(
              (rule) =>
                rule.id === input.id,
            );

          if (!item) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message:
                "Regra não encontrada.",
            });
          }

          item.visible = false;

          await mutateXifadoState(
            () => data,
          );

          return publicState(data);
        }),

      // ==========================================================
      // SUBSTITUIR ESTADO
      // ==========================================================

      replaceState: publicProcedure
        .input(
          z.object({
            state: safeStateSchema,
          }),
        )
        .mutation(async ({ input, ctx }) => {
          requireMasterSession(ctx);

          const current =
            await getXifadoState();

          const next: XifadoData = {
            ...input.state,
            credentials:
              current.credentials,
          };

          await saveXifadoState(next);

          return publicState(next);
        }),
    }),
  }),
});

export type AppRouter = typeof appRouter;