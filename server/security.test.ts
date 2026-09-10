import { describe, expect, it } from "vitest";
import { hashParticipantPassword, verifyParticipantPassword } from "./security";
import { createParticipantSession, readParticipantSession } from "./participant-session";

describe("Xifado participant security", () => {
  it("hashes and verifies participant passwords without storing plaintext", async () => {
    const hash = await hashParticipantPassword("AB12CD");
    expect(hash).toMatch(/^scrypt\$/);
    expect(hash).not.toContain("AB12CD");
    expect(await verifyParticipantPassword("AB12CD", hash)).toBe(true);
    expect(await verifyParticipantPassword("WRONG1", hash)).toBe(false);
  });

  it("creates an expiring signed participant session", () => {
    const token = createParticipantSession("Expedito", 1);
    expect(readParticipantSession(token)).toMatchObject({ name: "Expedito", sessionVersion: 1 });
    expect(readParticipantSession(`${token}x`)).toBeNull();
  });
});
