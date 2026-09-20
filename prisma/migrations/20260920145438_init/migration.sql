-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COLLABORATEUR');

-- CreateEnum
CREATE TYPE "StatutFacture" AS ENUM ('A_VENIR', 'ECHUE', 'EN_RELANCE', 'PARTIELLEMENT_PAYEE', 'PAYEE', 'SUSPENDUE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "Operateur" AS ENUM ('FLOOZ', 'MIXX');

-- CreateEnum
CREATE TYPE "Canal" AS ENUM ('WHATSAPP', 'SMS');

-- CreateEnum
CREATE TYPE "StatutRelance" AS ENUM ('PLANIFIEE', 'ENVOYEE', 'LUE', 'ECHEC', 'ANNULEE');

-- CreateTable
CREATE TABLE "Entreprise" (
    "id" TEXT NOT NULL,
    "raisonSociale" TEXT NOT NULL,
    "nif" TEXT,
    "telephone" TEXT,
    "logoUrl" TEXT,
    "signature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entreprise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "entrepriseId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'COLLABORATEUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "entrepriseId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT,
    "relancesEnPause" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL,
    "entrepriseId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scenarioId" TEXT,
    "numero" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "montantPaye" INTEGER NOT NULL DEFAULT 0,
    "echeance" DATE NOT NULL,
    "statut" "StatutFacture" NOT NULL DEFAULT 'A_VENIR',
    "lienPaiement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "montant" INTEGER NOT NULL,
    "operateur" "Operateur" NOT NULL,
    "referenceTx" TEXT NOT NULL,
    "payeLe" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioRelance" (
    "id" TEXT NOT NULL,
    "entrepriseId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "parDefaut" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ScenarioRelance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtapeRelance" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "decalage" INTEGER NOT NULL,
    "titre" TEXT NOT NULL,
    "canal" "Canal" NOT NULL DEFAULT 'WHATSAPP',
    "templateId" TEXT NOT NULL,
    "repliSms" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "EtapeRelance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relance" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "decalage" INTEGER NOT NULL,
    "canal" "Canal" NOT NULL,
    "statut" "StatutRelance" NOT NULL DEFAULT 'PLANIFIEE',
    "prevueLe" TIMESTAMP(3) NOT NULL,
    "envoyeeLe" TIMESTAMP(3),
    "lueLe" TIMESTAMP(3),
    "erreur" TEXT,

    CONSTRAINT "Relance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvenementWebhook" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "traite" BOOLEAN NOT NULL DEFAULT false,
    "recuLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvenementWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE INDEX "Client_entrepriseId_idx" ON "Client"("entrepriseId");

-- CreateIndex
CREATE INDEX "Facture_entrepriseId_statut_idx" ON "Facture"("entrepriseId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_entrepriseId_numero_key" ON "Facture"("entrepriseId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_referenceTx_key" ON "Paiement"("referenceTx");

-- CreateIndex
CREATE INDEX "Relance_statut_prevueLe_idx" ON "Relance"("statut", "prevueLe");

-- CreateIndex
CREATE UNIQUE INDEX "Relance_factureId_decalage_canal_key" ON "Relance"("factureId", "decalage", "canal");

-- CreateIndex
CREATE UNIQUE INDEX "EvenementWebhook_source_reference_key" ON "EvenementWebhook"("source", "reference");

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "ScenarioRelance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioRelance" ADD CONSTRAINT "ScenarioRelance_entrepriseId_fkey" FOREIGN KEY ("entrepriseId") REFERENCES "Entreprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtapeRelance" ADD CONSTRAINT "EtapeRelance_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "ScenarioRelance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relance" ADD CONSTRAINT "Relance_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE CASCADE ON UPDATE CASCADE;
