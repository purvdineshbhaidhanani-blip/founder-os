-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "face_description" TEXT NOT NULL,
    "hair_description" TEXT NOT NULL,
    "outfit_description" TEXT NOT NULL,
    "art_style" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_dna" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "detailed_prompt_template" TEXT NOT NULL,
    "negative_prompt" TEXT NOT NULL,
    "locked_attributes" JSONB NOT NULL,
    "distinguishing_features" TEXT[],
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "character_dna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "requested_by_user_id" TEXT NOT NULL,
    "pose_description" TEXT NOT NULL,
    "scene_description" TEXT,
    "assembled_prompt" TEXT NOT NULL,
    "consistency_score" INTEGER NOT NULL,
    "drift_warnings" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "characters_organization_id_idx" ON "characters"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_characters_org_name" ON "characters"("organization_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_character_dna_character_id" ON "character_dna"("character_id");

-- CreateIndex
CREATE INDEX "character_dna_organization_id_idx" ON "character_dna"("organization_id");

-- CreateIndex
CREATE INDEX "generation_requests_organization_id_character_id_idx" ON "generation_requests"("organization_id", "character_id");

-- CreateIndex
CREATE INDEX "generation_requests_organization_id_created_at_idx" ON "generation_requests"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "character_dna" ADD CONSTRAINT "character_dna_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_requests" ADD CONSTRAINT "generation_requests_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
