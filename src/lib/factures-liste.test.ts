import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { StatutFacture } from "@/generated/prisma/enums";
import { TAILLE_PAGE } from "./clients";
import { FILTRE_PAR_DEFAUT, lireFiltre, lireTri, listerFactures } from "./factures-liste";

// Test d'intégration : nécessite la base de développement (docker compose up -d).
const A = "test-liste-a";
const B = "test-liste-b";
const P = "test-liste-pages";
const AUJOURDHUI = "2026-09-20";

const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const numeros = (r: { lignes: { numero: string }[] }) => r.lignes.map((l) => l.numero);

async function nettoyer() {
  await db.entreprise.deleteMany({ where: { id: { in: [A, B, P] } } });
}

describe("liste des factures : filtres, recherche, tri, pagination et isolation", () => {
  beforeAll(async () => {
    await nettoyer();
    await db.entreprise.createMany({ data: [A, B, P].map((id) => ({ id, raisonSociale: `Test ${id}`, etapeOnboarding: 4 })) });
    const kofi = await db.client.create({ data: { entrepriseId: A, nom: "Kofi Agbo", whatsapp: "+22890123456" } });
    const ama = await db.client.create({ data: { entrepriseId: A, nom: "Ama Zola", whatsapp: "+22891000000" } });
    const secrete = await db.client.create({ data: { entrepriseId: B, nom: "Ama Secrète", whatsapp: "+22890123456" } });
    const pages = await db.client.create({ data: { entrepriseId: P, nom: "Client Pages", whatsapp: "+22892000000" } });

    const f = (entrepriseId: string, clientId: string, numero: string, statut: StatutFacture, echeance: string, montant = 100_000, montantPaye = 0) => ({
      entrepriseId,
      clientId,
      numero,
      statut,
      echeance: jour(echeance),
      montant,
      montantPaye,
    });
    await db.facture.createMany({
      data: [
        f(A, kofi.id, "L-01", "A_VENIR", "2026-10-15"),
        f(A, kofi.id, "L-02", "A_VENIR", "2026-09-01"), // « À venir » en base, échue en réalité
        f(A, ama.id, "L-03", "ECHUE", "2026-09-05"),
        f(A, kofi.id, "L-04", "EN_RELANCE", "2026-08-30"),
        f(A, ama.id, "L-05", "PARTIELLEMENT_PAYEE", "2026-09-10", 200_000, 50_000),
        f(A, ama.id, "L-06", "PAYEE", "2026-08-01", 100_000, 100_000),
        f(A, kofi.id, "L-07", "SUSPENDUE", "2026-09-02"),
        f(A, kofi.id, "L-08", "ANNULEE", "2026-09-03"),
        // Mêmes numéros chez B : autorisé, l'unicité est par entreprise.
        f(B, secrete.id, "L-01", "ECHUE", "2026-09-01", 9_999_000),
        f(B, secrete.id, "L-06", "PAYEE", "2026-08-01", 8_888_000, 8_888_000),
        // 30 factures à la même échéance : l'ordre doit rester stable d'une page à l'autre.
        ...Array.from({ length: 30 }, (_, i) => f(P, pages.id, `P-${String(i).padStart(2, "0")}`, "ECHUE", "2026-09-10")),
      ],
    });
  });
  afterAll(async () => {
    await nettoyer();
    await db.$disconnect();
  });

  it("par défaut : « À encaisser », échéance la plus ancienne d'abord, avec le statut affiché", async () => {
    const r = await listerFactures(A, {}, AUJOURDHUI);
    expect(r.filtreApplique).toBe("a_encaisser");
    expect(numeros(r)).toEqual(["L-04", "L-02", "L-07", "L-03", "L-05", "L-01"]);
    expect(r.lignes.find((l) => l.numero === "L-02")?.statut).toBe("ECHUE");
    expect(r.lignes.find((l) => l.numero === "L-01")).toMatchObject({ statut: "A_VENIR", clientNom: "Kofi Agbo", echeance: "2026-10-15", montant: 100_000 });
    expect(r.total).toBe(6);
  });

  it("chaque puce filtre selon le statut affiché, et les comptes sont justes", async () => {
    const cas: [Parameters<typeof lireFiltre>[0], string[]][] = [
      ["toutes", ["L-06", "L-04", "L-02", "L-07", "L-08", "L-03", "L-05", "L-01"]],
      ["a_venir", ["L-01"]],
      ["echues", ["L-02", "L-03"]], // L-02 est « À venir » en base mais échue
      ["en_relance", ["L-04"]],
      ["partielles", ["L-05"]],
      ["payees", ["L-06"]],
      ["suspendues", ["L-07"]],
      ["annulees", ["L-08"]],
    ];
    for (const [statut, attendu] of cas) {
      const r = await listerFactures(A, { filtre: lireFiltre(statut) }, AUJOURDHUI);
      expect(numeros(r), String(statut)).toEqual(attendu);
    }
    const { comptes } = await listerFactures(A, {}, AUJOURDHUI);
    expect(comptes).toEqual({ toutes: 8, a_encaisser: 6, a_venir: 1, echues: 2, en_relance: 1, partielles: 1, payees: 1, suspendues: 1, annulees: 1 });
  });

  it("le jour de l'échéance, une facture est encore « À venir »", async () => {
    const veille = await listerFactures(A, { filtre: "echues" }, "2026-09-01");
    expect(numeros(veille)).toEqual(["L-03"]); // L-02 (échéance le 01/09) n'est pas encore échue ce jour-là
    const lendemain = await listerFactures(A, { filtre: "echues" }, "2026-09-02");
    expect(numeros(lendemain)).toEqual(["L-02", "L-03"]);
  });

  it("trie par échéance, dans les deux sens", async () => {
    const asc = await listerFactures(A, { filtre: "toutes", tri: "asc" }, AUJOURDHUI);
    const desc = await listerFactures(A, { filtre: "toutes", tri: "desc" }, AUJOURDHUI);
    expect(numeros(desc)).toEqual(numeros(asc).reverse());
    expect(numeros(desc)[0]).toBe("L-01");
  });

  it("RECHERCHE : elle porte sur toutes les factures, même quand « À encaisser » est le filtre demandé", async () => {
    // L-06 est payée : elle n'est pas dans « À encaisser », mais on la retrouve par son numéro.
    expect(numeros(await listerFactures(A, { filtre: "a_encaisser" }, AUJOURDHUI))).not.toContain("L-06");
    const r = await listerFactures(A, { q: "L-06", filtre: "a_encaisser" }, AUJOURDHUI);
    expect(numeros(r)).toEqual(["L-06"]);
    expect(r.filtreApplique).toBe("toutes");
  });

  it("recherche par numéro ou par nom de client, sans tenir compte des majuscules ; les comptes suivent la recherche", async () => {
    const r = await listerFactures(A, { q: "  kofi " }, AUJOURDHUI);
    expect(numeros(r)).toEqual(["L-04", "L-02", "L-07", "L-08", "L-01"]);
    expect(r.comptes).toMatchObject({ toutes: 5, a_encaisser: 4, payees: 0, annulees: 1 });
    expect(numeros(await listerFactures(A, { q: "l-0" }, AUJOURDHUI))).toHaveLength(8);
    expect((await listerFactures(A, { q: "zzz" }, AUJOURDHUI)).total).toBe(0);
  });

  it("pagine sans sauter ni répéter de facture, et ramène une page hors limites à la dernière", async () => {
    const p1 = await listerFactures(P, { filtre: "toutes", page: 1 }, AUJOURDHUI);
    const p2 = await listerFactures(P, { filtre: "toutes", page: 2 }, AUJOURDHUI);
    expect(p1.lignes).toHaveLength(TAILLE_PAGE);
    expect(p2.lignes).toHaveLength(30 - TAILLE_PAGE);
    expect(p1.nbPages).toBe(2);
    const tous = [...numeros(p1), ...numeros(p2)];
    expect(new Set(tous).size).toBe(30);
    expect(tous).toEqual([...tous].sort()); // même échéance : départage par numéro
    expect((await listerFactures(P, { filtre: "toutes", page: 99 }, AUJOURDHUI)).page).toBe(2);
    expect((await listerFactures(P, { filtre: "toutes", page: -3 }, AUJOURDHUI)).page).toBe(1);
  });

  it("ISOLATION : jamais une ligne, un compte ou une recherche d'une autre entreprise (mêmes numéros chez les deux)", async () => {
    const a = await listerFactures(A, { filtre: "toutes" }, AUJOURDHUI);
    const b = await listerFactures(B, { filtre: "toutes" }, AUJOURDHUI);
    expect(a.lignes.some((l) => l.clientNom === "Ama Secrète" || l.montant > 1_000_000)).toBe(false);
    expect(b.lignes.map((l) => [l.numero, l.clientNom, l.montant])).toEqual([
      ["L-06", "Ama Secrète", 8_888_000],
      ["L-01", "Ama Secrète", 9_999_000],
    ]);
    expect(a.comptes.toutes).toBe(8);
    expect(b.comptes).toMatchObject({ toutes: 2, a_encaisser: 1, echues: 1, payees: 1 });
    // La recherche ne traverse pas non plus les entreprises
    expect((await listerFactures(A, { q: "Secrète" }, AUJOURDHUI)).total).toBe(0);
    expect((await listerFactures(B, { q: "Kofi" }, AUJOURDHUI)).total).toBe(0);
    expect(numeros(await listerFactures(B, { q: "L-01" }, AUJOURDHUI))).toEqual(["L-01"]);
    expect((await listerFactures(B, { q: "L-01" }, AUJOURDHUI)).lignes[0].clientNom).toBe("Ama Secrète");
  });

  it("une entreprise sans facture : liste vide, comptes à zéro", async () => {
    const r = await listerFactures("entreprise-inexistante", {}, AUJOURDHUI);
    expect(r).toMatchObject({ lignes: [], total: 0, page: 1, nbPages: 1 });
    expect(Object.values(r.comptes).every((n) => n === 0)).toBe(true);
  });
});

describe("paramètres de l'adresse", () => {
  it("un filtre ou un tri inconnu revient à la valeur par défaut", () => {
    expect(lireFiltre(undefined)).toBe(FILTRE_PAR_DEFAUT);
    expect(lireFiltre("nimporte-quoi")).toBe(FILTRE_PAR_DEFAUT);
    expect(lireFiltre("payees")).toBe("payees");
    expect(lireTri("desc")).toBe("desc");
    expect(lireTri("x")).toBe("asc");
  });
});
