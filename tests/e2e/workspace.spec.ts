import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "../../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { resolve } from "node:path";
import { hashPassword } from "../../src/lib/password";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const userEmail = "colaborador@example.test";
const userPassword = process.env.TEST_USER_PASSWORD!;
const artifacts = process.env.TEST_ARTIFACT_DIR!;
async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
test.describe.configure({ mode: "serial" });
test.afterAll(async () => {
  await db.$disconnect();
});

test("login is responsive and anonymous admin access is denied", async ({ page }) => {
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByText("Um único lugar para acessar os sistemas que movem o seu trabalho."),
  ).toBeVisible();
  await page.screenshot({
    path: resolve(artifacts, "login-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: resolve(artifacts, "login-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("admin creates a user, configures systems and links legacy accounts", async ({ page }) => {
  expect(await db.system.count()).toBe(5);
  await login(page, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);
  await expect(page.getByText("Seu workspace está pronto para começar")).toBeVisible();
  await page.goto("/admin/users/new");
  await page.getByLabel("Nome completo").fill("Pessoa Colaboradora");
  await page.getByLabel("E-mail corporativo").fill(userEmail);
  await page.getByLabel("Departamento", { exact: true }).fill("Operações");
  await page.getByLabel("Cargo", { exact: true }).fill("Analista");
  await page.getByLabel("Senha inicial").fill(userPassword);
  await page.getByRole("button", { name: "Criar usuário" }).click();
  await expect(page.getByRole("status")).toContainText("Usuário criado");
  const user = await db.user.findUniqueOrThrow({ where: { email: userEmail } });
  const admin = await db.user.findUniqueOrThrow({ where: { email: process.env.ADMIN_EMAIL } });
  const systems = await db.system.findMany({ orderBy: { createdAt: "asc" } });
  for (const system of systems) {
    await page.goto(`/admin/systems/${system.id}`);
    await page.getByLabel("URL de acesso").fill(`https://example.com/${system.slug}`);
    await page.getByLabel("Status", { exact: true }).selectOption("ONLINE");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByRole("status")).toContainText("Sistema atualizado");
  }
  await page.goto(`/admin/users/${user.id}`);
  const purchase = page.locator("form.access-panel").filter({ hasText: "Central de Compras" });
  await purchase.getByLabel("Acesso habilitado").check();
  await purchase.getByLabel("Perfil no sistema").fill("BUYER");
  await purchase.getByLabel("E-mail da conta externa").fill("conta.antiga@example.test");
  await purchase.getByLabel("ID da conta externa").fill("legacy-32");
  await purchase.getByRole("button", { name: "Salvar permissão" }).click();
  await expect(purchase.getByRole("status")).toContainText("Permissão salva");
  const access = await db.userSystemAccess.findFirstOrThrow({
    where: { userId: user.id, enabled: true },
  });
  expect(access.externalUserId).toBe("legacy-32");
  expect(access.externalUserEmail).toBe("conta.antiga@example.test");
  await page.goto(`/admin/users/${admin.id}`);
  for (const system of systems) {
    const accessForm = page.locator("form.access-panel").filter({ hasText: system.name });
    await accessForm.getByLabel("Acesso habilitado").check();
    await accessForm.getByLabel("Perfil no sistema").fill("ADMIN");
    await accessForm.getByRole("button", { name: "Salvar permissão" }).click();
    await expect(accessForm.getByRole("status")).toContainText("Permissão salva");
  }
  await page.goto("/dashboard");
  await expect(page.locator("article.system-card")).toHaveCount(5);
  await expect(page.getByRole("heading", { name: "Bem-vindo, Workspace.", exact: true })).toBeVisible();
  await page.screenshot({
    path: resolve(artifacts, "dashboard-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.goto("/admin/users?q=Pessoa&status=ACTIVE&department=Opera%C3%A7%C3%B5es");
  await expect(page.getByText(userEmail)).toBeVisible();
  await page.goto("/admin/permissions");
  await expect(page.getByText("BUYER", { exact: true })).toBeVisible();
  await page.screenshot({
    path: resolve(artifacts, "permissions-desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.goto("/admin/logs?action=ACCESS_GRANTED");
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await page.goto("/admin/settings");
  await expect(page.getByText("Preparado para o próximo passo")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");
  await expect(page.locator("article.system-card")).toHaveCount(5);
  await page.screenshot({
    path: resolve(artifacts, "dashboard-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("link", { name: "Permissões", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Permissões", exact: true })).toBeVisible();
});

test("regular user sees only assigned systems, cannot reach admin and access is audited", async ({
  page,
}) => {
  await login(page, userEmail, userPassword);
  await expect(page.locator("article.system-card")).toHaveCount(1);
  await expect(page.locator("article.system-card")).toContainText("Central de Compras");
  await expect(page.getByRole("navigation").getByText("Usuários", { exact: true })).toHaveCount(0);
  for (const path of [
    "/admin/users",
    "/admin/systems/new",
    "/admin/permissions",
    "/admin/logs",
    "/admin/settings",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/forbidden$/);
  }
  await page.goto("/dashboard");
  await page.route("https://example.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<h1>External test system</h1>" }),
  );
  await page.getByRole("button", { name: "Acessar sistema", exact: true }).click();
  await expect(page).toHaveURL("https://example.com/central-de-compras");
  const user = await db.user.findUniqueOrThrow({ where: { email: userEmail } });
  expect(await db.auditLog.count({ where: { userId: user.id, action: "SYSTEM_ACCESSED" } })).toBe(
    1,
  );
  await db.userSystemAccess.updateMany({ where: { userId: user.id }, data: { enabled: false } });
  await page.goto("/dashboard");
  await expect(page.locator("article.system-card")).toHaveCount(0);
  await db.user.update({
    where: { id: user.id },
    data: { status: "INACTIVE", sessionVersion: { increment: 1 } },
  });
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("E-mail", { exact: true }).fill(userEmail);
  await page.getByLabel("Senha", { exact: true }).fill(userPassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator(".notice-error[role=alert]")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("account changes cannot remove the acting admin and password changes revoke sessions", async ({
  page,
}) => {
  await login(page, process.env.ADMIN_EMAIL!, process.env.ADMIN_PASSWORD!);
  const admin = await db.user.findUniqueOrThrow({ where: { email: process.env.ADMIN_EMAIL } });
  await page.goto(`/admin/users/${admin.id}`);
  await page.getByLabel("Status da conta").selectOption("INACTIVE");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.locator(".notice-error[role=alert]")).toContainText("Você não pode desativar");
  await page.goto("/profile");
  await page.getByLabel("Senha atual", { exact: true }).fill(process.env.ADMIN_PASSWORD!);
  await page.getByLabel("Nova senha", { exact: true }).fill(userPassword);
  await page.getByLabel("Confirmar nova senha", { exact: true }).fill(userPassword);
  await page.getByRole("button", { name: "Alterar senha" }).click();
  await expect(page.getByRole("status")).toContainText("Senha alterada");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await login(page, process.env.ADMIN_EMAIL!, userPassword);
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await db.auditLog.count({ where: { action: "LOGOUT", userId: admin.id } })).toBe(1);
});

test("login attempts are limited in PostgreSQL", async ({ request }) => {
  const passwordHash = await hashPassword(userPassword);
  await db.user.create({
    data: { name: "Rate limit test", email: "limited@example.test", passwordHash },
  });
  for (let i = 0; i < 9; i++) {
    const csrfResponse = await request.get("/api/auth/csrf");
    const { csrfToken } = await csrfResponse.json();
    await request.post("/api/auth/callback/credentials", {
      form: {
        csrfToken,
        email: "limited@example.test",
        password: i === 8 ? userPassword : "wrong-password",
      },
      maxRedirects: 0,
    });
  }
  const user = await db.user.findUniqueOrThrow({ where: { email: "limited@example.test" } });
  expect(await db.auditLog.count({ where: { userId: user.id, action: "LOGIN" } })).toBe(0);
  const last = await db.auditLog.findFirstOrThrow({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  expect(last.metadata).toEqual({ reason: "rate_limited" });
});
