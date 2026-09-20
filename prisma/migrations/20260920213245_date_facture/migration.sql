-- AlterTable
ALTER TABLE "Facture" ADD COLUMN     "dateFacture" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Factures existantes : la date de facture est leur date de création (seule information disponible).
UPDATE "Facture" SET "dateFacture" = "createdAt"::date;
