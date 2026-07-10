-- CreateEnum
CREATE TYPE "service_status" AS ENUM ('healthy', 'degraded', 'down');

-- CreateEnum
CREATE TYPE "alert_severity" AS ENUM ('info', 'warning', 'critical');

-- CreateEnum
CREATE TYPE "incident_status" AS ENUM ('open', 'investigating', 'resolved');

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "service_status" NOT NULL DEFAULT 'healthy',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "incident_id" TEXT,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "alert_severity" NOT NULL DEFAULT 'warning',
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "incident_status" NOT NULL DEFAULT 'open',
    "severity" "alert_severity" NOT NULL DEFAULT 'warning',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "root_cause_analyses" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "culprit_service" TEXT NOT NULL,
    "suggested_fix" TEXT NOT NULL,
    "estimated_recovery_minutes" INTEGER NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "root_cause_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "services_organization_id_idx" ON "services"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_services_org_name" ON "services"("organization_id", "name");

-- CreateIndex
CREATE INDEX "alerts_organization_id_service_id_occurred_at_idx" ON "alerts"("organization_id", "service_id", "occurred_at");

-- CreateIndex
CREATE INDEX "alerts_organization_id_incident_id_idx" ON "alerts"("organization_id", "incident_id");

-- CreateIndex
CREATE INDEX "incidents_organization_id_status_idx" ON "incidents"("organization_id", "status");

-- CreateIndex
CREATE INDEX "incidents_organization_id_started_at_idx" ON "incidents"("organization_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_root_cause_analyses_incident_id" ON "root_cause_analyses"("incident_id");

-- CreateIndex
CREATE INDEX "root_cause_analyses_organization_id_idx" ON "root_cause_analyses"("organization_id");

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "root_cause_analyses" ADD CONSTRAINT "root_cause_analyses_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
