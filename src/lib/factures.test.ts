import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { creerFacture, numeroSuggere } from "./factures";
import type { SaisieFacture } from "./factures-saisie";

// Test d'intégration : nécessite la base de développement (docker compose up -d).
const A = "test-saisie-a";
const B = "test-saisie-b";

const saisie = (numero: string, surcharge: Partial<SaisieFacture> = {}): SaisieFacture => ({
  cle: `cle-${numero}`,
  numero,
  montant: "150 000",
  dateFacture: "2026-09-01",
  echeance: "2099-10-25",
  client: { type: "nouveau", nom: "Kofi Agbo", whatsapp: "90 12 34 56" },
  ...surcharge,
});

const nettoyer = () => db.entreprise.deleteMany({ where: { id: { in: [A, B] } } });

describe("creerFacture", () => {
  beforeAll(async () => {
    await nettoyer();
    await db.entreprise.createMany({ data: [A, B].map((id) => ({ id, raisonSociale: `Test ${id}`, etapeOnboarding: 4 })) });
  });
  afterAll(async () => {
    await nettoyer();
    await db.$disconnect();
  });

  it("crée le client et la facture, avec la date de facture et le statut selon l'échéance", async () => {
    const r = await creerFacture(A, saisie("FA-S-1"));
    expect(r).toMatchObject({ ok: true, numero: "FA-S-1" });
    const f = await db.facture.findFirstOrThrow({ where: { entrepriseId: A, numero: "FA-S-1" }, include: { client: true } });
    expect(f).toMatchObject({ montant: 150_000, statut: "A_VENIR", client: { nom: "Kofi Agbo", whatsapp: "+22890123456" } });
    expect(f.dateFacture.toISOString().slice(0, 10)).toBe("2026-09-01");
    expect(f.echeance.toISOString().slice(0, 10)).toBe("2099-10-25");
  });

  it("une échéance passée donne le statut « Échue » dès l'enregistrement", async () => {
    await creerFacture(A, saisie("FA-S-2", { dateFacture: "2020-01-01", echeance: "2020-02-01" }));
    const f = await db.facture.findFirstOrThrow({ where: { entrepriseId: A, numero: "FA-S-2" } });
    expect(f.statut).toBe("ECHUE");
  });

  it("le même client retapé (même nom, même numéro) est reconnu : pas de second client", async () => {
    const r = await creerFacture(A, saisie("FA-S-3"));
    expect(r.ok).toBe(true);
    expect(await db.client.count({ where: { entrepriseId: A, whatsapp: "+22890123456" } })).toBe(1);
  });

  it("un numéro WhatsApp déjà pris par un autre client demande confirmation, puis crée un second client", async () => {
    const autre = saisie("FA-S-4", { client: { type: "nouveau", nom: "Ama Mensah", whatsapp: "90123456" } });
    const r = await creerFacture(A, autre);
    expect(r).toMatchObject({ ok: false, doublon: { whatsapp: "+22890123456", clients: [{ nom: "Kofi Agbo" }] } });
    expect(await db.facture.count({ where: { entrepriseId: A, numero: "FA-S-4" } })).toBe(0);

    const confirmee = await creerFacture(A, { ...autre, confirmerNumero: "+22890123456" });
    expect(confirmee.ok).toBe(true);
    expect(await db.client.count({ where: { entrepriseId: A, whatsapp: "+22890123456" } })).toBe(2);
  });

  it("un numéro de facture déjà utilisé par une autre facture est refusé, sans rien créer", async () => {
    const avant = await db.client.count({ where: { entrepriseId: A } });
    const r = await creerFacture(A, saisie("FA-S-1", { montant: "999 000", client: { type: "nouveau", nom: "Nouveau Nom", whatsapp: "91000000" } }));
    expect(r).toMatchObject({ ok: false, erreurs: { numero: expect.stringMatching(/déjà utilisé/) } });
    expect(await db.client.count({ where: { entrepriseId: A } })).toBe(avant);
  });

  it("renvoyer la même facture (connexion coupée pendant l'envoi) ne crée aucun doublon", async () => {
    const r = await creerFacture(A, saisie("FA-S-1"));
    expect(r).toMatchObject({ ok: true, dejaEnregistree: true });
    expect(await db.facture.count({ where: { entrepriseId: A, numero: "FA-S-1" } })).toBe(1);
  });

  it("refuse une saisie invalide sans rien écrire", async () => {
    const r = await creerFacture(A, saisie("FA-S-5", { montant: "0" }));
    expect(r).toMatchObject({ ok: false, erreurs: { montant: expect.any(String) } });
    expect(await db.facture.count({ where: { entrepriseId: A, numero: "FA-S-5" } })).toBe(0);
  });

  it("ISOLATION : le même numéro est libre dans une autre entreprise", async () => {
    const r = await creerFacture(B, saisie("FA-S-1"));
    expect(r.ok).toBe(true);
    expect(await db.client.count({ where: { entrepriseId: B } })).toBe(1);
  });

  it("ISOLATION : le client d'une autre entreprise ne peut pas recevoir une facture", async () => {
    const clientA = await db.client.findFirstOrThrow({ where: { entrepriseId: A }, select: { id: true } });
    const r = await creerFacture(B, saisie("FA-S-6", { client: { type: "existant", id: clientA.id } }));
    expect(r).toMatchObject({ ok: false, erreurs: { client: expect.any(String) } });
    expect(await db.facture.count({ where: { numero: "FA-S-6" } })).toBe(0);
  });

  it("propose le numéro suivant de l'année, propre à l'entreprise", async () => {
    await creerFacture(A, saisie("FA-2031-0042", { client: { type: "nouveau", nom: "Yao", whatsapp: "92000000" } }));
    expect(await numeroSuggere(A, 2031)).toBe("FA-2031-0043");
    expect(await numeroSuggere(B, 2031)).toBe("FA-2031-0001");
  });
});
