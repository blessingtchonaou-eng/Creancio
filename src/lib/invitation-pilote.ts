import { randomBytes, createHmac } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Lien d'inscription à usage unique, envoyé par WhatsApp à une demande de pilote pendant que l'inscription publique
 * est fermée (INSCRIPTIONS_OUVERTES=false, voir src/lib/inscriptions.ts). Le jeton en clair n'est jamais stocké :
 * seule son empreinte HMAC (même mécanisme que src/lib/limite-debit.ts, secret et algorithme partagés mais espace de
 * noms distinct : une empreinte de jeton ne peut pas être confondue avec une empreinte d'IP ou d'e-mail).
 */
const DUREE_VALIDITE_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

/** Même message quel que soit le problème (jeton absent, expiré ou déjà utilisé) : on ne détaille pas la raison. */
export const MESSAGE_INVITATION_INVALIDE = "Ce lien d'invitation n'est plus valide. Demandez-en un nouveau à l'équipe Créancio.";

function hacherJeton(jetonBrut: string): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET manquant : impossible de vérifier un jeton d'invitation.");
  return createHmac("sha256", secret).update(`invitation:${jetonBrut}`).digest("hex");
}

export type CreationInvitation = { ok: true; jeton: string; expireLe: Date } | { ok: false; raison: "introuvable" | "deja_inscrite" | "abandonnee" };

/**
 * Crée un lien d'inscription pour une demande de pilote. Invalide d'abord toute invitation non utilisée déjà émise
 * pour cette demande (expiration immédiate, jamais supprimée : un seul lien actif à la fois). Le jeton en clair n'est
 * renvoyé qu'ici, à afficher une fois dans l'écran d'administration ; il n'est jamais remis dans une redirection.
 */
export async function creerInvitation(demandePiloteId: string, creeParId: string): Promise<CreationInvitation> {
  const demande = await db.demandePilote.findUnique({ where: { id: demandePiloteId }, select: { statut: true } });
  if (!demande) return { ok: false, raison: "introuvable" };
  if (demande.statut === "INSCRITE") return { ok: false, raison: "deja_inscrite" };
  if (demande.statut === "ABANDONNEE") return { ok: false, raison: "abandonnee" };

  const jeton = randomBytes(24).toString("base64url");
  const expireLe = new Date(Date.now() + DUREE_VALIDITE_MS);
  await db.$transaction([
    db.invitationPilote.updateMany({ where: { demandePiloteId, utiliseLe: null }, data: { expireLe: new Date() } }),
    db.invitationPilote.create({ data: { demandePiloteId, jetonHache: hacherJeton(jeton), expireLe, creeParId } }),
  ]);
  return { ok: true, jeton, expireLe };
}

export type VerificationInvitation = { valide: true } | { valide: false };

/** Vérifie un jeton sans le consommer : utilisé pour décider quoi afficher sur /inscription. */
export async function verifierInvitation(jetonBrut: string | null): Promise<VerificationInvitation> {
  if (!jetonBrut) return { valide: false };
  const invitation = await db.invitationPilote.findUnique({ where: { jetonHache: hacherJeton(jetonBrut) } });
  if (!invitation || invitation.utiliseLe || invitation.expireLe <= new Date()) return { valide: false };
  return { valide: true };
}

export type Reservation = { id: string; demandePiloteId: string };

/**
 * Réserve atomiquement un jeton avant d'appeler Better Auth : garantit l'usage unique même si le formulaire est
 * soumis deux fois en même temps (même mécanisme d'UPDATE ... RETURNING atomique que src/lib/limite-debit.ts).
 * `null` si le jeton est inconnu, déjà utilisé ou expiré. Si la création du compte échoue ensuite, appeler
 * `libererInvitation` pour permettre un nouvel essai avec le même lien.
 */
export async function reserverInvitation(jetonBrut: string): Promise<Reservation | null> {
  const jetonHache = hacherJeton(jetonBrut);
  const [ligne] = await db.$queryRawUnsafe<Reservation[]>(
    `UPDATE "InvitationPilote" SET "utiliseLe" = now() WHERE "jetonHache" = $1 AND "utiliseLe" IS NULL AND "expireLe" > now() RETURNING "id", "demandePiloteId"`,
    jetonHache,
  );
  return ligne ?? null;
}

/** Libère une invitation réservée dont la création de compte a finalement échoué (e-mail déjà pris, par exemple). */
export async function libererInvitation(invitationId: string): Promise<void> {
  await db.invitationPilote.update({ where: { id: invitationId }, data: { utiliseLe: null } });
}

/**
 * Après la création réussie du compte : associe l'utilisateur à l'invitation et fait passer la demande à INSCRITE.
 * Best-effort : un échec ici est journalisé par l'appelant mais ne doit jamais faire échouer l'inscription elle-même
 * (le compte existe déjà, c'est ce qui compte).
 */
export async function finaliserInvitation(invitationId: string, demandePiloteId: string, utilisateurId: string): Promise<void> {
  await db.$transaction([
    db.invitationPilote.update({ where: { id: invitationId }, data: { utiliseParId: utilisateurId } }),
    db.demandePilote.update({ where: { id: demandePiloteId }, data: { statut: "INSCRITE" } }),
  ]);
}
