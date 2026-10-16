import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  access: vi.fn(),
  accessCreate: vi.fn(),
  accessUpdate: vi.fn(),
  system: vi.fn(),
  audit: vi.fn(),
  auth: vi.fn(),
  createSsoUrl: vi.fn(),
  provision: vi.fn(),
  restore: vi.fn(),
  findWallet: vi.fn(),
  transaction: vi.fn(),
  accessUpsert: vi.fn(),
}));

vi.mock("@/services/authorization", () => ({
  requireUser: mocks.requireUser,
  requireAdmin: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  ensureHubSchema: vi.fn().mockResolvedValue(undefined),
  db: {
    system: { findUnique: mocks.system },
    userSystemAccess: {
      findUnique: mocks.access,
      create: mocks.accessCreate,
      update: mocks.accessUpdate,
    },
    auditLog: { create: mocks.audit },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/services/central-purchases", () => ({
  createCentralPurchasesSsoUrl: mocks.createSsoUrl,
  createCentralMarketingSsoUrl: vi.fn(),
  createMakerWalletSsoUrl: mocks.createSsoUrl,
  createCentralVideoSsoUrl: mocks.createSsoUrl,
  provisionSystemAccount: mocks.provision,
  signInWithStoredSystemSecret: mocks.restore,
  findExistingMakerWalletAccount: mocks.findWallet,
}));
vi.mock("@/lib/request", () => ({ requestIp: async () => null }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { launchSystem, requestMakerWalletAccess } from "@/app/actions/systems";

describe("system catalog launch", () => {
  const form = new FormData();
  form.set("systemId", "requested-system");
  const onlineSystem = {
    id: "requested-system",
    slug: "central-de-videos",
    status: "ONLINE",
    url: "https://video.example.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireUser.mockResolvedValue({
      id: "authenticated-user",
      name: "Pessoa Teste",
      email: "pessoa@example.com",
    });
    mocks.audit.mockResolvedValue({});
    mocks.auth.mockResolvedValue(null);
    mocks.system.mockResolvedValue(onlineSystem);
    mocks.access.mockResolvedValue(null);
    mocks.accessCreate.mockResolvedValue({
      id: "new-access",
      enabled: true,
      status: "ACTIVE",
      externalSubject: "video-user",
      role: "USER",
    });
    mocks.accessUpdate.mockResolvedValue({
      id: "existing-access",
      enabled: true,
      status: "ACTIVE",
      externalSubject: "video-user",
      role: "USER",
    });
    mocks.provision.mockResolvedValue({
      identity: { subject: "video-user", name: "Pessoa Teste", email: "pessoa@example.com" },
      session: { accessToken: "video-token" },
      encryptedSecret: "encrypted-secret",
    });
    mocks.createSsoUrl.mockResolvedValue("https://video.example.com/sso?ticket=opaque");
    mocks.findWallet.mockResolvedValue(null);
    mocks.accessUpsert.mockResolvedValue({ id: "wallet-access" });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        userSystemAccess: {
          upsert: mocks.accessUpsert,
          create: mocks.accessCreate,
          update: mocks.accessUpdate,
        },
        auditLog: { create: mocks.audit },
      }),
    );
  });

  it("does not launch a system id that is not in the catalog", async () => {
    mocks.system.mockResolvedValue(null);
    await expect(launchSystem(form)).rejects.toThrow("REDIRECT:/systems");
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it("blocks an unavailable catalog system", async () => {
    mocks.system.mockResolvedValue({ ...onlineSystem, status: "MAINTENANCE" });
    await expect(launchSystem(form)).rejects.toThrow("REDIRECT:/systems?notice=unavailable");
  });

  it("creates a system account without asking for another login and opens it by SSO", async () => {
    await expect(launchSystem(form)).rejects.toThrow(
      "REDIRECT:https://video.example.com/sso?ticket=opaque",
    );
    expect(mocks.provision).toHaveBeenCalledWith("central-de-videos", {
      id: "authenticated-user",
      name: "Pessoa Teste",
      email: "pessoa@example.com",
    });
    expect(mocks.audit).toHaveBeenLastCalledWith({
      data: {
        userId: "authenticated-user",
        action: "SYSTEM_ACCESSED",
        target: "requested-system",
        ipAddress: null,
        metadata: { role: "USER", method: "sso_ticket" },
      },
    });
  });

  it("does not redirect when the audit write fails", async () => {
    mocks.audit.mockRejectedValue(new Error("audit-unavailable"));
    await expect(launchSystem(form)).rejects.toThrow("audit-unavailable");
  });

  it("uses a one-time SSO handoff for a connected Central de Compras account", async () => {
    mocks.auth.mockResolvedValue({
      user: { centralPurchasesSession: { accessToken: "access", refreshToken: "refresh" } },
    });
    mocks.system.mockResolvedValue({
      ...onlineSystem,
      id: "central",
      slug: "central-de-compras",
      url: "https://central.example.com",
    });
    mocks.access.mockResolvedValue({
      enabled: true,
      status: "ACTIVE",
      externalSubject: "external-user",
      role: "USER",
    });
    mocks.createSsoUrl.mockResolvedValue("https://central.example.com/auth/sso?ticket=opaque");
    await expect(launchSystem(form)).rejects.toThrow(
      "REDIRECT:https://central.example.com/auth/sso?ticket=opaque",
    );
    expect(mocks.createSsoUrl).toHaveBeenCalledWith(
      "authenticated-user",
      "https://central.example.com",
      { accessToken: "access", refreshToken: "refresh" },
    );
  });

  it("keeps an existing Central de Vídeos account connected without asking for its old password", async () => {
    mocks.access.mockResolvedValue({
      enabled: true,
      status: "ACTIVE",
      externalSubject: "external-user",
      role: "USER",
    });
    await expect(launchSystem(form)).rejects.toThrow(
      "REDIRECT:https://video.example.com/sso?ticket=opaque",
    );
    expect(mocks.accessUpdate).toHaveBeenCalled();
  });

  it("renews an approved Maker Wallet SSO session without asking for another password", async () => {
    mocks.system.mockResolvedValue({
      ...onlineSystem,
      slug: "maker-wallet",
      url: "https://wallet.example.com",
    });
    mocks.access.mockResolvedValue({
      id: "wallet-access",
      enabled: true,
      status: "ACTIVE",
      externalSubject: "wallet-user",
      role: "ADMIN",
    });
    mocks.accessUpdate.mockResolvedValue({
      id: "wallet-access",
      enabled: true,
      status: "ACTIVE",
      externalSubject: "wallet-user",
      role: "ADMIN",
    });
    mocks.createSsoUrl.mockResolvedValue("https://wallet.example.com/sso?ticket=opaque");

    await expect(launchSystem(form)).rejects.toThrow(
      "REDIRECT:https://wallet.example.com/sso?ticket=opaque",
    );
    expect(mocks.provision).toHaveBeenCalledWith(
      "maker-wallet",
      { id: "authenticated-user", name: "Pessoa Teste", email: "pessoa@example.com" },
      "ADMIN",
    );
  });

  it("links an existing Maker Wallet account instead of leaving an approval pending", async () => {
    mocks.system.mockResolvedValue({
      ...onlineSystem,
      slug: "maker-wallet",
      url: "https://wallet.example.com",
    });
    mocks.access.mockResolvedValue({
      id: "pending-wallet-access",
      enabled: false,
      status: "ACTIVE",
      externalSubject: null,
      role: "USER",
    });
    mocks.findWallet.mockResolvedValue({
      subject: "existing-wallet-user",
      email: "pessoa@example.com",
      name: "Pessoa Teste",
      role: "USER",
      accessToken: "wallet-token",
    });

    await expect(requestMakerWalletAccess()).rejects.toThrow(
      "REDIRECT:/dashboard?notice=wallet-linked",
    );
    expect(mocks.accessUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          enabled: true,
          externalSubject: "existing-wallet-user",
        }),
      }),
    );
  });
});
