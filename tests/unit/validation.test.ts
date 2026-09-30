import { describe, expect, it } from "vitest";
import {
  accessSchema,
  emailSchema,
  isSafeSystemUrl,
  passwordSchema,
  systemSchema,
} from "@/lib/validation";
describe("input and redirect safety", () => {
  it.each([
    "javascript:alert(1)",
    "http://example.com",
    "https://user:pass@example.com",
    "https://example.com?token=secret",
    "https://example.com#token",
    "//example.com",
  ])("rejects unsafe destination %s", (value) => {
    expect(isSafeSystemUrl(value)).toBe(false);
  });
  it("accepts an HTTPS application path", () => {
    expect(isSafeSystemUrl("https://example.com/app/login")).toBe(true);
  });
  it("normalizes identities without merging external accounts", () => {
    expect(emailSchema.parse("  PERSON@EXAMPLE.COM ")).toBe("person@example.com");
    const access = accessSchema.parse({
      userId: "central",
      systemId: "system",
      role: "VIDEO_PRODUCER",
      enabled: true,
      externalUserId: "legacy-32",
      externalUserEmail: "other@example.com",
      externalDisplayName: "Pessoa externa",
      externalProvider: "legacy",
      externalIssuer: "https://issuer.example",
      externalSubject: "subject-123",
      status: "ACTIVE",
    });
    expect(access.role).toBe("VIDEO_PRODUCER");
    expect(access.externalUserEmail).toBe("other@example.com");
    expect(access.externalSubject).toBe("subject-123");
  });
  it("rejects passwords truncated by bcrypt and short passwords", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("é".repeat(37)).success).toBe(false);
    expect(passwordSchema.safeParse("a".repeat(72)).success).toBe(true);
  });
  it("does not allow ONLINE without a URL", () => {
    expect(
      systemSchema.safeParse({
        name: "System",
        slug: "system",
        description: "Description",
        url: "",
        icon: "grid",
        status: "ONLINE",
      }).success,
    ).toBe(false);
  });
});
