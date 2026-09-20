import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, StatutFacture, Operateur } from "../src/generated/prisma/client";

if (process.env.NODE_ENV === "production") throw new Error("Le seed de démonstration ne s'exécute jamais en production.");

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

export const DEMO_ENTREPRISE_ID = "demo-entreprise";
const AUTRE_ENTREPRISE_ID = "demo-autre-entreprise"; // sert aux tests d'isolation

// Comptes de démonstration (développement local uniquement). Mot de passe : DEMO_PASSWORD, sinon la valeur ci-dessous.
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "creancio-demo-2026";
const DEMO_USERS = [
  { id: "demo-admin", nom: "Kossi Mensah", email: "demo@creancio.tg", role: "ADMIN", entrepriseId: DEMO_ENTREPRISE_ID },
  { id: "demo-collaboratrice", nom: "Ama Doe", email: "collaboratrice@creancio.tg", role: "COLLABORATEUR", entrepriseId: DEMO_ENTREPRISE_ID },
  { id: "demo-autre-admin", nom: "Yao Agbo", email: "autre@creancio.tg", role: "ADMIN", entrepriseId: AUTRE_ENTREPRISE_ID },
] as const;

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

// 16 factures, tous les statuts. Les factures payées ont des délais de paiement différents.
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
  // Numéro visé par le fichier de test de l'import (tests/fixtures) : « déjà en base ».
  { numero: "FA-2026-0129", client: 3, montant: 475_000, emise: -30, echeance: -3, statut: "ECHUE" },
];

async function main() {
  await db.utilisateur.deleteMany({ where: { email: { in: DEMO_USERS.map((u) => u.email) } } });
  // Repartir de zéro : les factures d'abord (le client est protégé par la clé étrangère).
  await db.facture.deleteMany({ where: { entrepriseId: { in: [DEMO_ENTREPRISE_ID, AUTRE_ENTREPRISE_ID] } } });
  await db.entreprise.deleteMany({ where: { id: { in: [DEMO_ENTREPRISE_ID, AUTRE_ENTREPRISE_ID] } } });

  await db.entreprise.create({
    data: { id: DEMO_ENTREPRISE_ID, raisonSociale: "Établissements Mensah & Frères", nif: "1001234567", telephone: "+22822212345", etapeOnboarding: 4 },
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
        dateFacture: jour(f.emise),
        echeance: jour(f.echeance),
        statut: f.statut,
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
  const autre = await db.entreprise.create({ data: { id: AUTRE_ENTREPRISE_ID, raisonSociale: "Autre Entreprise SARL", etapeOnboarding: 4 } });
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

  const motDePasse = await hashPassword(DEMO_PASSWORD);
  for (const u of DEMO_USERS) {
    await db.utilisateur.create({
      data: {
        id: u.id,
        nom: u.nom,
        email: u.email,
        role: u.role,
        entrepriseId: u.entrepriseId,
        emailVerified: true,
        comptes: { create: { accountId: u.id, providerId: "credential", password: motDePasse } },
      },
    });
  }

  console.log(`Seed terminé : 2 entreprises, ${clients.length + 1} clients, ${FACTURES.length + 2} factures, ${DEMO_USERS.length} utilisateurs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
