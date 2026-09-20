-- DropIndex
DROP INDEX "Client_entrepriseId_idx";

-- CreateIndex
CREATE INDEX "Client_entrepriseId_whatsapp_idx" ON "Client"("entrepriseId", "whatsapp");
