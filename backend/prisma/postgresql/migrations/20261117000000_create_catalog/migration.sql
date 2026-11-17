-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "catalog_items" (
    "id" VARCHAR(36) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_items_slug_key" ON "catalog_items"("slug");

-- CreateIndex
CREATE INDEX "catalog_items_created_at_id_idx" ON "catalog_items"("created_at" DESC, "id" DESC);
