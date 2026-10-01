import assert from "node:assert/strict";

const baseUrl = process.env.API_URL ?? "http://127.0.0.1:4000";
const adminId = "1aa040f0-3275-4a28-9aff-35a7fb811590";
const regularUserId = "2bb040f0-3275-4a28-9aff-35a7fb811590";
const internalRequisitionId = "22222222-2222-4222-8222-222222222222";
const productSolicitationId = "33333333-3333-4333-8333-333333333333";
const localPassword = "Teste@123456";
type ErrorResponse = { error?: { code?: string } };
type SolicitationList = { items: Array<{ id: string; userId: string; requestType: string }> };

function uploadBody(content: string | Uint8Array, type: string, name: string): FormData {
  const form = new FormData();
  form.set("file", new Blob([content], { type }), name);
  return form;
}

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
  const unauthenticatedStatus = await fetch(`${baseUrl}/solicitations/${internalRequisitionId}/status`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "approved" }),
  });
  assert.equal(unauthenticatedStatus.status, 401);
  const unauthenticatedUpload = await fetch(`${baseUrl}/solicitations/${productSolicitationId}/attachments`, {
    method: "POST",
    body: uploadBody("laboratory attachment", "application/pdf", "unauthenticated.pdf"),
  });
  assert.equal(unauthenticatedUpload.status, 401);

  const adminCookie = await login("teste.central@local.test");
  const regularCookie = await login("solicitante.central@local.test");
  const approverCookie = await login("aprovador.central@local.test");
  const stockCookie = await login("estoque.central@local.test");

  const ownUpload = await fetch(`${baseUrl}/solicitations/11111111-1111-4111-8111-111111111111/attachments`, {
    method: "POST",
    headers: { cookie: regularCookie },
    body: uploadBody("regular owner attachment", "application/pdf", "comprovante local.pdf"),
  });
  assert.equal(ownUpload.status, 201);
  const ownAttachment = (await ownUpload.json()) as { attachment?: { id?: string; originalName?: string; storagePath?: string } };
  assert.ok(ownAttachment.attachment?.id);
  assert.equal(ownAttachment.attachment?.originalName, "comprovante local.pdf");
  assert.equal(ownAttachment.attachment?.storagePath, undefined);

  const forbiddenUpload = await fetch(`${baseUrl}/solicitations/${productSolicitationId}/attachments`, {
    method: "POST",
    headers: { cookie: regularCookie },
    body: uploadBody("forbidden", "application/pdf", "forbidden.pdf"),
  });
  assert.equal(forbiddenUpload.status, 403);

  const adminUpload = await fetch(`${baseUrl}/solicitations/${productSolicitationId}/attachments`, {
    method: "POST",
    headers: { cookie: adminCookie },
    body: uploadBody("admin attachment", "application/pdf", "admin.pdf"),
  });
  assert.equal(adminUpload.status, 201);
  const adminAttachment = (await adminUpload.json()) as { attachment?: { id?: string } };
  assert.ok(adminAttachment.attachment?.id);

  const attachmentList = await fetch(`${baseUrl}/solicitations/11111111-1111-4111-8111-111111111111/attachments`, {
    headers: { cookie: regularCookie },
  });
  assert.equal(attachmentList.status, 200);
  const attachmentListBody = (await attachmentList.json()) as { items: Array<{ id: string; storagePath?: string }> };
  assert.ok(attachmentListBody.items.some((item) => item.id === ownAttachment.attachment?.id));
  assert.ok(attachmentListBody.items.every((item) => item.storagePath === undefined));

  const ownDownload = await fetch(`${baseUrl}/attachments/${ownAttachment.attachment?.id}/download`, {
    headers: { cookie: regularCookie },
  });
  assert.equal(ownDownload.status, 200);
  assert.equal(await ownDownload.text(), "regular owner attachment");

  const forbiddenDownload = await fetch(`${baseUrl}/attachments/${adminAttachment.attachment?.id}/download`, {
    headers: { cookie: regularCookie },
  });
  assert.equal(forbiddenDownload.status, 403);

  const invalidUpload = await fetch(`${baseUrl}/solicitations/11111111-1111-4111-8111-111111111111/attachments`, {
    method: "POST",
    headers: { cookie: regularCookie },
    body: uploadBody("invalid file", "text/plain", "invalid.txt"),
  });
  assert.equal(invalidUpload.status, 400);

  const largeUpload = await fetch(`${baseUrl}/solicitations/11111111-1111-4111-8111-111111111111/attachments`, {
    method: "POST",
    headers: { cookie: regularCookie },
    body: uploadBody(new Uint8Array(10 * 1024 * 1024 + 1), "application/pdf", "large.pdf"),
  });
  assert.equal(largeUpload.status, 400);

  const adminDelete = await fetch(`${baseUrl}/attachments/${ownAttachment.attachment?.id}`, {
    method: "DELETE",
    headers: { cookie: adminCookie },
  });
  assert.equal(adminDelete.status, 204);
  const deletedDownload = await fetch(`${baseUrl}/attachments/${ownAttachment.attachment?.id}/download`, {
    headers: { cookie: adminCookie },
  });
  assert.equal(deletedDownload.status, 404);

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

  const regularApproval = await fetch(`${baseUrl}/solicitations/${internalRequisitionId}/approval`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: regularCookie },
    body: JSON.stringify({ decision: "approved" }),
  });
  assert.equal(regularApproval.status, 403);

  const wrongTypeApproval = await fetch(`${baseUrl}/solicitations/${productSolicitationId}/approval`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: approverCookie },
    body: JSON.stringify({ decision: "approved" }),
  });
  assert.equal(wrongTypeApproval.status, 403);

  const stockBeforeApproval = await fetch(`${baseUrl}/solicitations/${internalRequisitionId}/stock`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: stockCookie },
    body: JSON.stringify({ status: "separating" }),
  });
  assert.equal(stockBeforeApproval.status, 403);

  const approval = await fetch(`${baseUrl}/solicitations/${internalRequisitionId}/approval`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: approverCookie },
    body: JSON.stringify({ decision: "approved", comment: "Aprovado no teste local." }),
  });
  assert.equal(approval.status, 200);
  const approvalBody = (await approval.json()) as { solicitation?: { approvalStatus?: string; stockStatus?: string }; statusHistory?: { newStatus?: string } };
  assert.equal(approvalBody.solicitation?.approvalStatus, "approved_released");
  assert.equal(approvalBody.solicitation?.stockStatus, "pending_pickup");
  assert.equal(approvalBody.statusHistory?.newStatus, "approval:approved_released");

  const stockAfterApproval = await fetch(`${baseUrl}/solicitations/${internalRequisitionId}/stock`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: stockCookie },
    body: JSON.stringify({ status: "separating", comment: "Separação iniciada no teste local." }),
  });
  assert.equal(stockAfterApproval.status, 200);
  const stockBody = (await stockAfterApproval.json()) as { solicitation?: { stockStatus?: string }; statusHistory?: { newStatus?: string } };
  assert.equal(stockBody.solicitation?.stockStatus, "separating");
  assert.equal(stockBody.statusHistory?.newStatus, "stock:separating");

  const adminStatus = await fetch(`${baseUrl}/solicitations/${productSolicitationId}/status`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ status: "delivered", comment: "Concluído no teste local." }),
  });
  assert.equal(adminStatus.status, 200);
  const adminStatusBody = (await adminStatus.json()) as { solicitation?: { status?: string }; statusHistory?: { newStatus?: string } };
  assert.equal(adminStatusBody.solicitation?.status, "delivered");
  assert.equal(adminStatusBody.statusHistory?.newStatus, "delivered");

  const invalidStatus = await fetch(`${baseUrl}/solicitations/${productSolicitationId}/status`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: adminCookie },
    body: JSON.stringify({ status: "not_a_status" }),
  });
  assert.equal(invalidStatus.status, 400);

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
