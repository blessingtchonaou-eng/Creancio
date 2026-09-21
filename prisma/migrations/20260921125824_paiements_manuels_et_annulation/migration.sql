-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Operateur" ADD VALUE 'ESPECES';
ALTER TYPE "Operateur" ADD VALUE 'VIREMENT';

-- AlterTable
ALTER TABLE "Paiement" ADD COLUMN     "annuleLe" TIMESTAMP(3),
ADD COLUMN     "annuleParId" TEXT,
ADD COLUMN     "manuel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "motifAnnulation" TEXT,
ADD COLUMN     "reference" TEXT;

-- CreateIndex
CREATE INDEX "Paiement_annuleParId_idx" ON "Paiement"("annuleParId");

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_annuleParId_fkey" FOREIGN KEY ("annuleParId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
