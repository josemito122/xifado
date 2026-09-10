import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";

describe("Xifado master secret", () => {
  it("is available to server-side authorization", () => {
    expect(ENV.xifadoMasterCode).toBeTruthy();
  });
});
