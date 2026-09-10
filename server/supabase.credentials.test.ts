import { describe, expect, it } from "vitest";

describe("Supabase server credentials", () => {
  it("can reach the project REST endpoint without exposing the secret", async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(url).toMatch(/^https:\/\//);
    expect(key).toBeTruthy();

    const response = await fetch(`${url}/rest/v1/participantes?select=*&limit=1`, {
      method: "GET",
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key!}`,
      },
    });

    expect(response.status).toBeLessThan(500);
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  }, 15_000);
});
