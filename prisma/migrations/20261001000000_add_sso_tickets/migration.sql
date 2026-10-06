CREATE TABLE "sso_tickets" (
  "id" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "encrypted_payload" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_id" TEXT NOT NULL,

  CONSTRAINT "sso_tickets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sso_tickets_token_hash_key" ON "sso_tickets"("token_hash");
CREATE INDEX "sso_tickets_expires_at_idx" ON "sso_tickets"("expires_at");
CREATE INDEX "sso_tickets_user_id_expires_at_idx" ON "sso_tickets"("user_id", "expires_at");

ALTER TABLE "sso_tickets"
  ADD CONSTRAINT "sso_tickets_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
