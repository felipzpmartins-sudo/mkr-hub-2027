import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), access: vi.fn(), audit: vi.fn() }));
vi.mock("@/services/authorization", () => ({
  requireUser: mocks.requireUser,
  requireAdmin: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: { userSystemAccess: { findUnique: mocks.access }, auditLog: { create: mocks.audit } },
}));
vi.mock("@/lib/request", () => ({ requestIp: async () => null }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { launchSystem } from "@/app/actions/systems";
describe("system access boundary", () => {
  const form = new FormData();
  form.set("systemId", "requested-system");
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({ id: "authenticated-user", hubRole: "ADMIN" });
    mocks.audit.mockResolvedValue({});
  });
  it("denies a crafted system id even for a HUB admin", async () => {
    mocks.access.mockResolvedValue(null);
    await expect(launchSystem(form)).rejects.toThrow("REDIRECT:/forbidden");
    expect(mocks.access).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_systemId: { userId: "authenticated-user", systemId: "requested-system" } },
      }),
    );
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("denies revoked permissions", async () => {
    mocks.access.mockResolvedValue({ enabled: false });
    await expect(launchSystem(form)).rejects.toThrow("REDIRECT:/forbidden");
  });
  it("blocks an unavailable system", async () => {
    mocks.access.mockResolvedValue({ enabled: true, system: { status: "MAINTENANCE" } });
    await expect(launchSystem(form)).rejects.toThrow("REDIRECT:/systems?notice=unavailable");
  });
  it("logs a permitted access before redirecting without adding credentials", async () => {
    mocks.access.mockResolvedValue({
      enabled: true,
      role: "EDITOR",
      system: { id: "requested-system", status: "ONLINE", url: "https://example.com/login" },
    });
    await expect(launchSystem(form)).rejects.toThrow("REDIRECT:https://example.com/login");
    expect(mocks.audit).toHaveBeenCalledWith({
      data: {
        userId: "authenticated-user",
        action: "SYSTEM_ACCESSED",
        target: "requested-system",
        ipAddress: null,
        metadata: { role: "EDITOR", method: "redirect" },
      },
    });
  });
  it("does not redirect when the audit write fails", async () => {
    mocks.access.mockResolvedValue({
      enabled: true,
      role: "USER",
      system: { id: "requested-system", status: "ONLINE", url: "https://example.com" },
    });
    mocks.audit.mockRejectedValue(new Error("audit-unavailable"));
    await expect(launchSystem(form)).rejects.toThrow("audit-unavailable");
  });
});
