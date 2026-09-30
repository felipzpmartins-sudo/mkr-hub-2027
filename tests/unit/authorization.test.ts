import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), findUnique: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: mocks.findUnique } } }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
import { requireAdmin, requireUser } from "@/services/authorization";
describe("server-side authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "user", sessionVersion: 2 } });
    mocks.findUnique.mockResolvedValue({
      id: "user",
      status: "ACTIVE",
      hubRole: "USER",
      sessionVersion: 2,
    });
  });
  it("denies anonymous access", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });
  it("denies a regular user on an admin operation", async () => {
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/forbidden");
  });
  it("rejects an inactive user even with an existing session", async () => {
    mocks.findUnique.mockResolvedValue({ status: "INACTIVE", sessionVersion: 2 });
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });
  it("rejects a revoked session after password or role changes", async () => {
    mocks.findUnique.mockResolvedValue({ status: "ACTIVE", sessionVersion: 3 });
    await expect(requireUser()).rejects.toThrow("REDIRECT:/login");
  });
  it("allows an active admin", async () => {
    mocks.findUnique.mockResolvedValue({ status: "ACTIVE", hubRole: "ADMIN", sessionVersion: 2 });
    await expect(requireAdmin()).resolves.toMatchObject({ hubRole: "ADMIN" });
  });
});
