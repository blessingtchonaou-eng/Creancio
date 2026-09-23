-- CreateTable
CREATE TABLE "InvitationPilote" (
    "id" TEXT NOT NULL,
    "demandePiloteId" TEXT NOT NULL,
    "jetonHache" TEXT NOT NULL,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "utiliseLe" TIMESTAMP(3),
    "utiliseParId" TEXT,
    "creeParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationPilote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvitationPilote_jetonHache_key" ON "InvitationPilote"("jetonHache");

-- CreateIndex
CREATE INDEX "InvitationPilote_demandePiloteId_idx" ON "InvitationPilote"("demandePiloteId");

-- CreateIndex
CREATE INDEX "InvitationPilote_expireLe_idx" ON "InvitationPilote"("expireLe");

-- AddForeignKey
ALTER TABLE "InvitationPilote" ADD CONSTRAINT "InvitationPilote_demandePiloteId_fkey" FOREIGN KEY ("demandePiloteId") REFERENCES "DemandePilote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationPilote" ADD CONSTRAINT "InvitationPilote_utiliseParId_fkey" FOREIGN KEY ("utiliseParId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationPilote" ADD CONSTRAINT "InvitationPilote_creeParId_fkey" FOREIGN KEY ("creeParId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
