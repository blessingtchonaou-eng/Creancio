import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { StatutFacture } from "@/generated/prisma/enums";
import { bornesDuMois, chargerTableauDeBord } from "./tableau-de-bord";

// Test d'intégration : nécessite la base de développement (docker compose up -d).
const A = "test-tdb-a";
const B = "test-tdb-b";
const VIDE = "test-tdb-vide";
const AUJOURDHUI = "2026-09-20";

let compteur = 0;
const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function nettoyer() {
  await db.entreprise.deleteMany({ where: { id: { in: [A, B, VIDE] } } }); // clients, factures et paiements suivent (cascade)
}

interface Spec {
  numero: string;
  montant: number;
  paye?: number;
  statut: StatutFacture;
  echeance: string;
  dateFacture?: string;
  estimee?: boolean;
  paiements?: { montant: number; le: string }[];
}

async function creer(entrepriseId: string, clientId: string, s: Spec) {
  const facture = await db.facture.create({
    data: {
      entrepriseId,
      clientId,
      numero: s.numero,
      montant: s.montant,
      montantPaye: s.paye ?? 0,
      statut: s.statut,
      echeance: jour(s.echeance),
      dateFacture: jour(s.dateFacture ?? "2026-08-01"),
      dateFactureEstimee: s.estimee ?? false,
    },
  });
  for (const p of s.paiements ?? []) {
    await db.paiement.create({ data: { factureId: facture.id, montant: p.montant, operateur: "FLOOZ", referenceTx: `TDB-${entrepriseId}-${compteur++}`, payeLe: new Date(`${p.le}T10:00:00.000Z`) } });
  }
}

describe("bornesDuMois", () => {
  it("donne le mois courant, le suivant et le précédent, y compris en janvier", () => {
    expect(bornesDuMois("2026-09-20")).toEqual({ debut: jour("2026-09-01"), fin: jour("2026-10-01"), debutPrecedent: jour("2026-08-01") });
    expect(bornesDuMois("2026-01-05")).toEqual({ debut: jour("2026-01-01"), fin: jour("2026-02-01"), debutPrecedent: jour("2025-12-01") });
    expect(bornesDuMois("2026-12-31").fin).toEqual(jour("2027-01-01"));
  });
});

describe("tableau de bord : chiffres exacts et isolation entre entreprises", () => {
  beforeAll(async () => {
    await nettoyer();
    await db.entreprise.createMany({ data: [A, B, VIDE].map((id) => ({ id, raisonSociale: `Test ${id}`, etapeOnboarding: 4 })) });
    const cA = await db.client.create({ data: { entrepriseId: A, nom: "Kofi Agbo", whatsapp: "+22890123456" } });
    const cB = await db.client.create({ data: { entrepriseId: B, nom: "Ama Secrète", whatsapp: "+22890123456" } });

    // Entreprise A : 5 factures dues, 4 en retard, des payées, une annulée.
    await creer(A, cA.id, { numero: "TD-01", montant: 100_000, statut: "A_VENIR", echeance: "2026-10-15" });
    await creer(A, cA.id, { numero: "TD-02", montant: 200_000, paye: 50_000, statut: "PARTIELLEMENT_PAYEE", echeance: "2026-09-10", paiements: [{ montant: 50_000, le: "2026-09-16" }] });
    await creer(A, cA.id, { numero: "TD-03", montant: 300_000, paye: 300_000, statut: "PAYEE", echeance: "2026-08-25", dateFacture: "2026-08-01", paiements: [{ montant: 300_000, le: "2026-08-21" }] });
    await creer(A, cA.id, { numero: "TD-04", montant: 400_000, statut: "ANNULEE", echeance: "2026-09-05" });
    // « À venir » en base mais échéance passée : compte comme en retard.
    await creer(A, cA.id, { numero: "TD-05", montant: 500_000, statut: "A_VENIR", echeance: "2026-09-01" });
    await creer(A, cA.id, { numero: "TD-06", montant: 600_000, statut: "EN_RELANCE", echeance: "2026-08-30" });
    // Payée en deux fois : le délai se compte jusqu'au DERNIER paiement (11/09, soit 10 jours).
    await creer(A, cA.id, {
      numero: "TD-07",
      montant: 80_000,
      paye: 80_000,
      statut: "PAYEE",
      echeance: "2026-09-30",
      dateFacture: "2026-09-01",
      paiements: [
        { montant: 30_000, le: "2026-09-04" },
        { montant: 50_000, le: "2026-09-11" },
      ],
    });
    // Date d'émission estimée à l'import : payée, mais exclue du délai moyen.
    await creer(A, cA.id, { numero: "TD-08", montant: 70_000, paye: 70_000, statut: "PAYEE", echeance: "2026-09-30", dateFacture: "2026-09-01", estimee: true, paiements: [{ montant: 70_000, le: "2026-09-05" }] });
    // Payée avant d'être émise : erreur de saisie, ignorée dans la moyenne.
    await creer(A, cA.id, { numero: "TD-09", montant: 30_000, paye: 30_000, statut: "PAYEE", echeance: "2026-09-30", dateFacture: "2026-09-15", paiements: [{ montant: 30_000, le: "2026-09-10" }] });
    await creer(A, cA.id, { numero: "TD-10", montant: 40_000, statut: "SUSPENDUE", echeance: "2026-09-01" });

    // Entreprise B : des montants énormes, pour que la moindre fuite se voie dans les totaux de A.
    await creer(B, cB.id, { numero: "TD-01", montant: 9_999_000, statut: "ECHUE", echeance: "2026-09-01" });
    await creer(B, cB.id, { numero: "TD-99", montant: 8_888_000, paye: 8_888_000, statut: "PAYEE", echeance: "2026-09-30", dateFacture: "2026-09-19", paiements: [{ montant: 8_888_000, le: "2026-09-20" }] });
  });
  afterAll(async () => {
    await nettoyer();
    await db.$disconnect();
  });

  it("encours : factures non payées moins les paiements partiels ; payées et annulées ne comptent pas", async () => {
    const t = await chargerTableauDeBord(A, AUJOURDHUI);
    // 100 000 + (200 000 − 50 000) + 500 000 + 600 000 + 40 000
    expect(t.encours).toEqual({ montant: 1_390_000, nb: 5 });
    expect(t.nbFactures).toBe(10);
  });

  it("en retard : échéance passée, y compris une facture « À venir » jamais mise à jour", async () => {
    const t = await chargerTableauDeBord(A, AUJOURDHUI);
    // (200 000 − 50 000) + 500 000 + 600 000 + 40 000 : TD-01 (échéance 15/10) n'en fait pas partie
    expect(t.enRetard).toEqual({ montant: 1_290_000, nb: 4 });
  });

  it("le jour de l'échéance, une facture n'est pas encore en retard", async () => {
    const t = await chargerTableauDeBord(A, "2026-09-01");
    // seule TD-06 (échéance 30/08) est en retard : TD-05 et TD-10 sont dues le 01/09 même, donc pas encore en retard
    expect(t.enRetard).toEqual({ montant: 600_000, nb: 1 });
  });

  it("encaissé ce mois : les paiements de septembre seulement, avec le mois précédent en repère", async () => {
    const t = await chargerTableauDeBord(A, AUJOURDHUI);
    // 50 000 + (30 000 + 50 000) + 70 000 + 30 000 ; le paiement de 300 000 du 21/08 est au mois précédent
    expect(t.encaisse).toEqual({ ceMois: 230_000, moisPrecedent: 300_000, nbPaiementsMoisPrecedent: 1 });
  });

  it("délai moyen : dernier paiement moins date d'émission, sans date estimée ni paiement avant l'émission", async () => {
    const t = await chargerTableauDeBord(A, AUJOURDHUI);
    // TD-03 : 21/08 − 01/08 = 20 jours ; TD-07 : 11/09 − 01/09 = 10 jours ; moyenne 15
    expect(t.delaiMoyen).toEqual({ jours: 15, nb: 2, nonCompteesDateEstimee: 1 });
  });

  it("factures à suivre : les plus en retard d'abord, avec le statut affiché", async () => {
    const t = await chargerTableauDeBord(A, AUJOURDHUI);
    expect(t.aSuivre.map((f) => [f.numero, f.statut])).toEqual([
      ["TD-06", "EN_RELANCE"],
      ["TD-05", "ECHUE"], // « À venir » en base, échue en réalité
      ["TD-10", "SUSPENDUE"],
      ["TD-02", "PARTIELLEMENT_PAYEE"],
      ["TD-01", "A_VENIR"],
    ]);
    expect(t.aSuivre.every((f) => f.clientNom === "Kofi Agbo")).toBe(true);
  });

  it("ISOLATION : aucun chiffre ni aucune ligne de l'autre entreprise", async () => {
    const a = await chargerTableauDeBord(A, AUJOURDHUI);
    const b = await chargerTableauDeBord(B, AUJOURDHUI);
    expect(b.encours).toEqual({ montant: 9_999_000, nb: 1 });
    expect(b.enRetard).toEqual({ montant: 9_999_000, nb: 1 });
    expect(b.encaisse.ceMois).toBe(8_888_000);
    expect(b.delaiMoyen).toEqual({ jours: 1, nb: 1, nonCompteesDateEstimee: 0 });
    expect(b.aSuivre.map((f) => f.clientNom)).toEqual(["Ama Secrète"]);
    // A n'a rien pris de B : mêmes numéros de facture chez les deux (TD-01), mais jamais mélangés
    expect(a.encours.montant).toBeLessThan(2_000_000);
    expect(a.encaisse.ceMois).toBe(230_000);
    expect(a.delaiMoyen.jours).toBe(15);
    expect(JSON.stringify(a)).not.toContain("Ama Secrète");
    expect(JSON.stringify(b)).not.toContain("Kofi Agbo");
  });

  it("une entreprise sans facture n'a que des valeurs vides : ni NaN ni chiffre inventé", async () => {
    const t = await chargerTableauDeBord(VIDE, AUJOURDHUI);
    expect(t).toEqual({
      nbFactures: 0,
      encours: { montant: 0, nb: 0 },
      enRetard: { montant: 0, nb: 0 },
      encaisse: { ceMois: 0, moisPrecedent: 0, nbPaiementsMoisPrecedent: 0 },
      delaiMoyen: { jours: null, nb: 0, nonCompteesDateEstimee: 0 },
      aSuivre: [],
    });
  });
});
