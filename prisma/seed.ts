import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, StatutFacture, Operateur } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

export const DEMO_ENTREPRISE_ID = "demo-entreprise";
const AUTRE_ENTREPRISE_ID = "demo-autre-entreprise"; // sert aux tests d'isolation

const DAY = 86_400_000;
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
/** Date à midi UTC, décalée de n jours par rapport à aujourd'hui (colonnes @db.Date). */
const jour = (n: number) => new Date(today.getTime() + n * DAY);

type Ligne = {
  numero: string;
  client: 0 | 1 | 2 | 3 | 4;
  montant: number;
  paye?: number;
  echeance: number; // jours par rapport à aujourd'hui
  emise: number; // jours par rapport à aujourd'hui (négatif)
  statut: StatutFacture;
  payeLe?: number;
};

const CLIENTS = [
  { nom: "Quincaillerie Agbéko", whatsapp: "+22890123456", email: "agbeko@example.com" },
  { nom: "Pharmacie du Port", whatsapp: "+22891234567", email: null },
  { nom: "Hôtel Les Cocotiers", whatsapp: "+22879345678", email: "compta@cocotiers.example.com" },
  { nom: "Garage Kodjo & Fils", whatsapp: "+22892456789", email: null },
  { nom: "Boutique Ama Mode", whatsapp: "+22870567890", email: null },
];

// 15 factures, tous les statuts. Les factures payées ont des délais de paiement différents.
const FACTURES: Ligne[] = [
  { numero: "FA-2026-0001", client: 3, montant: 475_000, paye: 475_000, emise: -70, echeance: -40, statut: "PAYEE", payeLe: -42 },
  { numero: "FA-2026-0002", client: 0, montant: 320_000, paye: 320_000, emise: -55, echeance: -25, statut: "PAYEE", payeLe: -20 },
  { numero: "FA-2026-0003", client: 1, montant: 150_000, paye: 150_000, emise: -40, echeance: -10, statut: "PAYEE", payeLe: -12 },
  { numero: "FA-2026-0004", client: 2, montant: 980_000, paye: 980_000, emise: -30, echeance: -3, statut: "PAYEE", payeLe: -5 },
  { numero: "FA-2026-0005", client: 4, montant: 90_000, paye: 90_000, emise: -12, echeance: 10, statut: "PAYEE", payeLe: -2 },
  { numero: "FA-2026-0006", client: 2, montant: 540_000, paye: 270_000, emise: -35, echeance: -10, statut: "PARTIELLEMENT_PAYEE", payeLe: -4 },
  { numero: "FA-2026-0007", client: 0, montant: 1_250_000, emise: -50, echeance: -23, statut: "EN_RELANCE" },
  { numero: "FA-2026-0008", client: 4, montant: 210_000, emise: -32, echeance: -15, statut: "EN_RELANCE" },
  { numero: "FA-2026-0009", client: 1, montant: 860_000, emise: -28, echeance: -18, statut: "ECHUE" },
  { numero: "FA-2026-0010", client: 3, montant: 690_000, emise: -25, echeance: -2, statut: "ECHUE" },
  { numero: "FA-2026-0011", client: 4, montant: 320_000, emise: -6, echeance: 5, statut: "A_VENIR" },
  { numero: "FA-2026-0012", client: 1, montant: 415_000, emise: -3, echeance: 20, statut: "A_VENIR" },
  { numero: "FA-2026-0013", client: 0, montant: 2_000_000, emise: -1, echeance: 30, statut: "A_VENIR" },
  { numero: "FA-2026-0014", client: 3, montant: 560_000, emise: -45, echeance: -20, statut: "SUSPENDUE" },
  { numero: "FA-2026-0015", client: 2, montant: 130_000, emise: -20, echeance: -5, statut: "ANNULEE" },
];

async function main() {
  // Repartir de zéro : les factures d'abord (le client est protégé par la clé étrangère).
  await db.facture.deleteMany({ where: { entrepriseId: { in: [DEMO_ENTREPRISE_ID, AUTRE_ENTREPRISE_ID] } } });
  await db.entreprise.deleteMany({ where: { id: { in: [DEMO_ENTREPRISE_ID, AUTRE_ENTREPRISE_ID] } } });

  await db.entreprise.create({
    data: { id: DEMO_ENTREPRISE_ID, raisonSociale: "Établissements Mensah & Frères", nif: "1001234567", telephone: "+22822212345" },
  });
  const clients = await Promise.all(
    CLIENTS.map((c) => db.client.create({ data: { ...c, entrepriseId: DEMO_ENTREPRISE_ID } })),
  );

  let n = 0;
  for (const f of FACTURES) {
    const facture = await db.facture.create({
      data: {
        entrepriseId: DEMO_ENTREPRISE_ID,
        clientId: clients[f.client].id,
        numero: f.numero,
        montant: f.montant,
        montantPaye: f.paye ?? 0,
        echeance: jour(f.echeance),
        statut: f.statut,
        createdAt: jour(f.emise),
      },
    });
    if (f.paye && f.payeLe !== undefined) {
      await db.paiement.create({
        data: {
          factureId: facture.id,
          montant: f.paye,
          operateur: n++ % 2 === 0 ? Operateur.FLOOZ : Operateur.MIXX,
          referenceTx: `DEMO-TX-${f.numero}`,
          payeLe: jour(f.payeLe),
        },
      });
    }
  }

  // Une seconde entreprise, pour vérifier qu'aucune donnée ne fuit de l'une à l'autre.
  const autre = await db.entreprise.create({ data: { id: AUTRE_ENTREPRISE_ID, raisonSociale: "Autre Entreprise SARL" } });
  const clientAutre = await db.client.create({
    data: { entrepriseId: autre.id, nom: "Client de l'autre entreprise", whatsapp: "+22893000000" },
  });
  for (const [i, montant] of [100_000, 200_000].entries()) {
    await db.facture.create({
      data: {
        entrepriseId: autre.id,
        clientId: clientAutre.id,
        numero: `FA-2026-000${i + 1}`, // mêmes numéros que la démo : autorisé, l'unicité est par entreprise
        montant,
        echeance: jour(-5),
        statut: "ECHUE",
      },
    });
  }

  console.log(`Seed terminé : 2 entreprises, ${clients.length + 1} clients, ${FACTURES.length + 2} factures.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
