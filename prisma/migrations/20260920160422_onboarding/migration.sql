-- AlterTable
ALTER TABLE "Entreprise" ADD COLUMN     "etapeOnboarding" INTEGER NOT NULL DEFAULT 2;

-- Les entreprises déjà créées ont déjà commencé à utiliser l'application : onboarding terminé.
UPDATE "Entreprise" SET "etapeOnboarding" = 4;
