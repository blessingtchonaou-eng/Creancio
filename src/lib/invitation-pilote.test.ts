import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { creerInvitation, finaliserInvitation, libererInvitation, reserverInvitation, verifierInvitation } from "./invitation-pilote";

// Test d'intégration : nécessite la base de développement (docker compose up -d).
const ADMIN = "test-invitation-admin";
const UTILISATEUR = "test-invitation-utilisateur";
const DEMANDE = "test-invitation-demande";
const DEMANDE_INSCRITE = "test-invitation-demande-inscrite";
const DEMANDE_ABANDONNEE = "test-invitation-demande-abandonnee";

async function nettoyer() {
  await db.invitationPilote.deleteMany({ where: { demandePiloteId: { in: [DEMANDE, DEMANDE_INSCRITE, DEMANDE_ABANDONNEE] } } });
  await db.demandePilote.deleteMany({ where: { id: { in: [DEMANDE, DEMANDE_INSCRITE, DEMANDE_ABANDONNEE] } } });
  await db.utilisateur.deleteMany({ where: { id: { in: [ADMIN, UTILISATEUR] } } });
}

describe("invitations d'inscription pilote", () => {
  beforeAll(async () => {
    await nettoyer();
    await db.utilisateur.createMany({
      data: [
        { id: ADMIN, nom: "Admin Test", email: "admin-invitation@example.com", role: "ADMIN" },
        { id: UTILISATEUR, nom: "Nouvelle PME", email: "nouvelle-pme@example.com" },
      ],
    });
  });

  afterAll(async () => {
    await nettoyer();
    await db.$disconnect();
  });

  beforeEach(async () => {
    await db.invitationPilote.deleteMany({ where: { demandePiloteId: { in: [DEMANDE, DEMANDE_INSCRITE, DEMANDE_ABANDONNEE] } } });
    await db.demandePilote.deleteMany({ where: { id: { in: [DEMANDE, DEMANDE_INSCRITE, DEMANDE_ABANDONNEE] } } });
    await db.demandePilote.createMany({
      data: [
        { id: DEMANDE, nomEntreprise: "Boutique Test", whatsapp: "+22890000001", consentement: true, statut: "NOUVELLE" },
        { id: DEMANDE_INSCRITE, nomEntreprise: "Déjà inscrite", whatsapp: "+22890000002", consentement: true, statut: "INSCRITE" },
        { id: DEMANDE_ABANDONNEE, nomEntreprise: "Abandonnée", whatsapp: "+22890000003", consentement: true, statut: "ABANDONNEE" },
      ],
    });
  });

  it("crée un jeton valide pour une demande NOUVELLE ou CONTACTEE", async () => {
    const r = await creerInvitation(DEMANDE, ADMIN);
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("inattendu");
    expect(r.jeton.length).toBeGreaterThan(20);
    expect(await verifierInvitation(r.jeton)).toEqual({ valide: true });
  });

  it("refuse pour une demande introuvable, déjà inscrite ou abandonnée", async () => {
    expect(await creerInvitation("id-inconnu", ADMIN)).toEqual({ ok: false, raison: "introuvable" });
    expect(await creerInvitation(DEMANDE_INSCRITE, ADMIN)).toEqual({ ok: false, raison: "deja_inscrite" });
    expect(await creerInvitation(DEMANDE_ABANDONNEE, ADMIN)).toEqual({ ok: false, raison: "abandonnee" });
  });

  it("un jeton inconnu, vide ou nul n'est jamais valide", async () => {
    expect(await verifierInvitation(null)).toEqual({ valide: false });
    expect(await verifierInvitation("")).toEqual({ valide: false });
    expect(await verifierInvitation("jeton-invente")).toEqual({ valide: false });
  });

  it("créer un nouveau lien invalide l'ancien non utilisé (un seul lien actif par demande)", async () => {
    const premier = await creerInvitation(DEMANDE, ADMIN);
    const second = await creerInvitation(DEMANDE, ADMIN);
    if (!premier.ok || !second.ok) throw new Error("inattendu");
    expect(await verifierInvitation(premier.jeton)).toEqual({ valide: false });
    expect(await verifierInvitation(second.jeton)).toEqual({ valide: true });
  });

  it("un jeton expiré n'est plus valide", async () => {
    const r = await creerInvitation(DEMANDE, ADMIN);
    if (!r.ok) throw new Error("inattendu");
    await db.invitationPilote.updateMany({ where: { demandePiloteId: DEMANDE }, data: { expireLe: new Date(Date.now() - 1000) } });
    expect(await verifierInvitation(r.jeton)).toEqual({ valide: false });
    expect(await reserverInvitation(r.jeton)).toBeNull();
  });

  it("réserve un jeton une fois, le refuse ensuite (usage unique)", async () => {
    const r = await creerInvitation(DEMANDE, ADMIN);
    if (!r.ok) throw new Error("inattendu");
    const reservation = await reserverInvitation(r.jeton);
    expect(reservation).toMatchObject({ demandePiloteId: DEMANDE });
    expect(await reserverInvitation(r.jeton)).toBeNull();
    expect(await verifierInvitation(r.jeton)).toEqual({ valide: false });
  });

  it("deux réservations simultanées du même jeton : une seule réussit", async () => {
    const r = await creerInvitation(DEMANDE, ADMIN);
    if (!r.ok) throw new Error("inattendu");
    const resultats = await Promise.all([reserverInvitation(r.jeton), reserverInvitation(r.jeton)]);
    const reussies = resultats.filter((x) => x !== null);
    expect(reussies).toHaveLength(1);
  });

  it("libérer une réservation permet de réessayer avec le même jeton", async () => {
    const r = await creerInvitation(DEMANDE, ADMIN);
    if (!r.ok) throw new Error("inattendu");
    const reservation = await reserverInvitation(r.jeton);
    if (!reservation) throw new Error("inattendu");
    await libererInvitation(reservation.id);
    expect(await reserverInvitation(r.jeton)).toMatchObject({ demandePiloteId: DEMANDE });
  });

  it("finaliser associe l'utilisateur et fait passer la demande à INSCRITE", async () => {
    const r = await creerInvitation(DEMANDE, ADMIN);
    if (!r.ok) throw new Error("inattendu");
    const reservation = await reserverInvitation(r.jeton);
    if (!reservation) throw new Error("inattendu");
    await finaliserInvitation(reservation.id, reservation.demandePiloteId, UTILISATEUR);
    const invitation = await db.invitationPilote.findUnique({ where: { id: reservation.id } });
    const demande = await db.demandePilote.findUnique({ where: { id: DEMANDE } });
    expect(invitation?.utiliseParId).toBe(UTILISATEUR);
    expect(demande?.statut).toBe("INSCRITE");
  });
});
