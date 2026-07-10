-- CreateEnum
CREATE TYPE "subscription_kind" AS ENUM ('saas', 'ai_tool');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('active', 'canceled', 'trial');

-- CreateEnum
CREATE TYPE "subscription_source" AS ENUM ('manual', 'csv_import');

-- CreateEnum
CREATE TYPE "finding_status" AS ENUM ('open', 'dismissed', 'resolved');

-- CreateEnum
CREATE TYPE "waste_finding_type" AS ENUM ('unused', 'underutilized', 'overprovisioned');

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "kind" "subscription_kind" NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "department" TEXT,
    "status" "subscription_status" NOT NULL DEFAULT 'active',
    "source" "subscription_source" NOT NULL DEFAULT 'manual',
    "monthly_cost_cents" INTEGER NOT NULL,
    "billing_cycle" TEXT NOT NULL DEFAULT 'monthly',
    "seats_purchased" INTEGER,
    "seats_active" INTEGER,
    "last_used_at" TIMESTAMP(3),
    "renewal_date" TIMESTAMP(3),
    "contract_notes" TEXT,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duplicate_findings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "estimated_savings_cents" INTEGER NOT NULL,
    "status" "finding_status" NOT NULL DEFAULT 'open',
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "duplicate_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duplicate_finding_subscriptions" (
    "duplicate_finding_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,

    CONSTRAINT "duplicate_finding_subscriptions_pkey" PRIMARY KEY ("duplicate_finding_id","subscription_id")
);

-- CreateTable
CREATE TABLE "waste_findings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "type" "waste_finding_type" NOT NULL,
    "evidence" TEXT NOT NULL,
    "estimated_savings_cents" INTEGER NOT NULL,
    "status" "finding_status" NOT NULL DEFAULT 'open',
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "waste_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_consolidation_recommendations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "vendor_group" TEXT NOT NULL,
    "vendor_names" TEXT[],
    "rationale" TEXT NOT NULL,
    "estimated_savings_cents" INTEGER NOT NULL,
    "status" "finding_status" NOT NULL DEFAULT 'open',
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_consolidation_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_extractions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "source_text" TEXT NOT NULL,
    "vendor_name" TEXT,
    "renewal_date" TIMESTAMP(3),
    "auto_renews" BOOLEAN,
    "notice_period_days" INTEGER,
    "annual_value_cents" INTEGER,
    "key_terms" TEXT[],
    "extracted_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_extractions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "copilot_recommendations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "actions" JSONB NOT NULL,
    "total_impact_cents" INTEGER NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "copilot_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscriptions_organization_id_idx" ON "subscriptions"("organization_id");

-- CreateIndex
CREATE INDEX "subscriptions_organization_id_kind_idx" ON "subscriptions"("organization_id", "kind");

-- CreateIndex
CREATE INDEX "subscriptions_organization_id_renewal_date_idx" ON "subscriptions"("organization_id", "renewal_date");

-- CreateIndex
CREATE INDEX "duplicate_findings_organization_id_status_idx" ON "duplicate_findings"("organization_id", "status");

-- CreateIndex
CREATE INDEX "waste_findings_organization_id_status_idx" ON "waste_findings"("organization_id", "status");

-- CreateIndex
CREATE INDEX "vendor_consolidation_recommendations_organization_id_status_idx" ON "vendor_consolidation_recommendations"("organization_id", "status");

-- CreateIndex
CREATE INDEX "contract_extractions_organization_id_idx" ON "contract_extractions"("organization_id");

-- CreateIndex
CREATE INDEX "copilot_recommendations_organization_id_generated_at_idx" ON "copilot_recommendations"("organization_id", "generated_at");

-- AddForeignKey
ALTER TABLE "duplicate_finding_subscriptions" ADD CONSTRAINT "duplicate_finding_subscriptions_duplicate_finding_id_fkey" FOREIGN KEY ("duplicate_finding_id") REFERENCES "duplicate_findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_finding_subscriptions" ADD CONSTRAINT "duplicate_finding_subscriptions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_findings" ADD CONSTRAINT "waste_findings_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_extractions" ADD CONSTRAINT "contract_extractions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
