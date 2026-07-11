-- CreateTable
CREATE TABLE "transcripts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "source_label" TEXT NOT NULL,
    "estimated_minutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "accuracy_score" INTEGER NOT NULL DEFAULT 100,
    "summary" TEXT,
    "copilot_risk_level" TEXT,
    "copilot_highlighted_risks" TEXT[],
    "copilot_generated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcript_segments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "transcript_id" TEXT NOT NULL,
    "sequence_index" INTEGER NOT NULL,
    "speaker_label" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "transcript_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "transcript_id" TEXT NOT NULL,
    "segment_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "suggested_correction" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transcripts_organization_id_idx" ON "transcripts"("organization_id");

-- CreateIndex
CREATE INDEX "transcripts_organization_id_created_at_idx" ON "transcripts"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "transcript_segments_organization_id_transcript_id_idx" ON "transcript_segments"("organization_id", "transcript_id");

-- CreateIndex
CREATE INDEX "findings_organization_id_transcript_id_idx" ON "findings"("organization_id", "transcript_id");

-- CreateIndex
CREATE INDEX "findings_organization_id_status_idx" ON "findings"("organization_id", "status");

-- AddForeignKey
ALTER TABLE "transcript_segments" ADD CONSTRAINT "transcript_segments_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_transcript_id_fkey" FOREIGN KEY ("transcript_id") REFERENCES "transcripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "transcript_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
