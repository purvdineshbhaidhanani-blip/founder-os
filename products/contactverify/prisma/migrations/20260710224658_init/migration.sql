-- CreateEnum
CREATE TYPE "verification_status" AS ENUM ('valid', 'invalid', 'risky', 'unchecked');

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
    "email_status" "verification_status" NOT NULL DEFAULT 'unchecked',
    "phone_status" "verification_status" NOT NULL DEFAULT 'unchecked',
    "health_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_health_profiles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "lead_quality" TEXT NOT NULL,
    "missing_fields" TEXT[],
    "suggested_enrichment" TEXT[],
    "confidence_score" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_health_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contacts_organization_id_idx" ON "contacts"("organization_id");

-- CreateIndex
CREATE INDEX "contacts_organization_id_normalized_email_idx" ON "contacts"("organization_id", "normalized_email");

-- CreateIndex
CREATE INDEX "contacts_organization_id_normalized_phone_idx" ON "contacts"("organization_id", "normalized_phone");

-- CreateIndex
CREATE UNIQUE INDEX "uq_contact_health_profiles_contact_id" ON "contact_health_profiles"("contact_id");

-- CreateIndex
CREATE INDEX "contact_health_profiles_organization_id_idx" ON "contact_health_profiles"("organization_id");

-- AddForeignKey
ALTER TABLE "contact_health_profiles" ADD CONSTRAINT "contact_health_profiles_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
