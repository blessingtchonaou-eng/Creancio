import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { creerClient, listerClients, modifierClient, TAILLE_PAGE, trouverClient } from "./clients";

// Test d'intégration : nécessite la base de développement (docker compose up -d).
const A = "test-clients-a";
const B = "test-clients-b";

async function nettoyer() {
  await db.entreprise.deleteMany({ where: { id: { in: [A, B] } } }); // les clients et factures suivent (cascade)
}

describe("clients : données et isolation entre entreprises", () => {
  let clientA: string;
  let clientB: string;

  beforeAll(async () => {
    await nettoyer();
    await db.entreprise.createMany({ data: [A, B].map((id) => ({ id, raisonSociale: `Test ${id}`, etapeOnboarding: 4 })) });
    const a = await creerClient(A, { nom: "Kofi Agbo", whatsapp: "+22890123456", email: null });
    const b = await creerClient(B, { nom: "Ama Secrète", whatsapp: "+22890123456", email: "ama@example.com" });
    if (!a.ok || !b.ok) throw new Error("préparation impossible");
    [clientA, clientB] = [a.id, b.id];

    const echeance = new Date("2026-10-15");
    const facture = (numero: string, montant: number, montantPaye: number, statut: "A_VENIR" | "PARTIELLEMENT_PAYEE" | "PAYEE" | "ANNULEE") => ({
      entrepriseId: A,
      clientId: clientA,
      numero,
      montant,
      montantPaye,
      statut,
      echeance,
    });
    await db.facture.createMany({
      data: [
        facture("T-1", 100_000, 0, "A_VENIR"),
        facture("T-2", 200_000, 50_000, "PARTIELLEMENT_PAYEE"),
        facture("T-3", 300_000, 300_000, "PAYEE"),
        facture("T-4", 400_000, 0, "ANNULEE"),
      ],
    });
    await db.facture.create({ data: { entrepriseId: B, clientId: clientB, numero: "T-1", montant: 999_999, echeance, statut: "ECHUE" } });
  });
  afterAll(async () => {
    await nettoyer();
    await db.$disconnect();
  });

  it("un numéro déjà utilisé demande confirmation : rien n'est créé tant que l'utilisateur n'a pas confirmé", async () => {
    const donnees = { nom: "Boutique Agbo", whatsapp: "+22890123456", email: null };
    const doublon = await creerClient(A, donnees);
    expect(doublon).toEqual({ ok: false, doublon: [{ id: clientA, nom: "Kofi Agbo" }] });
    expect(await db.client.count({ where: { entrepriseId: A } })).toBe(1);

    const confirme = await creerClient(A, donnees, { confirmerDoublon: true });
    expect(confirme.ok).toBe(true);
    expect(await db.client.count({ where: { entrepriseId: A, whatsapp: "+22890123456" } })).toBe(2);
    // le même numéro dans une autre entreprise n'a jamais posé de question
    expect(await db.client.count({ where: { entrepriseId: B, whatsapp: "+22890123456" } })).toBe(1);
    await db.client.deleteMany({ where: { entrepriseId: A, nom: "Boutique Agbo" } });
  });

  it("calcule le total dû : ni les factures payées ni les annulées, moins les paiements partiels", async () => {
    const fiche = await trouverClient(A, clientA);
    expect(fiche?.totalDu).toBe(100_000 + 150_000);
    expect(fiche?.nbFacturesDues).toBe(2);
    expect(fiche?.factures).toHaveLength(4);
    const liste = await listerClients(A);
    expect(liste.lignes[0]).toMatchObject({ nom: "Kofi Agbo", totalDu: 250_000, nbFacturesDues: 2 });
  });

  it("ISOLATION : la liste ne montre que les clients de l'entreprise", async () => {
    const liste = await listerClients(A);
    expect(liste.lignes.map((c) => c.id)).toEqual([clientA]);
    expect((await listerClients(A, { q: "Secrète" })).total).toBe(0);
    expect((await listerClients(B, { q: "Secrète" })).total).toBe(1);
  });

  it("ISOLATION : la fiche d'un client d'une autre entreprise est introuvable, factures comprises", async () => {
    expect(await trouverClient(A, clientB)).toBeNull();
    expect(await trouverClient(B, clientA)).toBeNull();
    const fiche = await trouverClient(B, clientB);
    expect(fiche?.totalDu).toBe(999_999);
    expect(fiche?.factures.map((f) => f.numero)).toEqual(["T-1"]);
  });

  it("ISOLATION : on ne peut pas modifier un client d'une autre entreprise", async () => {
    const r = await modifierClient(A, clientB, { nom: "Piraté", whatsapp: "+22870000000", email: null });
    expect(r).toEqual({ ok: false, introuvable: true });
    const intact = await db.client.findUniqueOrThrow({ where: { id: clientB } });
    expect(intact.nom).toBe("Ama Secrète");
    expect(intact.whatsapp).toBe("+22890123456");
  });

  it("modifie un client de l'entreprise ; un numéro déjà utilisé demande confirmation", async () => {
    const autre = await creerClient(A, { nom: "Yao Test", whatsapp: "+22870000001", email: null });
    if (!autre.ok) throw new Error("préparation impossible");
    expect(await modifierClient(A, autre.id, { nom: "Yao Modifié", whatsapp: "+22870000001", email: "yao@example.com" })).toEqual({ ok: true, id: autre.id });
    expect((await db.client.findUniqueOrThrow({ where: { id: autre.id } })).nom).toBe("Yao Modifié");
    const donnees = { nom: "Yao", whatsapp: "+22890123456", email: null };
    expect(await modifierClient(A, autre.id, donnees)).toEqual({ ok: false, doublon: [{ id: clientA, nom: "Kofi Agbo" }] });
    expect(await modifierClient(A, autre.id, donnees, { confirmerDoublon: true })).toEqual({ ok: true, id: autre.id });
  });

  it("recherche par nom (sans tenir compte des majuscules) ou par numéro, et pagine", async () => {
    expect((await listerClients(A, { q: "kofi" })).total).toBe(1);
    expect((await listerClients(A, { q: "90 12 34" })).total).toBe(2); // Kofi et Yao, qui partagent ce numéro depuis le test précédent
    expect((await listerClients(A, { q: "zzz" })).lignes).toEqual([]);

    await db.client.createMany({
      data: Array.from({ length: TAILLE_PAGE }, (_, i) => ({ entrepriseId: A, nom: `Zz Client ${String(i).padStart(2, "0")}`, whatsapp: `+2289100${String(i).padStart(4, "0")}` })),
    });
    const p1 = await listerClients(A, { page: 1 });
    const p2 = await listerClients(A, { page: 2 });
    expect(p1.lignes).toHaveLength(TAILLE_PAGE);
    expect(p2.nbPages).toBe(2);
    expect(p2.lignes.length).toBe(p2.total - TAILLE_PAGE);
    expect((await listerClients(A, { page: 99 })).page).toBe(2); // page hors limites : ramenée à la dernière
  });
});
