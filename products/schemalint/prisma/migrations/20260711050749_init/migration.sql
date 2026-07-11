-- CreateTable
CREATE TABLE "database_schemas" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "engine" TEXT NOT NULL,
    "health_score" INTEGER NOT NULL DEFAULT 100,
    "summary" TEXT,
    "copilot_risk_level" TEXT,
    "copilot_recommendations" TEXT[],
    "copilot_generated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "database_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schema_tables" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "schema_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "has_primary_key" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "schema_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schema_columns" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "table_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data_type" TEXT NOT NULL,
    "is_nullable" BOOLEAN NOT NULL DEFAULT true,
    "references_table" TEXT,
    "references_column" TEXT,

    CONSTRAINT "schema_columns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schema_indexes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "table_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "column_names" TEXT[],
    "is_unique" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "schema_indexes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "schema_id" TEXT NOT NULL,
    "table_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "database_schemas_organization_id_idx" ON "database_schemas"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_database_schemas_org_name" ON "database_schemas"("organization_id", "name");

-- CreateIndex
CREATE INDEX "schema_tables_organization_id_idx" ON "schema_tables"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_schema_tables_schema_name" ON "schema_tables"("schema_id", "name");

-- CreateIndex
CREATE INDEX "schema_columns_organization_id_idx" ON "schema_columns"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_schema_columns_table_name" ON "schema_columns"("table_id", "name");

-- CreateIndex
CREATE INDEX "schema_indexes_organization_id_table_id_idx" ON "schema_indexes"("organization_id", "table_id");

-- CreateIndex
CREATE INDEX "findings_organization_id_schema_id_idx" ON "findings"("organization_id", "schema_id");

-- CreateIndex
CREATE INDEX "findings_organization_id_status_idx" ON "findings"("organization_id", "status");

-- AddForeignKey
ALTER TABLE "schema_tables" ADD CONSTRAINT "schema_tables_schema_id_fkey" FOREIGN KEY ("schema_id") REFERENCES "database_schemas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schema_columns" ADD CONSTRAINT "schema_columns_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "schema_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schema_indexes" ADD CONSTRAINT "schema_indexes_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "schema_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_schema_id_fkey" FOREIGN KEY ("schema_id") REFERENCES "database_schemas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "schema_tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
