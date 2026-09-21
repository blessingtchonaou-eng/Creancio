import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { requireEntreprise } from "@/lib/session";
import { annulerFactureAction, annulerPaiementAction, enregistrerPaiementAction } from "./actions";

// La session est simulée à partir des VRAIS comptes du seed (rôle et entreprise lus en base) :
// demo@creancio.tg (ADMIN) et collaboratrice@creancio.tg (COLLABORATEUR). Nécessite « npm run db:seed ».
// On teste ici la couche « action » : le rôle vient de la session, jamais du formulaire, et le refus est appliqué par le serveur.
vi.mock("@/lib/session", () => ({ requireEntreprise: vi.fn() }));

const ENTREPRISE = "demo-entreprise";
const NUMERO = "TEST-ACTIONS-1";

async function seConnecterComme(email: string) {
  const u = await db.utilisateur.findUniqueOrThrow({ where: { email } });
  vi.mocked(requireEntreprise).mockResolvedValue({ user: { id: u.id, name: u.nom, entrepriseId: u.entrepriseId }, entrepriseId: u.entrepriseId!, role: u.role } as never);
}

describe("actions de la fiche facture : les droits sont appliqués par le serveur", () => {
  let factureId: string;
  let paiementId: string;
  let sansPaiementId: string;

  const etat = async () => {
    const f = await db.facture.findUniqueOrThrow({ where: { id: factureId } });
    const p = await db.paiement.findUniqueOrThrow({ where: { id: paiementId } });
    return { montantPaye: f.montantPaye, statut: f.statut, annuleLe: p.annuleLe, motif: p.motifAnnulation };
  };

  beforeAll(async () => {
    await db.facture.deleteMany({ where: { entrepriseId: ENTREPRISE, numero: { startsWith: "TEST-ACTIONS-" } } });
    const client = await db.client.findFirstOrThrow({ where: { entrepriseId: ENTREPRISE }, select: { id: true } });
    const base = { entrepriseId: ENTREPRISE, clientId: client.id, montant: 100_000, echeance: new Date("2099-01-01"), dateFacture: new Date("2026-09-01") };
    const f = await db.facture.create({ data: { ...base, numero: NUMERO, montantPaye: 40_000, statut: "PARTIELLEMENT_PAYEE" } });
    const p = await db.paiement.create({ data: { factureId: f.id, montant: 40_000, operateur: "ESPECES", referenceTx: "MANUEL-TEST-ACTIONS", payeLe: new Date("2026-09-10"), manuel: true } });
    const sans = await db.facture.create({ data: { ...base, numero: "TEST-ACTIONS-2" } });
    [factureId, paiementId, sansPaiementId] = [f.id, p.id, sans.id];
  });
  beforeEach(() => vi.mocked(requireEntreprise).mockReset());
  afterAll(async () => {
    await db.facture.deleteMany({ where: { entrepriseId: ENTREPRISE, numero: { startsWith: "TEST-ACTIONS-" } } });
    await db.$disconnect();
  });

  it("la collaboratrice ne peut pas annuler un paiement : message clair, rien n'est écrit", async () => {
    await seConnecterComme("collaboratrice@creancio.tg");
    const motif = new FormData();
    motif.set("motif", "Faute de frappe sur le montant");
    expect(await annulerPaiementAction(factureId, paiementId, {}, motif)).toEqual({ error: "Seul un administrateur peut annuler un paiement." });
    expect(await etat()).toEqual({ montantPaye: 40_000, statut: "PARTIELLEMENT_PAYEE", annuleLe: null, motif: null });
  });

  it("la collaboratrice ne peut pas annuler une facture, même sans paiement : rien n'est écrit", async () => {
    await seConnecterComme("collaboratrice@creancio.tg");
    expect(await annulerFactureAction(sansPaiementId, {}, new FormData())).toEqual({ error: "Seul un administrateur peut annuler une facture." });
    expect((await db.facture.findUniqueOrThrow({ where: { id: sansPaiementId } })).statut).toBe("A_VENIR");
  });

  it("un rôle envoyé dans le formulaire n'est pas cru : seul celui de la session compte", async () => {
    await seConnecterComme("collaboratrice@creancio.tg");
    const truque = new FormData();
    truque.set("motif", "Faute de frappe");
    truque.set("role", "ADMIN");
    truque.set("entrepriseId", ENTREPRISE);
    expect(await annulerPaiementAction(factureId, paiementId, {}, truque)).toEqual({ error: "Seul un administrateur peut annuler un paiement." });
    expect((await etat()).annuleLe).toBeNull();
  });

  it("l'administrateur passe le contrôle des droits : un motif trop court est refusé sur le champ, rien n'est écrit", async () => {
    await seConnecterComme("demo@creancio.tg");
    const court = new FormData();
    court.set("motif", "ab");
    expect(await annulerPaiementAction(factureId, paiementId, {}, court)).toEqual({ fieldErrors: { motif: "Écrivez 3 caractères au moins." } });
    expect(await etat()).toEqual({ montantPaye: 40_000, statut: "PARTIELLEMENT_PAYEE", annuleLe: null, motif: null });
  });

  it("la collaboratrice peut enregistrer un paiement : le refus d'un montant trop élevé vient des règles, pas des droits", async () => {
    await seConnecterComme("collaboratrice@creancio.tg");
    const trop = new FormData();
    for (const [k, v] of Object.entries({ cle: "test-actions-trop", montant: "60 001", date: "2026-09-15", operateur: "ESPECES", reference: "" })) trop.set(k, v);
    const r = await enregistrerPaiementAction(factureId, {}, trop);
    expect(r.fieldErrors?.montant).toMatch(/reste à payer/);
    expect((await etat()).montantPaye).toBe(40_000);
  });
});
