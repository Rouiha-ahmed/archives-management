-- CreateEnum
CREATE TYPE "etat_retour_document" AS ENUM ('BON', 'ENDOMMAGE', 'PERDU', 'NON_REINTEGRE');

-- AlterTable
ALTER TABLE "demandes_acces" ADD COLUMN     "consultation_completed_at" TIMESTAMPTZ(3),
ADD COLUMN     "consultation_operateur_id" UUID,
ADD COLUMN     "consultation_started_at" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "classification" TEXT,
ADD COLUMN     "confidentiel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "date_document" DATE;

-- AlterTable
ALTER TABLE "mouvements" ADD COLUMN     "boite_retour_id" UUID,
ADD COLUMN     "etat_retour" "etat_retour_document",
ADD COLUMN     "observations_retour" TEXT,
ADD COLUMN     "operateur_sortie_id" UUID,
ADD COLUMN     "retour_confirme_par_id" UUID,
ADD COLUMN     "retour_prevu" TIMESTAMPTZ(3);

ALTER TABLE "demandes_acces" ADD CONSTRAINT "demandes_acces_consultation_dates_check" CHECK (
    "consultation_completed_at" IS NULL OR
    ("consultation_started_at" IS NOT NULL AND "consultation_completed_at" >= "consultation_started_at")
);

-- CreateTable
CREATE TABLE "signatures" (
    "id" UUID NOT NULL,
    "mouvement_id" UUID NOT NULL,
    "signataire_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "signed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signatures_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "signatures_byte_size_check" CHECK ("byte_size" > 0 AND "byte_size" <= 512000),
    CONSTRAINT "signatures_mime_type_check" CHECK ("mime_type" = 'image/png'),
    CONSTRAINT "signatures_checksum_check" CHECK ("checksum" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "signatures_storage_key_check" CHECK ("storage_key" ~ '^signatures/[0-9a-f-]{36}\\.png$')
);

-- CreateIndex
CREATE UNIQUE INDEX "signatures_mouvement_id_key" ON "signatures"("mouvement_id");

-- CreateIndex
CREATE UNIQUE INDEX "signatures_storage_key_key" ON "signatures"("storage_key");

-- CreateIndex
CREATE INDEX "signatures_signataire_id_signed_at_idx" ON "signatures"("signataire_id", "signed_at");

-- CreateIndex
CREATE INDEX "demandes_acces_type_statut_idx" ON "demandes_acces"("type", "statut");

-- CreateIndex
CREATE INDEX "demandes_acces_consultation_operateur_id_idx" ON "demandes_acces"("consultation_operateur_id");

-- CreateIndex
CREATE INDEX "mouvements_retour_prevu_date_retour_idx" ON "mouvements"("retour_prevu", "date_retour");

-- CreateIndex
CREATE INDEX "mouvements_operateur_sortie_id_date_sortie_idx" ON "mouvements"("operateur_sortie_id", "date_sortie");

-- CreateIndex
CREATE INDEX "mouvements_retour_operateur_date_retour_idx" ON "mouvements"("retour_confirme_par_id", "date_retour");

-- CreateIndex
CREATE INDEX "mouvements_boite_retour_id_idx" ON "mouvements"("boite_retour_id");

-- Speeds up confidential-document filtering and classification searches.
CREATE INDEX "documents_confidentiel_statut_idx" ON "documents"("confidentiel", "statut");
CREATE INDEX "documents_classification_idx" ON "documents"("classification");

-- AddForeignKey
ALTER TABLE "demandes_acces" ADD CONSTRAINT "demandes_acces_consultation_operateur_id_fkey" FOREIGN KEY ("consultation_operateur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements" ADD CONSTRAINT "mouvements_operateur_sortie_id_fkey" FOREIGN KEY ("operateur_sortie_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements" ADD CONSTRAINT "mouvements_retour_confirme_par_id_fkey" FOREIGN KEY ("retour_confirme_par_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements" ADD CONSTRAINT "mouvements_boite_retour_id_fkey" FOREIGN KEY ("boite_retour_id") REFERENCES "boites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_mouvement_id_fkey" FOREIGN KEY ("mouvement_id") REFERENCES "mouvements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_signataire_id_fkey" FOREIGN KEY ("signataire_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A finalized handwritten acknowledgment is immutable from the application
-- role. Retention actions require a separately governed DBA operation.
CREATE FUNCTION "prevent_signature_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'signatures are immutable';
END;
$$;

CREATE TRIGGER "signatures_immutable"
BEFORE UPDATE OR DELETE ON "signatures"
FOR EACH ROW
EXECUTE FUNCTION "prevent_signature_mutation"();
