-- CreateEnum
CREATE TYPE "StatutDemandePilote" AS ENUM ('NOUVELLE', 'CONTACTEE', 'INSCRITE', 'ABANDONNEE', 'SUSPECTE');

-- CreateEnum
CREATE TYPE "FacturesParMois" AS ENUM ('MOINS_DE_20', 'DE_20_A_100', 'PLUS_DE_100');

-- CreateTable
CREATE TABLE "DemandePilote" (
    "id" TEXT NOT NULL,
    "nomEntreprise" TEXT NOT NULL,
    "nomContact" TEXT,
    "whatsapp" TEXT NOT NULL,
    "ville" TEXT NOT NULL DEFAULT 'Lomé',
    "facturesParMois" "FacturesParMois",
    "consentement" BOOLEAN NOT NULL,
    "statut" "StatutDemandePilote" NOT NULL DEFAULT 'NOUVELLE',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandePilote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemandePilote_whatsapp_key" ON "DemandePilote"("whatsapp");

-- CreateIndex
CREATE INDEX "DemandePilote_statut_createdAt_idx" ON "DemandePilote"("statut", "createdAt");
