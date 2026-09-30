import assert from "node:assert/strict";

const baseUrl = process.env.API_URL ?? "http://127.0.0.1:4000";
const adminId = "1aa040f0-3275-4a28-9aff-35a7fb811590";
const regularUserId = "2bb040f0-3275-4a28-9aff-35a7fb811590";
const localPassword = "Teste@123456";
type ErrorResponse = { error?: { code?: string } };
type SolicitationList = { items: Array<{ id: string; userId: string; requestType: string }> };

async function login(email: string): Promise<string> {
  const response = await fetch(`${baseUrl}/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: localPassword }) });
  assert.equal(response.status, 200);
  const cookie = response.headers.getSetCookie().at(0);
  assert.ok(cookie?.includes("HttpOnly"));
  assert.ok(cookie?.includes("SameSite=Lax"));
  const sessionCookie = cookie?.split(";", 1)[0];
  assert.ok(sessionCookie);
  return sessionCookie;
}

async function run(): Promise<void> {
  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true, service: "central-compras-api" });

  const unauthenticated = await fetch(`${baseUrl}/solicitations`);
  assert.equal(unauthenticated.status, 401);
  assert.equal(((await unauthenticated.json()) as ErrorResponse).error?.code, "UNAUTHORIZED");

  const adminCookie = await login("teste.central@local.test");
  const regularCookie = await login("solicitante.central@local.test");
  const approverCookie = await login("aprovador.central@local.test");

  const regularList = await fetch(`${baseUrl}/solicitations`, { headers: { cookie: regularCookie } });
  assert.equal(regularList.status, 200);
  const regularItems = (await regularList.json()) as SolicitationList;
  assert.ok(regularItems.items.length >= 1);
  assert.ok(regularItems.items.every((item) => item.userId === regularUserId));

  const adminList = await fetch(`${baseUrl}/solicitations`, { headers: { cookie: adminCookie } });
  assert.equal(adminList.status, 200);
  const adminItems = (await adminList.json()) as SolicitationList;
  assert.ok(adminItems.items.length >= 3);
  const foreignSolicitation = adminItems.items.find((item) => item.userId !== regularUserId);
  assert.ok(foreignSolicitation);

  const regularForeignDetail = await fetch(`${baseUrl}/solicitations/${foreignSolicitation.id}`, { headers: { cookie: regularCookie } });
  assert.equal(regularForeignDetail.status, 403);
  assert.equal(((await regularForeignDetail.json()) as ErrorResponse).error?.code, "FORBIDDEN");

  const adminForeignDetail = await fetch(`${baseUrl}/solicitations/${foreignSolicitation.id}`, { headers: { cookie: adminCookie } });
  assert.equal(adminForeignDetail.status, 200);

  const approverList = await fetch(`${baseUrl}/solicitations`, { headers: { cookie: approverCookie } });
  assert.equal(approverList.status, 200);
  const approverItems = (await approverList.json()) as SolicitationList;
  assert.ok(approverItems.items.every((item) => item.requestType === "internal_requisition"));

  const invalidPayload = await fetch(`${baseUrl}/solicitations`, { method: "POST", headers: { "content-type": "application/json", cookie: regularCookie }, body: JSON.stringify({ requestType: "", generalDescription: "" }) });
  assert.equal(invalidPayload.status, 400);
  assert.equal(((await invalidPayload.json()) as ErrorResponse).error?.code, "VALIDATION_ERROR");

  const externalUserId = await fetch(`${baseUrl}/solicitations`, { method: "POST", headers: { "content-type": "application/json", cookie: regularCookie }, body: JSON.stringify({ userId: adminId, requestType: "product", generalDescription: "Attempt to set another owner." }) });
  assert.equal(externalUserId.status, 400);

  const created = await fetch(`${baseUrl}/solicitations`, { method: "POST", headers: { "content-type": "application/json", cookie: regularCookie }, body: JSON.stringify({ requestType: "product", generalDescription: "Solicitação criada durante o teste local." }) });
  assert.equal(created.status, 201);
  const createdBody = (await created.json()) as { solicitation?: { userId?: string; status?: string }; statusHistory?: Array<{ newStatus?: string }> };
  assert.equal(createdBody.solicitation?.userId, regularUserId);
  assert.equal(createdBody.solicitation?.status, "pending");
  assert.equal(createdBody.statusHistory?.[0]?.newStatus, "pending");

  const profile = await fetch(`${baseUrl}/profile/me`, { headers: { cookie: regularCookie } });
  assert.equal(profile.status, 200);
  const logout = await fetch(`${baseUrl}/auth/logout`, { method: "POST", headers: { cookie: regularCookie } });
  assert.equal(logout.status, 204);
  const afterLogout = await fetch(`${baseUrl}/solicitations`, { headers: { cookie: regularCookie } });
  assert.equal(afterLogout.status, 401);
  console.info("Local auth, authorization and solicitation flow passed.");
}

run().catch((error: unknown) => {
  console.error("Local auth, authorization and solicitation flow failed.", error);
  process.exitCode = 1;
});
