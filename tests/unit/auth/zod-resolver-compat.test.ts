// tests/unit/auth/zod-resolver-compat.test.ts
// Regression: @hookform/resolvers v3 threw zod v4 errors instead of mapping
// them to field errors, so forms silently showed no validation messages.

import { describe, expect, it } from "vitest";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, signUpSchema } from "@/lib/schemas/auth";

const opts = { fields: {}, shouldUseNativeValidation: false } as const;

describe("zodResolver + zod v4", () => {
  it("maps sign-in schema failures to field errors", async () => {
    const result = await zodResolver(signInSchema)(
      { email: "bad", password: "123" },
      undefined,
      opts,
    );
    expect(result.errors.email?.message).toBeTruthy();
    expect(result.errors.password?.message).toBe(
      "Password must be at least 8 characters",
    );
  });

  it("maps sign-up schema failures to field errors", async () => {
    const result = await zodResolver(signUpSchema)(
      { email: "x@sunext.io", password: "longenough", fullName: "" },
      undefined,
      opts,
    );
    expect(result.errors.fullName?.message).toBeTruthy();
    expect(result.errors.email).toBeUndefined();
  });

  it("returns parsed values when input is valid", async () => {
    const result = await zodResolver(signInSchema)(
      { email: "a@sunext.io", password: "12345678" },
      undefined,
      opts,
    );
    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ email: "a@sunext.io", password: "12345678" });
  });
});
