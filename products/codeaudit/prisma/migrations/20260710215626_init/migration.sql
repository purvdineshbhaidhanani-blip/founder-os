-- CreateEnum
CREATE TYPE "repo_visibility" AS ENUM ('private', 'public');

-- CreateEnum
CREATE TYPE "scan_status" AS ENUM ('running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "finding_category" AS ENUM ('vulnerability', 'secret', 'quality', 'dependency');

-- CreateEnum
CREATE TYPE "finding_severity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "finding_status" AS ENUM ('open', 'fixed', 'false_positive', 'wont_fix');

-- CreateTable
CREATE TABLE "repositories" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "default_branch" TEXT NOT NULL DEFAULT 'main',
    "visibility" "repo_visibility" NOT NULL DEFAULT 'private',
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scans" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "status" "scan_status" NOT NULL DEFAULT 'running',
    "triggered_by_user_id" TEXT NOT NULL,
    "files_scanned" INTEGER NOT NULL DEFAULT 0,
    "health_score" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "scan_id" TEXT NOT NULL,
    "repository_id" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "rule_id" TEXT NOT NULL,
    "category" "finding_category" NOT NULL,
    "severity" "finding_severity" NOT NULL,
    "cwe" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "status" "finding_status" NOT NULL DEFAULT 'open',
    "effort_minutes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fix_suggestions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "finding_id" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "suggested_patch" TEXT NOT NULL,
    "risk_score" INTEGER NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fix_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "repositories_organization_id_idx" ON "repositories"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_repositories_org_name" ON "repositories"("organization_id", "name");

-- CreateIndex
CREATE INDEX "scans_organization_id_repository_id_idx" ON "scans"("organization_id", "repository_id");

-- CreateIndex
CREATE INDEX "scans_organization_id_started_at_idx" ON "scans"("organization_id", "started_at");

-- CreateIndex
CREATE INDEX "findings_organization_id_status_idx" ON "findings"("organization_id", "status");

-- CreateIndex
CREATE INDEX "findings_organization_id_scan_id_idx" ON "findings"("organization_id", "scan_id");

-- CreateIndex
CREATE INDEX "findings_organization_id_severity_idx" ON "findings"("organization_id", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "uq_fix_suggestions_finding_id" ON "fix_suggestions"("finding_id");

-- CreateIndex
CREATE INDEX "fix_suggestions_organization_id_idx" ON "fix_suggestions"("organization_id");

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fix_suggestions" ADD CONSTRAINT "fix_suggestions_finding_id_fkey" FOREIGN KEY ("finding_id") REFERENCES "findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
