-- CreateEnum
CREATE TYPE "erp_system" AS ENUM ('sap', 'oracle', 'dynamics');

-- CreateEnum
CREATE TYPE "scan_status" AS ENUM ('running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "finding_category" AS ENUM ('sod_violation', 'config_error', 'process_deviation');

-- CreateEnum
CREATE TYPE "finding_severity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "finding_status" AS ENUM ('open', 'resolved', 'accepted_risk');

-- CreateTable
CREATE TABLE "erp_instances" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "erp_system" "erp_system" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "erp_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_assignments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "user_identifier" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_settings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scans" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "status" "scan_status" NOT NULL DEFAULT 'running',
    "triggered_by_user_id" TEXT NOT NULL,
    "compliance_score" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "scan_id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "category" "finding_category" NOT NULL,
    "severity" "finding_severity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "finding_status" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_summaries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "finding_id" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "compliance_impact" TEXT NOT NULL,
    "recommended_fix" TEXT NOT NULL,
    "business_impact" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "erp_instances_organization_id_idx" ON "erp_instances"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_erp_instances_org_name" ON "erp_instances"("organization_id", "name");

-- CreateIndex
CREATE INDEX "role_assignments_organization_id_instance_id_idx" ON "role_assignments"("organization_id", "instance_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_role_assignments_instance_user_permission" ON "role_assignments"("instance_id", "user_identifier", "permission");

-- CreateIndex
CREATE INDEX "config_settings_organization_id_instance_id_idx" ON "config_settings"("organization_id", "instance_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_config_settings_instance_key" ON "config_settings"("instance_id", "key");

-- CreateIndex
CREATE INDEX "scans_organization_id_instance_id_idx" ON "scans"("organization_id", "instance_id");

-- CreateIndex
CREATE INDEX "scans_organization_id_started_at_idx" ON "scans"("organization_id", "started_at");

-- CreateIndex
CREATE INDEX "findings_organization_id_status_idx" ON "findings"("organization_id", "status");

-- CreateIndex
CREATE INDEX "findings_organization_id_scan_id_idx" ON "findings"("organization_id", "scan_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_audit_summaries_finding_id" ON "audit_summaries"("finding_id");

-- CreateIndex
CREATE INDEX "audit_summaries_organization_id_idx" ON "audit_summaries"("organization_id");

-- AddForeignKey
ALTER TABLE "role_assignments" ADD CONSTRAINT "role_assignments_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "erp_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "config_settings" ADD CONSTRAINT "config_settings_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "erp_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "erp_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_summaries" ADD CONSTRAINT "audit_summaries_finding_id_fkey" FOREIGN KEY ("finding_id") REFERENCES "findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
