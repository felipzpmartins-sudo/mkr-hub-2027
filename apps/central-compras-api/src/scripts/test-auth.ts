import assert from "node:assert/strict";

const baseUrl = process.env.API_URL ?? "http://127.0.0.1:4000";

async function run(): Promise<void> {
  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true, service: "central-compras-api" });

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

  const logout = await fetch(`${baseUrl}/auth/logout`, {
    method: "POST",
    headers: { cookie: sessionCookie },
  });
  assert.equal(logout.status, 204);
  assert.ok(logout.headers.getSetCookie().at(0)?.includes("Max-Age=0"));

  const meAfterLogout = await fetch(`${baseUrl}/auth/me`, {
    headers: { cookie: sessionCookie },
  });
  assert.equal(meAfterLogout.status, 401);

  console.info("Local auth flow passed: health, login, me, logout, revoked session.");
}

run().catch((error: unknown) => {
  console.error("Local auth flow failed.", error);
  process.exitCode = 1;
});
