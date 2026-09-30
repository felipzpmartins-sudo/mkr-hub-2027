import assert from "node:assert/strict";

const baseUrl = process.env.API_URL ?? "http://127.0.0.1:4000";

async function run(): Promise<void> {
  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true, service: "central-compras-api" });

  const protectedWithoutSession = await fetch(`${baseUrl}/debug/protected`);
  assert.equal(protectedWithoutSession.status, 401);
  const unauthenticatedBody = (await protectedWithoutSession.json()) as { error?: { code?: string } };
  assert.equal(unauthenticatedBody.error?.code, "UNAUTHORIZED");

  const login = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "teste.central@local.test",
      password: "Teste@123456",
    }),
  });
  assert.equal(login.status, 200);

  const loginBody = (await login.json()) as { user?: { email?: string; roles?: string[] } };
  assert.equal(loginBody.user?.email, "teste.central@local.test");
  assert.deepEqual(loginBody.user?.roles, ["admin"]);

  const setCookie = login.headers.getSetCookie().at(0);
  assert.ok(setCookie?.includes("HttpOnly"));
  assert.ok(setCookie?.includes("SameSite=Lax"));
  const sessionCookie = setCookie?.split(";", 1)[0];
  assert.ok(sessionCookie);

  const me = await fetch(`${baseUrl}/auth/me`, {
    headers: { cookie: sessionCookie },
  });
  assert.equal(me.status, 200);

  const protectedWithSession = await fetch(`${baseUrl}/debug/protected`, {
    headers: { cookie: sessionCookie },
  });
  assert.equal(protectedWithSession.status, 200);

  const admin = await fetch(`${baseUrl}/debug/admin`, {
    headers: { cookie: sessionCookie },
  });
  assert.equal(admin.status, 200);

  const approver = await fetch(`${baseUrl}/debug/approver`, {
    headers: { cookie: sessionCookie },
  });
  assert.equal(approver.status, 403);
  const approverBody = (await approver.json()) as { error?: { code?: string } };
  assert.equal(approverBody.error?.code, "FORBIDDEN");

  const profile = await fetch(`${baseUrl}/profile/me`, {
    headers: { cookie: sessionCookie },
  });
  assert.equal(profile.status, 200);
  const profileBody = (await profile.json()) as {
    user?: { id?: string; email?: string; profile?: object | null; roles?: string[] };
  };
  assert.equal(profileBody.user?.id, "1aa040f0-3275-4a28-9aff-35a7fb811590");
  assert.equal(profileBody.user?.email, "teste.central@local.test");
  assert.ok(profileBody.user?.profile);
  assert.deepEqual(profileBody.user?.roles, ["admin"]);

  const logout = await fetch(`${baseUrl}/auth/logout`, {
    method: "POST",
    headers: { cookie: sessionCookie },
  });
  assert.equal(logout.status, 204);
  assert.ok(logout.headers.getSetCookie().at(0)?.includes("Max-Age=0"));

  const meAfterLogout = await fetch(`${baseUrl}/debug/protected`, {
    headers: { cookie: sessionCookie },
  });
  assert.equal(meAfterLogout.status, 401);

  console.info("Local auth/authorization flow passed: session, role guards, profile and revoked session.");
}

run().catch((error: unknown) => {
  console.error("Local auth flow failed.", error);
  process.exitCode = 1;
});
