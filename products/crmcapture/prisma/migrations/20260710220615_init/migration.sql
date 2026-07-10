-- CreateEnum
CREATE TYPE "lead_source" AS ENUM ('web_form', 'email', 'linkedin', 'csv_import', 'manual');

-- CreateEnum
CREATE TYPE "lead_status" AS ENUM ('new', 'contacted', 'qualified', 'converted', 'lost');

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "email" TEXT,
    "normalized_email" TEXT,
    "phone" TEXT,
    "normalized_phone" TEXT,
    "company" TEXT,
    "job_title" TEXT,
    "linkedin_url" TEXT,
    "source" "lead_source" NOT NULL DEFAULT 'manual',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "status" "lead_status" NOT NULL DEFAULT 'new',
    "score" INTEGER NOT NULL DEFAULT 0,
    "source" "lead_source" NOT NULL DEFAULT 'manual',
    "assigned_to_user_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "followup_suggestions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "next_step_suggestion" TEXT NOT NULL,
    "draft_email" TEXT NOT NULL,
    "opportunity_detected" BOOLEAN NOT NULL DEFAULT false,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "followup_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contacts_organization_id_idx" ON "contacts"("organization_id");

-- CreateIndex
CREATE INDEX "contacts_organization_id_normalized_email_idx" ON "contacts"("organization_id", "normalized_email");

-- CreateIndex
CREATE INDEX "contacts_organization_id_normalized_phone_idx" ON "contacts"("organization_id", "normalized_phone");

-- CreateIndex
CREATE INDEX "leads_organization_id_status_idx" ON "leads"("organization_id", "status");

-- CreateIndex
CREATE INDEX "leads_organization_id_assigned_to_user_id_idx" ON "leads"("organization_id", "assigned_to_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_followup_suggestions_lead_id" ON "followup_suggestions"("lead_id");

-- CreateIndex
CREATE INDEX "followup_suggestions_organization_id_idx" ON "followup_suggestions"("organization_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followup_suggestions" ADD CONSTRAINT "followup_suggestions_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
