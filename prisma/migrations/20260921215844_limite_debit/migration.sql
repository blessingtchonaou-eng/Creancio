-- CreateTable
CREATE TABLE "LimiteDebit" (
    "cle" TEXT NOT NULL,
    "compteur" INTEGER NOT NULL,
    "expireLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LimiteDebit_pkey" PRIMARY KEY ("cle")
);

-- CreateIndex
CREATE INDEX "LimiteDebit_expireLe_idx" ON "LimiteDebit"("expireLe");
