-- CreateEnum
CREATE TYPE "log_source" AS ENUM ('firewall', 'edr', 'iam', 'app', 'dns');

-- CreateEnum
CREATE TYPE "log_severity" AS ENUM ('info', 'low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "alert_status" AS ENUM ('open', 'investigating', 'resolved', 'dismissed');

-- CreateTable
CREATE TABLE "log_events" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "source" "log_source" NOT NULL,
    "event_type" TEXT NOT NULL,
    "severity" "log_severity" NOT NULL DEFAULT 'info',
    "source_ip" TEXT,
    "actor_id" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correlation_rules" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "first_event_type" TEXT NOT NULL,
    "second_event_type" TEXT NOT NULL,
    "correlation_field" TEXT NOT NULL DEFAULT 'sourceIp',
    "window_minutes" INTEGER NOT NULL,
    "severity" "log_severity" NOT NULL DEFAULT 'medium',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "correlation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "rule_id" TEXT,
    "title" TEXT NOT NULL,
    "severity" "log_severity" NOT NULL DEFAULT 'medium',
    "status" "alert_status" NOT NULL DEFAULT 'open',
    "correlation_key" TEXT,
    "first_log_event_id" TEXT NOT NULL,
    "second_log_event_id" TEXT NOT NULL,
    "mitre_technique_ids" TEXT[],
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_summaries" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "alert_id" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "root_cause" TEXT NOT NULL,
    "recommended_actions" TEXT[],
    "mitre_technique_ids" TEXT[],
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "log_events_organization_id_occurred_at_idx" ON "log_events"("organization_id", "occurred_at");

-- CreateIndex
CREATE INDEX "log_events_organization_id_event_type_idx" ON "log_events"("organization_id", "event_type");

-- CreateIndex
CREATE INDEX "log_events_organization_id_source_ip_idx" ON "log_events"("organization_id", "source_ip");

-- CreateIndex
CREATE INDEX "correlation_rules_organization_id_is_active_idx" ON "correlation_rules"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "alerts_organization_id_status_idx" ON "alerts"("organization_id", "status");

-- CreateIndex
CREATE INDEX "alerts_organization_id_detected_at_idx" ON "alerts"("organization_id", "detected_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_incident_summaries_alert_id" ON "incident_summaries"("alert_id");

-- CreateIndex
CREATE INDEX "incident_summaries_organization_id_idx" ON "incident_summaries"("organization_id");

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "correlation_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_first_log_event_id_fkey" FOREIGN KEY ("first_log_event_id") REFERENCES "log_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_second_log_event_id_fkey" FOREIGN KEY ("second_log_event_id") REFERENCES "log_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_summaries" ADD CONSTRAINT "incident_summaries_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
