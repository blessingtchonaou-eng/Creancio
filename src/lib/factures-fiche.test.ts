import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { StatutFacture } from "@/generated/prisma/enums";
import type { SaisiePaiement } from "./facture-regles";
import { annulerFacture, annulerPaiement, enregistrerPaiement, modifierFacture, reprendreRelances, suspendreRelances, trouverFacture, type Contexte } from "./factures-fiche";
import type { SaisieFacture } from "./factures-saisie";
import { chargerTableauDeBord } from "./tableau-de-bord";

// Test d'intégration : nécessite la base de développement (docker compose up -d).
const A = "test-fiche-a";
const B = "test-fiche-b";
const TDB = "test-fiche-tdb";
const AUJOURDHUI = "2026-09-20";

const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const admin: Contexte = { entrepriseId: A, utilisateurId: "test-fiche-admin", role: "ADMIN" };
const collaboratrice: Contexte = { entrepriseId: A, utilisateurId: "test-fiche-collab", role: "COLLABORATEUR" };
const adminB: Contexte = { entrepriseId: B, utilisateurId: "test-fiche-admin-b", role: "ADMIN" };
const adminTdb: Contexte = { entrepriseId: TDB, utilisateurId: "test-fiche-admin-tdb", role: "ADMIN" };

let clientA: string;
let clientA2: string;
let clientB: string;
let clientTdb: string;
let compteur = 0;
/** Factures touchées par le test en cours : l'invariant est contrôlé sur toutes, après chaque scénario. */
let touchees: string[] = [];

async function nettoyer() {
  await db.utilisateur.deleteMany({ where: { id: { in: [admin.utilisateurId, collaboratrice.utilisateurId, adminB.utilisateurId, adminTdb.utilisateurId] } } });
  await db.entreprise.deleteMany({ where: { id: { in: [A, B, TDB] } } });
}

async function nouvelleFacture(surcharge: { entrepriseId?: string; clientId?: string; montant?: number; montantPaye?: number; statut?: StatutFacture; echeance?: string; dateFacture?: string; estimee?: boolean; numero?: string } = {}) {
  const entrepriseId = surcharge.entrepriseId ?? A;
  const f = await db.facture.create({
    data: {
      entrepriseId,
      clientId: surcharge.clientId ?? (entrepriseId === A ? clientA : entrepriseId === B ? clientB : clientTdb),
      numero: surcharge.numero ?? `FI-${compteur++}`,
      montant: surcharge.montant ?? 100_000,
      montantPaye: surcharge.montantPaye ?? 0,
      statut: surcharge.statut ?? "A_VENIR",
      echeance: jour(surcharge.echeance ?? "2026-10-15"),
      dateFacture: jour(surcharge.dateFacture ?? "2026-09-01"),
      dateFactureEstimee: surcharge.estimee ?? false,
    },
  });
  touchees.push(f.id);
  return f.id;
}

const saisie = (montant: string, surcharge: Partial<SaisiePaiement> = {}): SaisiePaiement => ({ cle: `cle-${compteur++}`, montant, date: "2026-09-15", operateur: "ESPECES", reference: "", ...surcharge });
const payer = (id: string, montant: string, surcharge: Partial<SaisiePaiement> = {}, entrepriseId = A) => enregistrerPaiement(entrepriseId, id, saisie(montant, surcharge), AUJOURDHUI);
const lire = (id: string) => db.facture.findUniqueOrThrow({ where: { id } });
const nbPaiements = (id: string) => db.paiement.count({ where: { factureId: id } });
async function idPaiement(r: Awaited<ReturnType<typeof payer>>) {
  if (!r.ok) throw new Error(`paiement refusé : ${JSON.stringify(r)}`);
  return r.paiementId;
}

/** INVARIANT : montantPaye = somme des paiements non annulés, pour toute facture (0 quand elle n'a aucun paiement). */
async function verifierInvariant(ids: string[]) {
  for (const id of ids) {
    const paiements = await db.paiement.findMany({ where: { factureId: id }, select: { montant: true, annuleLe: true } });
    const somme = paiements.filter((p) => p.annuleLe === null).reduce((s, p) => s + p.montant, 0);
    expect((await lire(id)).montantPaye, `invariant montantPaye de la facture ${id}`).toBe(somme);
  }
}

const saisieFacture = (surcharge: Partial<SaisieFacture> = {}): SaisieFacture => ({
  cle: "modif",
  numero: "FI-MODIF",
  montant: "100 000",
  dateFacture: "2026-09-01",
  echeance: "2026-10-15",
  client: { type: "existant", id: clientA },
  ...surcharge,
});

describe("fiche facture : paiements, modification, suspension, annulation, droits, isolation", () => {
  beforeAll(async () => {
    await nettoyer();
    await db.entreprise.createMany({ data: [A, B, TDB].map((id) => ({ id, raisonSociale: `Test ${id}`, etapeOnboarding: 4 })) });
    clientA = (await db.client.create({ data: { entrepriseId: A, nom: "Kofi Agbo", whatsapp: "+22890123456" } })).id;
    clientA2 = (await db.client.create({ data: { entrepriseId: A, nom: "Ama Zola", whatsapp: "+22891000000" } })).id;
    clientB = (await db.client.create({ data: { entrepriseId: B, nom: "Ama Secrète", whatsapp: "+22890123456" } })).id;
    clientTdb = (await db.client.create({ data: { entrepriseId: TDB, nom: "Client Tdb", whatsapp: "+22892000000" } })).id;
    await db.utilisateur.createMany({
      data: [
        { id: admin.utilisateurId, nom: "Kossi Mensah", email: "test-fiche-admin@example.com", role: "ADMIN", entrepriseId: A },
        { id: collaboratrice.utilisateurId, nom: "Ama Doe", email: "test-fiche-collab@example.com", role: "COLLABORATEUR", entrepriseId: A },
        { id: adminB.utilisateurId, nom: "Yao Agbo", email: "test-fiche-admin-b@example.com", role: "ADMIN", entrepriseId: B },
        { id: adminTdb.utilisateurId, nom: "Esi Tdb", email: "test-fiche-admin-tdb@example.com", role: "ADMIN", entrepriseId: TDB },
      ],
    });
  });
  afterEach(async () => {
    const ids = touchees;
    touchees = [];
    await verifierInvariant(ids);
  });
  afterAll(async () => {
    await nettoyer();
    await db.$disconnect();
  });

  describe("paiement reçu à la main", () => {
    it("partiel puis complet : montant payé, statut et reste dû suivent", async () => {
      const id = await nouvelleFacture();
      expect(await payer(id, "40 000")).toMatchObject({ ok: true });
      let fiche = await trouverFacture(A, id, AUJOURDHUI);
      expect(fiche).toMatchObject({ montantPaye: 40_000, resteDu: 60_000, statut: "PARTIELLEMENT_PAYEE" });

      expect(await payer(id, "60 000", { operateur: "VIREMENT", reference: "VIR-77" })).toMatchObject({ ok: true });
      fiche = await trouverFacture(A, id, AUJOURDHUI);
      expect(fiche).toMatchObject({ montantPaye: 100_000, resteDu: 0, statut: "PAYEE" });
      // même jour : le plus récemment enregistré d'abord
      expect(fiche?.paiements.map((p) => [p.montant, p.operateur, p.reference, p.manuel])).toEqual([
        [60_000, "VIREMENT", "VIR-77", true],
        [40_000, "ESPECES", null, true],
      ]);
    });

    it("REFUSE un paiement supérieur au reste dû : rien n'est écrit", async () => {
      const id = await nouvelleFacture();
      const r = await payer(id, "100 001");
      expect(r).toMatchObject({ ok: false, erreurs: { montant: expect.stringMatching(/reste à payer/) } });
      expect(await nbPaiements(id)).toBe(0);
      expect(await lire(id)).toMatchObject({ montantPaye: 0, statut: "A_VENIR" });

      await payer(id, "70 000");
      const trop = await payer(id, "30 001");
      expect(trop).toMatchObject({ ok: false });
      expect(await nbPaiements(id)).toBe(1);
      expect((await lire(id)).montantPaye).toBe(70_000);
    });

    it("refuse un paiement sur une facture payée ou annulée", async () => {
      const payee = await nouvelleFacture({ montant: 50_000 });
      await payer(payee, "50 000");
      expect(await payer(payee, "1 000")).toMatchObject({ ok: false, erreurs: { montant: expect.stringMatching(/rien à payer/) } });
      const annulee = await nouvelleFacture({ statut: "ANNULEE" });
      expect(await payer(annulee, "1 000")).toMatchObject({ ok: false, erreurs: { general: expect.stringMatching(/annulée/) } });
      expect(await nbPaiements(annulee)).toBe(0);
    });

    it("SIMULTANÉS : deux paiements qui dépassent ensemble le reste dû, un seul passe", async () => {
      // Plusieurs tours : une course perdue par chance ne doit pas cacher un verrou manquant.
      for (let tour = 0; tour < 8; tour++) {
        const id = await nouvelleFacture();
        const [r1, r2, r3] = await Promise.all([payer(id, "60 000"), payer(id, "60 000"), payer(id, "60 000")]);
        expect([r1.ok, r2.ok, r3.ok].filter(Boolean), `tour ${tour}`).toHaveLength(1);
        expect(await nbPaiements(id), `tour ${tour}`).toBe(1);
        expect((await lire(id)).montantPaye, `tour ${tour}`).toBe(60_000);
      }
    });

    it("le même envoi reçu deux fois (double clic) ne crée qu'un paiement", async () => {
      const id = await nouvelleFacture();
      const envoi = saisie("30 000");
      const [r1, r2] = await Promise.all([enregistrerPaiement(A, id, envoi, AUJOURDHUI), enregistrerPaiement(A, id, envoi, AUJOURDHUI)]);
      expect(r1.ok && r2.ok).toBe(true);
      expect(await nbPaiements(id)).toBe(1);
      expect((await lire(id)).montantPaye).toBe(30_000);
      // même après, un troisième envoi identique est reconnu
      expect(await enregistrerPaiement(A, id, envoi, AUJOURDHUI)).toMatchObject({ ok: true, dejaEnregistre: true });
      expect(await nbPaiements(id)).toBe(1);
    });

    it("DATE : avant la facture refusée ; acceptée avec avertissement si la date de facture est estimée ; future refusée", async () => {
      const id = await nouvelleFacture({ dateFacture: "2026-09-10" });
      expect(await payer(id, "1 000", { date: "2026-09-09" })).toMatchObject({ ok: false, erreurs: { date: expect.stringMatching(/avant celle de la facture/) } });
      expect(await payer(id, "1 000", { date: "2026-09-21" })).toMatchObject({ ok: false, erreurs: { date: expect.stringMatching(/futur/) } });
      expect(await nbPaiements(id)).toBe(0);
      const estimee = await nouvelleFacture({ dateFacture: "2026-09-10", estimee: true });
      expect(await payer(estimee, "1 000", { date: "2026-09-09" })).toMatchObject({ ok: true, avertissements: { date: expect.stringMatching(/estimée/) } });
      expect(await nbPaiements(estimee)).toBe(1);
    });

    it("la suspension n'est pas levée par un paiement partiel ; la facture soldée passe « Payée »", async () => {
      const id = await nouvelleFacture({ statut: "SUSPENDUE" });
      await payer(id, "40 000");
      expect((await lire(id)).statut).toBe("SUSPENDUE");
      await payer(id, "60 000");
      expect((await lire(id)).statut).toBe("PAYEE");
    });

    it("le tableau de bord suit : encours, encaissé du mois et délai moyen, avant puis après l'annulation", async () => {
      const id = await nouvelleFacture({ entrepriseId: TDB, montant: 100_000, dateFacture: "2026-09-01", echeance: "2026-10-15" });
      const avant = await chargerTableauDeBord(TDB, AUJOURDHUI);
      expect(avant).toMatchObject({ encours: { montant: 100_000, nb: 1 }, encaisse: { ceMois: 0 }, delaiMoyen: { jours: null, nb: 0 } });

      const p1 = await idPaiement(await payer(id, "40 000", { date: "2026-09-05" }, TDB));
      const partiel = await chargerTableauDeBord(TDB, AUJOURDHUI);
      expect(partiel).toMatchObject({ encours: { montant: 60_000, nb: 1 }, encaisse: { ceMois: 40_000 }, delaiMoyen: { jours: null, nb: 0 } });

      const p2 = await idPaiement(await payer(id, "60 000", { date: "2026-09-15" }, TDB));
      const solde = await chargerTableauDeBord(TDB, AUJOURDHUI);
      // facture soldée : plus rien attendu ; encaissé 100 000 ; délai = dernier paiement (15/09) − facture (01/09) = 14 jours
      expect(solde).toMatchObject({ encours: { montant: 0, nb: 0 }, encaisse: { ceMois: 100_000 }, delaiMoyen: { jours: 14, nb: 1 } });

      // On annule le dernier paiement : la facture redevient partielle, le délai disparaît, l'encaissé baisse
      expect(await annulerPaiement(adminTdb, id, p2, "Erreur de montant", AUJOURDHUI)).toEqual({ ok: true });
      const apresAnnulation = await chargerTableauDeBord(TDB, AUJOURDHUI);
      expect(apresAnnulation).toMatchObject({ encours: { montant: 60_000, nb: 1 }, encaisse: { ceMois: 40_000 }, delaiMoyen: { jours: null, nb: 0, nonCompteesDateEstimee: 0 } });

      // Et si on annule aussi le premier : plus rien d'encaissé, la facture est de nouveau entière
      expect(await annulerPaiement(adminTdb, id, p1, "Paiement saisi sur la mauvaise facture", AUJOURDHUI)).toEqual({ ok: true });
      const toutAnnule = await chargerTableauDeBord(TDB, AUJOURDHUI);
      expect(toutAnnule).toMatchObject({ encours: { montant: 100_000, nb: 1 }, encaisse: { ceMois: 0, moisPrecedent: 0, nbPaiementsMoisPrecedent: 0 } });
    });

    it("un paiement annulé n'entre dans aucun chiffre : mois précédent et « date estimée non comptée » compris", async () => {
      const id = await nouvelleFacture({ entrepriseId: TDB, montant: 50_000, dateFacture: "2026-07-01", estimee: true, numero: "FI-TDB-EST" });
      const p = await idPaiement(await payer(id, "50 000", { date: "2026-08-10" }, TDB));
      const avant = await chargerTableauDeBord(TDB, AUJOURDHUI);
      expect(avant.encaisse).toMatchObject({ moisPrecedent: 50_000, nbPaiementsMoisPrecedent: 1 });
      expect(avant.delaiMoyen.nonCompteesDateEstimee).toBe(1);
      await annulerPaiement(adminTdb, id, p, "Doublon", AUJOURDHUI);
      const apres = await chargerTableauDeBord(TDB, AUJOURDHUI);
      expect(apres.encaisse).toMatchObject({ moisPrecedent: 0, nbPaiementsMoisPrecedent: 0 });
      expect(apres.delaiMoyen.nonCompteesDateEstimee).toBe(0);
    });
  });

  describe("annulation d'un paiement", () => {
    it("partiel annulé : montant payé, reste dû et statut reviennent à l'état d'avant, la trace est gardée", async () => {
      const id = await nouvelleFacture();
      const p = await idPaiement(await payer(id, "40 000"));
      expect(await annulerPaiement(admin, id, p, "  Faute de frappe  ", AUJOURDHUI)).toEqual({ ok: true });

      expect(await trouverFacture(A, id, AUJOURDHUI)).toMatchObject({ montantPaye: 0, resteDu: 100_000, statut: "A_VENIR" });
      const ligne = await db.paiement.findUniqueOrThrow({ where: { id: p } });
      expect(ligne).toMatchObject({ montant: 40_000, motifAnnulation: "Faute de frappe", annuleParId: admin.utilisateurId });
      expect(ligne.annuleLe).toBeInstanceOf(Date);
      // toujours dans l'historique, avec sa trace
      const fiche = await trouverFacture(A, id, AUJOURDHUI);
      expect(fiche?.paiements).toHaveLength(1);
      expect(fiche?.paiements[0].annule).toMatchObject({ parPrenom: "Kossi", motif: "Faute de frappe" });
    });

    it("complet annulé : « Payée » devient « Partiellement payée » ; échéance passée et plus rien de payé : « Échue »", async () => {
      const id = await nouvelleFacture();
      const p1 = await idPaiement(await payer(id, "40 000"));
      const p2 = await idPaiement(await payer(id, "60 000"));
      expect((await lire(id)).statut).toBe("PAYEE");
      await annulerPaiement(admin, id, p2, "Erreur", AUJOURDHUI);
      expect(await lire(id)).toMatchObject({ statut: "PARTIELLEMENT_PAYEE", montantPaye: 40_000 });

      const enRetard = await nouvelleFacture({ echeance: "2026-09-01", statut: "ECHUE" });
      const p3 = await idPaiement(await payer(enRetard, "100 000"));
      await annulerPaiement(admin, enRetard, p3, "Erreur", AUJOURDHUI);
      expect(await lire(enRetard)).toMatchObject({ statut: "ECHUE", montantPaye: 0 });
      await annulerPaiement(admin, id, p1, "Erreur", AUJOURDHUI);
    });

    it("une facture suspendue le reste après l'annulation", async () => {
      const id = await nouvelleFacture({ statut: "SUSPENDUE" });
      const p = await idPaiement(await payer(id, "40 000"));
      await annulerPaiement(admin, id, p, "Erreur", AUJOURDHUI);
      expect(await lire(id)).toMatchObject({ statut: "SUSPENDUE", montantPaye: 0 });
    });

    it("le motif est obligatoire : 2 caractères refusés, 3 et 200 acceptés, 201 refusés", async () => {
      const id = await nouvelleFacture();
      const p1 = await idPaiement(await payer(id, "10 000"));
      const p2 = await idPaiement(await payer(id, "10 000"));
      const p3 = await idPaiement(await payer(id, "10 000"));
      expect(await annulerPaiement(admin, id, p1, "ab", AUJOURDHUI)).toMatchObject({ ok: false, champ: "motif" });
      expect(await annulerPaiement(admin, id, p1, "x".repeat(201), AUJOURDHUI)).toMatchObject({ ok: false, champ: "motif" });
      expect(await annulerPaiement(admin, id, p1, "", AUJOURDHUI)).toMatchObject({ ok: false, champ: "motif" });
      expect((await lire(id)).montantPaye).toBe(30_000);
      expect(await annulerPaiement(admin, id, p2, "abc", AUJOURDHUI)).toEqual({ ok: true });
      expect(await annulerPaiement(admin, id, p3, "x".repeat(200), AUJOURDHUI)).toEqual({ ok: true });
      expect((await lire(id)).montantPaye).toBe(10_000);
    });

    it("refuse un paiement PayGate, un paiement déjà annulé, et un paiement d'une autre facture", async () => {
      const id = await nouvelleFacture();
      const autre = await nouvelleFacture();
      const paygate = await db.paiement.create({ data: { factureId: id, montant: 20_000, operateur: "FLOOZ", referenceTx: "PAYGATE-TEST-1", payeLe: jour("2026-09-10") } });
      await db.facture.update({ where: { id }, data: { montantPaye: 20_000, statut: "PARTIELLEMENT_PAYEE" } });
      expect(await annulerPaiement(admin, id, paygate.id, "Erreur", AUJOURDHUI)).toMatchObject({ ok: false, erreur: expect.stringMatching(/Mobile Money/) });
      expect(await lire(id)).toMatchObject({ montantPaye: 20_000, statut: "PARTIELLEMENT_PAYEE" });

      const p = await idPaiement(await payer(id, "10 000"));
      expect(await annulerPaiement(admin, id, p, "Erreur", AUJOURDHUI)).toEqual({ ok: true });
      expect(await annulerPaiement(admin, id, p, "Encore", AUJOURDHUI)).toMatchObject({ ok: false, erreur: expect.stringMatching(/déjà annulé/) });
      expect((await lire(id)).montantPaye).toBe(20_000);

      const pAutre = await idPaiement(await payer(autre, "10 000"));
      expect(await annulerPaiement(admin, id, pAutre, "Erreur", AUJOURDHUI)).toEqual({ ok: false, introuvable: true }); // le paiement est d'une AUTRE facture, même entreprise
      expect((await lire(autre)).montantPaye).toBe(10_000);
    });

    it("SIMULTANÉS : annuler un paiement pendant qu'on en enregistre un autre ne fausse jamais le montant payé", async () => {
      const id = await nouvelleFacture();
      const p = await idPaiement(await payer(id, "30 000"));
      const [annulation, nouveau] = await Promise.all([annulerPaiement(admin, id, p, "Erreur", AUJOURDHUI), payer(id, "80 000")]);
      expect(annulation).toEqual({ ok: true });
      // selon l'ordre : refusé (30 000 déjà payés, il en reste 70 000) ou accepté (facture redevenue entière)
      expect((await lire(id)).montantPaye).toBe(nouveau.ok ? 80_000 : 0);
    });
  });

  describe("droits : annuler est réservé aux administrateurs", () => {
    it("une collaboratrice ne peut annuler ni une facture ni un paiement, et rien n'est écrit", async () => {
      const id = await nouvelleFacture();
      const p = await idPaiement(await payer(id, "40 000"));
      expect(await annulerPaiement(collaboratrice, id, p, "Erreur de frappe", AUJOURDHUI)).toEqual({ ok: false, interdit: true });
      expect(await lire(id)).toMatchObject({ montantPaye: 40_000, statut: "PARTIELLEMENT_PAYEE" });
      expect((await db.paiement.findUniqueOrThrow({ where: { id: p } })).annuleLe).toBeNull();

      const sansPaiement = await nouvelleFacture();
      expect(await annulerFacture(collaboratrice, sansPaiement)).toEqual({ ok: false, interdit: true });
      expect((await lire(sansPaiement)).statut).toBe("A_VENIR");
    });

    it("elle peut tout le reste : voir, modifier, payer, suspendre, reprendre", async () => {
      const id = await nouvelleFacture({ numero: "FI-COLLAB" });
      expect(await trouverFacture(collaboratrice.entrepriseId, id, AUJOURDHUI)).not.toBeNull();
      expect(await payer(id, "10 000")).toMatchObject({ ok: true });
      expect(await modifierFacture(collaboratrice.entrepriseId, id, saisieFacture({ numero: "FI-COLLAB", montant: "120 000" }), AUJOURDHUI)).toEqual({ ok: true });
      expect(await suspendreRelances(collaboratrice.entrepriseId, id)).toEqual({ ok: true });
      expect(await reprendreRelances(collaboratrice.entrepriseId, id, AUJOURDHUI)).toEqual({ ok: true });
    });
  });

  describe("modification", () => {
    it("change montant, dates, numéro et client ; le statut est recalculé", async () => {
      const id = await nouvelleFacture();
      const r = await modifierFacture(A, id, saisieFacture({ numero: "FI-NOUVEAU", montant: "250 000", echeance: "2026-09-01", client: { type: "existant", id: clientA2 } }), AUJOURDHUI);
      expect(r).toEqual({ ok: true });
      expect(await lire(id)).toMatchObject({ numero: "FI-NOUVEAU", montant: 250_000, clientId: clientA2, statut: "ECHUE" });
    });

    it("REFUSE un montant inférieur à ce qui est déjà payé ; l'égaler solde la facture", async () => {
      const id = await nouvelleFacture();
      await payer(id, "60 000");
      const r = await modifierFacture(A, id, saisieFacture({ numero: (await lire(id)).numero, montant: "59 999" }), AUJOURDHUI);
      expect(r).toMatchObject({ ok: false, erreurs: { montant: expect.stringMatching(/déjà payé : 60\s000\sFCFA/) } });
      expect((await lire(id)).montant).toBe(100_000);
      expect(await modifierFacture(A, id, saisieFacture({ numero: (await lire(id)).numero, montant: "60 000" }), AUJOURDHUI)).toEqual({ ok: true });
      expect(await lire(id)).toMatchObject({ montant: 60_000, statut: "PAYEE" });
    });

    it("refuse un numéro déjà pris dans l'entreprise, mais garde le sien ; les mêmes numéros existent librement chez une autre entreprise", async () => {
      const a1 = await nouvelleFacture({ numero: "FI-PRIS" });
      const a2 = await nouvelleFacture({ numero: "FI-LIBRE" });
      await nouvelleFacture({ entrepriseId: B, numero: "FI-CHEZ-B" });
      expect(await modifierFacture(A, a2, saisieFacture({ numero: "FI-PRIS" }), AUJOURDHUI)).toMatchObject({ ok: false, erreurs: { numero: expect.stringMatching(/déjà utilisé/) } });
      expect(await modifierFacture(A, a1, saisieFacture({ numero: "FI-PRIS" }), AUJOURDHUI)).toEqual({ ok: true });
      expect(await modifierFacture(A, a2, saisieFacture({ numero: "FI-CHEZ-B" }), AUJOURDHUI)).toEqual({ ok: true }); // ce numéro n'existe que chez B
    });

    it("refuse un client d'une autre entreprise", async () => {
      const id = await nouvelleFacture();
      const r = await modifierFacture(A, id, saisieFacture({ numero: (await lire(id)).numero, client: { type: "existant", id: clientB } }), AUJOURDHUI);
      expect(r).toMatchObject({ ok: false, erreurs: { client: expect.any(String) } });
      expect((await lire(id)).clientId).toBe(clientA);
    });

    it("changer la date de facture la confirme : elle n'est plus « estimée » ; sans changement, elle le reste", async () => {
      const id = await nouvelleFacture({ estimee: true, dateFacture: "2026-09-01" });
      const numero = (await lire(id)).numero;
      await modifierFacture(A, id, saisieFacture({ numero, dateFacture: "2026-09-01", montant: "110 000" }), AUJOURDHUI);
      expect((await lire(id)).dateFactureEstimee).toBe(true);
      await modifierFacture(A, id, saisieFacture({ numero, dateFacture: "2026-09-02", montant: "110 000" }), AUJOURDHUI);
      expect((await lire(id)).dateFactureEstimee).toBe(false);
    });

    it("une facture annulée ne se modifie plus ; les règles de la saisie rapide s'appliquent (échéance avant la facture)", async () => {
      const annulee = await nouvelleFacture({ statut: "ANNULEE" });
      expect(await modifierFacture(A, annulee, saisieFacture({ numero: (await lire(annulee)).numero }), AUJOURDHUI)).toMatchObject({ ok: false, erreurs: { general: expect.stringMatching(/annulée/) } });
      const id = await nouvelleFacture();
      expect(await modifierFacture(A, id, saisieFacture({ numero: (await lire(id)).numero, dateFacture: "2026-11-01", echeance: "2026-10-01" }), AUJOURDHUI)).toMatchObject({ ok: false, erreurs: { echeance: expect.any(String) } });
    });
  });

  describe("suspendre, reprendre, annuler la facture", () => {
    it("suspend puis reprend les relances ; la reprise déduit le statut de l'échéance et des paiements", async () => {
      const id = await nouvelleFacture({ echeance: "2026-09-01", statut: "ECHUE" });
      expect(await suspendreRelances(A, id)).toEqual({ ok: true });
      expect((await lire(id)).statut).toBe("SUSPENDUE");
      expect(await suspendreRelances(A, id)).toMatchObject({ ok: false, erreur: expect.stringMatching(/déjà suspendues/) });
      expect(await reprendreRelances(A, id, AUJOURDHUI)).toEqual({ ok: true });
      expect((await lire(id)).statut).toBe("ECHUE");
      expect(await reprendreRelances(A, id, AUJOURDHUI)).toMatchObject({ ok: false });

      const partielle = await nouvelleFacture({ statut: "SUSPENDUE" });
      await payer(partielle, "10 000");
      await reprendreRelances(A, partielle, AUJOURDHUI);
      expect((await lire(partielle)).statut).toBe("PARTIELLEMENT_PAYEE");
    });

    it("ne suspend ni une facture payée ni une facture annulée", async () => {
      const payee = await nouvelleFacture({ montant: 10_000 });
      await payer(payee, "10 000");
      expect(await suspendreRelances(A, payee)).toMatchObject({ ok: false });
      const annulee = await nouvelleFacture({ statut: "ANNULEE" });
      expect(await suspendreRelances(A, annulee)).toMatchObject({ ok: false });
    });

    it("annuler une facture sans paiement : « Annulée » ; on ne supprime jamais, la facture reste lisible", async () => {
      const id = await nouvelleFacture();
      expect(await annulerFacture(admin, id)).toEqual({ ok: true });
      expect(await lire(id)).toMatchObject({ statut: "ANNULEE" });
      expect(await trouverFacture(A, id, AUJOURDHUI)).toMatchObject({ statut: "ANNULEE", resteDu: 0 });
      expect(await annulerFacture(admin, id)).toMatchObject({ ok: false, erreur: expect.stringMatching(/déjà annulée/) });
    });

    it("REFUSÉE tant qu'un paiement n'est pas annulé ; acceptée quand tous le sont", async () => {
      const id = await nouvelleFacture();
      const p1 = await idPaiement(await payer(id, "30 000"));
      const p2 = await idPaiement(await payer(id, "20 000"));
      expect(await annulerFacture(admin, id)).toEqual({ ok: false, erreur: "Cette facture a déjà reçu des paiements, elle ne peut pas être annulée." });
      await annulerPaiement(admin, id, p1, "Erreur", AUJOURDHUI);
      expect(await annulerFacture(admin, id)).toMatchObject({ ok: false });
      await annulerPaiement(admin, id, p2, "Erreur", AUJOURDHUI);
      expect(await annulerFacture(admin, id)).toEqual({ ok: true });
      expect(await lire(id)).toMatchObject({ statut: "ANNULEE", montantPaye: 0 });
      // et une facture annulée ne laisse plus toucher à ses paiements
      expect(await annulerPaiement(admin, id, p1, "Encore", AUJOURDHUI)).toMatchObject({ ok: false });
    });
  });

  describe("ISOLATION entre entreprises", () => {
    it("la facture d'une autre entreprise est introuvable : aucune lecture, aucune écriture, rien ne change", async () => {
      const id = await nouvelleFacture();
      const p = await idPaiement(await payer(id, "40 000"));
      const avant = await lire(id);

      expect(await trouverFacture(B, id, AUJOURDHUI)).toBeNull();
      expect(await payer(id, "10 000", {}, B)).toEqual({ ok: false, introuvable: true });
      expect(await modifierFacture(B, id, saisieFacture({ numero: "PIRATE", client: { type: "existant", id: clientB } }), AUJOURDHUI)).toEqual({ ok: false, introuvable: true });
      expect(await suspendreRelances(B, id)).toEqual({ ok: false, introuvable: true });
      expect(await reprendreRelances(B, id, AUJOURDHUI)).toEqual({ ok: false, introuvable: true });
      expect(await annulerFacture(adminB, id)).toEqual({ ok: false, introuvable: true });
      expect(await annulerPaiement(adminB, id, p, "Piratage", AUJOURDHUI)).toEqual({ ok: false, introuvable: true });

      expect(await lire(id)).toEqual(avant);
      expect(await nbPaiements(id)).toBe(1);
      expect((await db.paiement.findUniqueOrThrow({ where: { id: p } })).annuleLe).toBeNull();
    });

    it("l'identifiant d'envoi d'un paiement ne permet pas de toucher une autre entreprise", async () => {
      const idA = await nouvelleFacture();
      const idB = await nouvelleFacture({ entrepriseId: B });
      const envoi = saisie("10 000");
      expect(await enregistrerPaiement(A, idA, envoi, AUJOURDHUI)).toMatchObject({ ok: true });
      // même identifiant d'envoi utilisé sur la facture de B : refusé, rien n'est écrit chez B
      expect(await enregistrerPaiement(B, idB, envoi, AUJOURDHUI)).toMatchObject({ ok: false });
      expect(await nbPaiements(idB)).toBe(0);
      expect((await lire(idB)).montantPaye).toBe(0);
    });

    it("une facture inexistante est introuvable", async () => {
      expect(await trouverFacture(A, "identifiant-inexistant", AUJOURDHUI)).toBeNull();
      expect(await payer("identifiant-inexistant", "1 000")).toEqual({ ok: false, introuvable: true });
    });
  });

  describe("invariant montantPaye, sur toute la base", () => {
    it("aucune facture n'a un montantPaye différent de la somme de ses paiements non annulés (0 sans paiement)", async () => {
      const [{ n }] = await db.$queryRaw<{ n: bigint }[]>`
        SELECT COUNT(*) AS n FROM "Facture" f
        WHERE f."montantPaye" <> (SELECT COALESCE(SUM(p.montant), 0) FROM "Paiement" p WHERE p."factureId" = f.id AND p."annuleLe" IS NULL)`;
      expect(Number(n)).toBe(0);
    });
  });
});
