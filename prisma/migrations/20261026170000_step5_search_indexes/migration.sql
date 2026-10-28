-- pg_trgm is a trusted PostgreSQL extension and supports indexed ILIKE '%term%'
-- searches used by the document and box screens.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "documents_reference_trgm_idx" ON "documents" USING GIN ("reference" gin_trgm_ops);
CREATE INDEX "documents_titre_trgm_idx" ON "documents" USING GIN ("titre" gin_trgm_ops);
CREATE INDEX "documents_description_trgm_idx" ON "documents" USING GIN ("description" gin_trgm_ops);
CREATE INDEX "boites_code_trgm_idx" ON "boites" USING GIN ("code" gin_trgm_ops);
CREATE INDEX "documents_created_at_idx" ON "documents" ("created_at");
CREATE INDEX "emplacements_zone_lower_idx" ON "emplacements" (LOWER("zone"));
CREATE INDEX "emplacements_rack_lower_idx" ON "emplacements" (LOWER("rack"));
CREATE INDEX "emplacements_niveau_lower_idx" ON "emplacements" (LOWER("niveau"));
