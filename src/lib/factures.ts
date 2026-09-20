import { db } from "@/lib/db";
import { clientsAvecNumero, type ClientMemeNumero } from "@/lib/clients";
import { jourDuJour, normaliserNom, statutSelonEcheance } from "@/lib/import/analyse";
import { validerSaisie, suggererNumero, type ChampSaisie, type SaisieFacture } from "@/lib/factures-saisie";

/**
 * Saisie rapide d'une facture. Toutes les fonctions prennent l'entrepriseId de la session (jamais du navigateur)
 * et l'appliquent à chaque requête : on ne lit, ne crée et ne rattache rien à une autre entreprise.
 */

export type ResultatFacture =
  | { ok: true; id: string; clientId: string; numero: string; /** Envoyée deux fois (connexion coupée pendant l'envoi) : rien n'a été dupliqué. */ dejaEnregistree?: boolean }
  | { ok: false; erreurs: Partial<Record<ChampSaisie, string>> }
  | { ok: false; doublon: { whatsapp: string; clients: ClientMemeNumero[] } };

export const CLIENTS_SAISIE_MAX = 1000;

/** Clients proposés dans la saisie : chargés une fois avec la page, pour pouvoir chercher même sans connexion. */
export async function clientsPourSaisie(entrepriseId: string) {
  return db.client.findMany({
    where: { entrepriseId },
    select: { id: true, nom: true, whatsapp: true },
    orderBy: [{ nom: "asc" }, { id: "asc" }],
    take: CLIENTS_SAISIE_MAX,
  });
}

/** Prochain numéro FA-AAAA-NNNN de l'entreprise pour l'année donnée. */
export async function numeroSuggere(entrepriseId: string, annee: number): Promise<string> {
  const factures = await db.facture.findMany({ where: { entrepriseId, numero: { startsWith: `FA-${annee}-` } }, select: { numero: true } });
  return suggererNumero(
    factures.map((f) => f.numero),
    annee,
  );
}

const estViolationUnicite = (e: unknown) => typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "P2002";

export async function creerFacture(entrepriseId: string, saisie: SaisieFacture): Promise<ResultatFacture> {
  const validation = validerSaisie(saisie);
  if (!validation.ok) return { ok: false, erreurs: validation.erreurs };
  const { numero, montant, dateFacture, echeance, client } = validation.valeur;

  // Numéro déjà enregistré : soit c'est cette même facture envoyée une seconde fois (rien à faire), soit le numéro est pris.
  const existante = await db.facture.findFirst({
    where: { entrepriseId, numero },
    select: { id: true, clientId: true, montant: true, echeance: true, dateFacture: true, client: { select: { nom: true, whatsapp: true } } },
  });
  if (existante) {
    const memeClient =
      client.type === "existant"
        ? existante.clientId === client.id
        : existante.client.whatsapp === client.whatsapp && normaliserNom(existante.client.nom) === normaliserNom(client.nom);
    const identique =
      memeClient && existante.montant === montant && existante.echeance.toISOString().slice(0, 10) === echeance && existante.dateFacture.toISOString().slice(0, 10) === dateFacture;
    if (identique) return { ok: true, id: existante.id, clientId: existante.clientId, numero, dejaEnregistree: true };
    return { ok: false, erreurs: { numero: `Le numéro ${numero} est déjà utilisé par une autre facture. Choisissez un autre numéro.` } };
  }

  let clientExistantId: string | undefined;
  if (client.type === "existant") {
    const trouve = await db.client.findFirst({ where: { id: client.id, entrepriseId }, select: { id: true } });
    if (!trouve) return { ok: false, erreurs: { client: "Ce client n'existe plus. Choisissez-en un autre." } };
  } else if (saisie.confirmerNumero !== client.whatsapp) {
    const memes = await clientsAvecNumero(entrepriseId, client.whatsapp);
    // Même nom et même numéro qu'un client connu : c'est lui (facture saisie hors connexion, client retapé). Rien à confirmer.
    const memeNom = memes.filter((c) => normaliserNom(c.nom) === normaliserNom(client.nom));
    if (memeNom.length === 1) clientExistantId = memeNom[0].id;
    else if (memes.length > 0) return { ok: false, doublon: { whatsapp: client.whatsapp, clients: memes } };
  }

  try {
    const facture = await db.$transaction(async (tx) => {
      const clientId =
        client.type === "existant"
          ? client.id
          : (clientExistantId ?? (await tx.client.create({ data: { entrepriseId, nom: client.nom, whatsapp: client.whatsapp }, select: { id: true } })).id);
      const creee = await tx.facture.create({
        data: {
          entrepriseId,
          clientId,
          numero,
          montant,
          dateFacture: new Date(`${dateFacture}T00:00:00.000Z`),
          echeance: new Date(`${echeance}T00:00:00.000Z`),
          statut: statutSelonEcheance(echeance, jourDuJour()),
        },
        select: { id: true },
      });
      return { id: creee.id, clientId };
    });
    return { ok: true, id: facture.id, clientId: facture.clientId, numero };
  } catch (e) {
    // Deux envois en même temps avec le même numéro : la contrainte d'unicité en base a tranché (et la transaction a tout annulé).
    if (estViolationUnicite(e)) return { ok: false, erreurs: { numero: `Le numéro ${numero} est déjà utilisé par une autre facture. Choisissez un autre numéro.` } };
    throw e;
  }
}
