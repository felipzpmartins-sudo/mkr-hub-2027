-- Pending MKR HUB migration. Versioned only; it has not been applied to any database.
CREATE TYPE "ExternalLinkStatus" AS ENUM ('ACTIVE', 'REVOKED');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_SYSTEM_ACCESS_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_SYSTEM_ACCESS_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_SYSTEM_ACCESS_REVOKED';

ALTER TABLE "user_system_access"
  ADD COLUMN "external_display_name" TEXT,
  ADD COLUMN "external_provider" TEXT,
  ADD COLUMN "external_issuer" TEXT,
  ADD COLUMN "external_subject" TEXT,
  ADD COLUMN "status" "ExternalLinkStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "linked_by" TEXT,
  ADD COLUMN "linked_at" TIMESTAMP(3);

CREATE INDEX "user_system_access_external_provider_external_issuer_external_subject_idx"
  ON "user_system_access"("external_provider", "external_issuer", "external_subject");
CREATE INDEX "user_system_access_linked_by_idx" ON "user_system_access"("linked_by");

ALTER TABLE "user_system_access"
  ADD CONSTRAINT "user_system_access_linked_by_fkey"
  FOREIGN KEY ("linked_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
