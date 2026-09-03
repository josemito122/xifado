import { beforeEach, describe, expect, it, vi } from "vitest";
import type { XifadoData } from "@shared/xifado";

const legacyState: XifadoData = {
  version: 1,
  schedule: { start: "2026-01-01T00:00:00-03:00", end: "2026-12-31T23:59:00-03:00" },
  members: { Ana: { eliminated: false, timestamp: null, reason: "", rank: null, duration: null, sessionVersion: 1, active: true, removedAt: null, removedBy: null, lossHistory: [] } },
  credentials: {},
  penalties: [],
  rules: [],
};

const maybeSingle = vi.fn()
  .mockResolvedValueOnce({ data: null, error: { code: "PGRST204", message: "Could not find the 'version' column in the schema cache" } })
  .mockResolvedValueOnce({ data: { payload: legacyState }, error: null });

vi.mock("./supabase", () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })),
    })),
  },
}));

const { getXifadoState } = await import("./db");

describe("Supabase legacy schema compatibility", () => {
  beforeEach(() => maybeSingle.mockClear());

  it("reads the state when the version column is absent from the schema cache", async () => {
    const result = await getXifadoState();
    expect(result.members.Ana.active).toBe(true);
    expect(result.version).toBe(1);
    expect(maybeSingle).toHaveBeenCalledTimes(2);
  });
});
