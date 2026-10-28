-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- EnableExtension
CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "public";

-- CreateEnum
CREATE TYPE "statut_document" AS ENUM ('DISPONIBLE', 'SORTI', 'INDISPONIBLE');

-- CreateEnum
CREATE TYPE "type_demande_acces" AS ENUM ('CONSULTATION', 'SORTIE');

-- CreateEnum
CREATE TYPE "statut_demande_acces" AS ENUM ('EN_ATTENTE', 'APPROUVEE', 'REFUSEE', 'EN_COURS', 'RETOURNEE');

-- CreateTable
CREATE TABLE "emplacements" (
    "id" UUID NOT NULL,
    "zone" TEXT NOT NULL,
    "rack" TEXT NOT NULL,
    "niveau" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "emplacements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boites" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "emplacement_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "boites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "statut" "statut_document" NOT NULL DEFAULT 'DISPONIBLE',
    "boite_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demandes_acces" (
    "id" UUID NOT NULL,
    "type" "type_demande_acces" NOT NULL,
    "statut" "statut_demande_acces" NOT NULL DEFAULT 'EN_ATTENTE',
    "motif" TEXT NOT NULL,
    "retour_prevu" TIMESTAMPTZ(3),
    "document_id" UUID NOT NULL,
    "demandeur_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "demandes_acces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mouvements" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "demande_id" UUID NOT NULL,
    "utilisateur_id" UUID NOT NULL,
    "date_sortie" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_retour" TIMESTAMPTZ(3),
    "signature_url" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mouvements_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "mouvements_date_retour_check" CHECK ("date_retour" IS NULL OR "date_retour" >= "date_sortie")
);

-- CreateIndex
CREATE UNIQUE INDEX "emplacements_zone_rack_niveau_key" ON "emplacements"("zone", "rack", "niveau");

-- CreateIndex
CREATE UNIQUE INDEX "boites_code_key" ON "boites"("code");

-- CreateIndex
CREATE INDEX "boites_emplacement_id_idx" ON "boites"("emplacement_id");

-- CreateIndex
CREATE UNIQUE INDEX "documents_reference_key" ON "documents"("reference");

-- CreateIndex
CREATE INDEX "documents_boite_id_idx" ON "documents"("boite_id");

-- CreateIndex
CREATE INDEX "documents_statut_idx" ON "documents"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE INDEX "utilisateurs_actif_idx" ON "utilisateurs"("actif");

-- CreateIndex
CREATE INDEX "demandes_acces_document_id_statut_idx" ON "demandes_acces"("document_id", "statut");

-- CreateIndex
CREATE INDEX "demandes_acces_demandeur_id_statut_idx" ON "demandes_acces"("demandeur_id", "statut");

-- CreateIndex
CREATE INDEX "demandes_acces_statut_retour_prevu_idx" ON "demandes_acces"("statut", "retour_prevu");

-- CreateIndex
CREATE UNIQUE INDEX "demandes_acces_id_document_id_key" ON "demandes_acces"("id", "document_id");

-- CreateIndex
CREATE INDEX "mouvements_document_id_date_sortie_idx" ON "mouvements"("document_id", "date_sortie");

-- CreateIndex
CREATE INDEX "mouvements_utilisateur_id_date_sortie_idx" ON "mouvements"("utilisateur_id", "date_sortie");

-- CreateIndex
CREATE INDEX "mouvements_date_retour_idx" ON "mouvements"("date_retour");

-- CreateIndex
CREATE UNIQUE INDEX "mouvements_demande_id_document_id_key" ON "mouvements"("demande_id", "document_id");

-- A document cannot be handed over to multiple users at the same time.
-- This PostgreSQL partial index is intentionally maintained in SQL because
-- Prisma schema syntax cannot currently represent partial indexes.
CREATE UNIQUE INDEX "mouvements_document_actif_key"
ON "mouvements"("document_id")
WHERE "date_retour" IS NULL;

-- AddForeignKey
ALTER TABLE "boites" ADD CONSTRAINT "boites_emplacement_id_fkey" FOREIGN KEY ("emplacement_id") REFERENCES "emplacements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_boite_id_fkey" FOREIGN KEY ("boite_id") REFERENCES "boites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes_acces" ADD CONSTRAINT "demandes_acces_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes_acces" ADD CONSTRAINT "demandes_acces_demandeur_id_fkey" FOREIGN KEY ("demandeur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements" ADD CONSTRAINT "mouvements_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements" ADD CONSTRAINT "mouvements_demande_id_document_id_fkey" FOREIGN KEY ("demande_id", "document_id") REFERENCES "demandes_acces"("id", "document_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mouvements" ADD CONSTRAINT "mouvements_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
