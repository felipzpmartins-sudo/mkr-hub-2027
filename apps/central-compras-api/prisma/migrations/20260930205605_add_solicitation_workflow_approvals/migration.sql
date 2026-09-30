-- AlterTable
ALTER TABLE "solicitations" ADD COLUMN     "approved_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "released_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "approvals" (
    "id" UUID NOT NULL,
    "solicitation_id" UUID NOT NULL,
    "approver_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "justification" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approvals_solicitation_id_idx" ON "approvals"("solicitation_id");

-- CreateIndex
CREATE INDEX "approvals_approver_id_idx" ON "approvals"("approver_id");

-- CreateIndex
CREATE UNIQUE INDEX "approvals_solicitation_id_approver_id_key" ON "approvals"("solicitation_id", "approver_id");

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_solicitation_id_fkey" FOREIGN KEY ("solicitation_id") REFERENCES "solicitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
