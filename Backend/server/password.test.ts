import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./_core/password";

describe("local password hashing", () => {
  it("verifies the correct password without storing it in the encoded hash", () => {
    const password = "temporary-password-for-test";
    const encoded = hashPassword(password);

    expect(encoded).not.toContain(password);
    expect(verifyPassword(password, encoded)).toBe(true);
    expect(verifyPassword("different-password", encoded)).toBe(false);
  });

  it("rejects malformed or unsupported password hashes", () => {
    expect(verifyPassword("password", "plain$password")).toBe(false);
    expect(verifyPassword("password", "scrypt$not-hex$not-hex")).toBe(false);
  });
});
