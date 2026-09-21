import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { seConnecter, serveurAccessible } from "./session";

// Droits sur la fiche d'une facture, vus depuis le navigateur. Comptes du seed :
// demo@creancio.tg (ADMIN) et collaboratrice@creancio.tg (COLLABORATEUR), dans la même entreprise.
// Le refus côté serveur (l'action elle-même) est testé dans src/app/(app)/factures/[id]/actions.test.ts.
const ENTREPRISE = "demo-entreprise";

describe("fiche facture : ce que voit un administrateur et un collaborateur (HTTP)", () => {
  let admin: Awaited<ReturnType<typeof seConnecter>>;
  let collaboratrice: Awaited<ReturnType<typeof seConnecter>>;
  let avecPaiement: string;
  let sansPaiement: string;

  beforeAll(async () => {
    await serveurAccessible();
    admin = await seConnecter("demo@creancio.tg");
    collaboratrice = await seConnecter("collaboratrice@creancio.tg");

    await db.facture.deleteMany({ where: { entrepriseId: ENTREPRISE, numero: { startsWith: "TEST-DROITS-" } } });
    const client = await db.client.findFirstOrThrow({ where: { entrepriseId: ENTREPRISE }, select: { id: true } });
    const base = { entrepriseId: ENTREPRISE, clientId: client.id, montant: 100_000, echeance: new Date("2099-01-01"), dateFacture: new Date("2026-09-01") };
    const avec = await db.facture.create({ data: { ...base, numero: "TEST-DROITS-AVEC", montantPaye: 40_000, statut: "PARTIELLEMENT_PAYEE" } });
    await db.paiement.create({ data: { factureId: avec.id, montant: 40_000, operateur: "ESPECES", referenceTx: "MANUEL-TEST-DROITS", payeLe: new Date("2026-09-10"), manuel: true } });
    const sans = await db.facture.create({ data: { ...base, numero: "TEST-DROITS-SANS" } });
    [avecPaiement, sansPaiement] = [avec.id, sans.id];
  });
  afterAll(async () => {
    await db.facture.deleteMany({ where: { entrepriseId: ENTREPRISE, numero: { startsWith: "TEST-DROITS-" } } });
    await db.$disconnect();
  });

  it("l'administrateur voit « Annuler ce paiement » et « Annuler la facture »", async () => {
    const avec = await (await admin(`/factures/${avecPaiement}`)).text();
    expect(avec).toContain("Annuler ce paiement");
    expect(avec).toContain("annulez d&#x27;abord ses paiements"); // la facture ne s'annule pas tant qu'un paiement compte
    expect(avec).not.toContain("Annuler la facture");
    const sans = await (await admin(`/factures/${sansPaiement}`)).text();
    expect(sans).toContain("Annuler la facture");
  });

  it("la collaboratrice ne voit aucun de ces deux boutons, ni la phrase qui les explique", async () => {
    for (const id of [avecPaiement, sansPaiement]) {
      const r = await collaboratrice(`/factures/${id}`);
      expect(r.status).toBe(200);
      const html = await r.text();
      expect(html).not.toContain("Annuler ce paiement");
      expect(html).not.toContain("Annuler la facture");
      expect(html).not.toContain("annulez d&#x27;abord");
    }
  });

  it("la collaboratrice garde tout le reste : modifier, enregistrer un paiement, suspendre les relances", async () => {
    const html = await (await collaboratrice(`/factures/${avecPaiement}`)).text();
    expect(html).toContain("Modifier la facture");
    expect(html).toContain("Enregistrer un paiement");
    expect(html).toContain("Suspendre les relances");
    expect(html).toContain("Saisi à la main");
    for (const chemin of [`/factures/${avecPaiement}/modifier`, `/factures/${avecPaiement}/paiement`]) expect((await collaboratrice(chemin)).status, chemin).toBe(200);
  });
});
