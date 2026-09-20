import { db } from "@/lib/db";
import { aujourdhuiIso, statutAffiche } from "@/lib/status";
import type { Prisma } from "@/generated/prisma/client";
import type { StatutFacture } from "@/generated/prisma/enums";

/**
 * Toutes les fonctions de ce fichier prennent l'entrepriseId de la session (jamais du navigateur)
 * et l'appliquent à chaque requête : une entreprise ne voit ni ne modifie les clients d'une autre.
 */

/** Statuts d'une facture qu'il reste à encaisser. Les factures payées et annulées ne comptent pas. */
export const STATUTS_DUS: StatutFacture[] = ["A_VENIR", "ECHUE", "EN_RELANCE", "PARTIELLEMENT_PAYEE", "SUSPENDUE"];

export const TAILLE_PAGE = 25;

export interface DonneesClient {
  nom: string;
  whatsapp: string; // E.164
  email: string | null;
}

export interface ClientMemeNumero {
  id: string;
  nom: string;
}

/** Créer ou modifier un client : succès, client introuvable, ou numéro déjà utilisé (l'utilisateur doit confirmer). */
export type ResultatClient =
  | { ok: true; id: string }
  | { ok: false; introuvable: true }
  | { ok: false; doublon: ClientMemeNumero[] };

/** Autres clients de l'entreprise qui ont déjà ce numéro. Un même numéro peut servir à plusieurs clients : c'est un avertissement, pas une interdiction. */
export async function clientsAvecNumero(entrepriseId: string, whatsapp: string, sauf?: string): Promise<ClientMemeNumero[]> {
  return db.client.findMany({
    where: { entrepriseId, whatsapp, ...(sauf ? { id: { not: sauf } } : {}) },
    select: { id: true, nom: true },
    orderBy: { nom: "asc" },
  });
}

/** Sans confirmation, un numéro déjà utilisé n'enregistre rien et renvoie les clients concernés. */
export async function creerClient(
  entrepriseId: string,
  data: DonneesClient,
  { confirmerDoublon = false }: { confirmerDoublon?: boolean } = {},
): Promise<Exclude<ResultatClient, { introuvable: true }>> {
  if (!confirmerDoublon) {
    const doublon = await clientsAvecNumero(entrepriseId, data.whatsapp);
    if (doublon.length > 0) return { ok: false, doublon };
  }
  const client = await db.client.create({ data: { ...data, entrepriseId }, select: { id: true } });
  return { ok: true, id: client.id };
}

export async function modifierClient(
  entrepriseId: string,
  id: string,
  data: DonneesClient,
  { confirmerDoublon = false }: { confirmerDoublon?: boolean } = {},
): Promise<ResultatClient> {
  // Le filtre entrepriseId est dans chaque requête : l'identifiant d'un client d'une autre entreprise ne touche rien.
  const actuel = await db.client.findFirst({ where: { id, entrepriseId }, select: { whatsapp: true } });
  if (!actuel) return { ok: false, introuvable: true };
  // On ne prévient que si le numéro change : modifier le nom d'un client dont le numéro est déjà partagé reste possible.
  if (!confirmerDoublon && actuel.whatsapp !== data.whatsapp) {
    const doublon = await clientsAvecNumero(entrepriseId, data.whatsapp, id);
    if (doublon.length > 0) return { ok: false, doublon };
  }
  const r = await db.client.updateMany({ where: { id, entrepriseId }, data });
  return r.count === 1 ? { ok: true, id } : { ok: false, introuvable: true };
}

export interface LigneClient {
  id: string;
  nom: string;
  whatsapp: string;
  email: string | null;
  relancesEnPause: boolean;
  nbFacturesDues: number;
  totalDu: number;
}

export interface PageClients {
  lignes: LigneClient[];
  total: number;
  page: number;
  nbPages: number;
}

/** Liste des clients d'une entreprise : recherche par nom ou par numéro, 25 par page, avec le total dû de chacun. */
export async function listerClients(entrepriseId: string, { q = "", page = 1 }: { q?: string; page?: number } = {}): Promise<PageClients> {
  const recherche = q.trim();
  const chiffres = recherche.replace(/\D/g, "");
  const where: Prisma.ClientWhereInput = {
    entrepriseId,
    ...(recherche
      ? {
          OR: [
            { nom: { contains: recherche, mode: "insensitive" } },
            ...(chiffres.length >= 2 ? [{ whatsapp: { contains: chiffres } }] : []),
          ],
        }
      : {}),
  };

  const total = await db.client.count({ where });
  const nbPages = Math.max(1, Math.ceil(total / TAILLE_PAGE));
  const pageCourante = Math.min(Math.max(1, Math.trunc(page) || 1), nbPages);

  const clients = await db.client.findMany({
    where,
    orderBy: [{ nom: "asc" }, { id: "asc" }],
    skip: (pageCourante - 1) * TAILLE_PAGE,
    take: TAILLE_PAGE,
  });

  const sommes = await db.facture.groupBy({
    by: ["clientId"],
    where: { entrepriseId, clientId: { in: clients.map((c) => c.id) }, statut: { in: STATUTS_DUS } },
    _sum: { montant: true, montantPaye: true },
    _count: { _all: true },
  });
  const parClient = new Map(sommes.map((s) => [s.clientId, s]));

  return {
    lignes: clients.map((c) => {
      const s = parClient.get(c.id);
      return {
        id: c.id,
        nom: c.nom,
        whatsapp: c.whatsapp,
        email: c.email,
        relancesEnPause: c.relancesEnPause,
        nbFacturesDues: s?._count._all ?? 0,
        totalDu: (s?._sum.montant ?? 0) - (s?._sum.montantPaye ?? 0),
      };
    }),
    total,
    page: pageCourante,
    nbPages,
  };
}

export interface FactureDuClient {
  id: string;
  numero: string;
  echeance: Date;
  montant: number;
  montantPaye: number;
  statut: StatutFacture;
}

export interface FicheClient {
  id: string;
  nom: string;
  whatsapp: string;
  email: string | null;
  relancesEnPause: boolean;
  factures: FactureDuClient[];
  nbFacturesDues: number;
  totalDu: number;
}

/** Un client de l'entreprise avec ses factures et le total qu'il doit. Null si le client n'existe pas dans CETTE entreprise. */
export async function trouverClient(entrepriseId: string, id: string): Promise<FicheClient | null> {
  const client = await db.client.findFirst({
    where: { id, entrepriseId },
    include: {
      factures: {
        where: { entrepriseId },
        orderBy: [{ echeance: "desc" }, { numero: "desc" }],
        select: { id: true, numero: true, echeance: true, montant: true, montantPaye: true, statut: true },
      },
    },
  });
  if (!client) return null;
  const dues = client.factures.filter((f) => STATUTS_DUS.includes(f.statut));
  return {
    id: client.id,
    nom: client.nom,
    whatsapp: client.whatsapp,
    email: client.email,
    relancesEnPause: client.relancesEnPause,
    factures: client.factures.map((f) => ({ ...f, statut: statutAffiche(f.statut, f.echeance, aujourdhuiIso()) })),
    nbFacturesDues: dues.length,
    totalDu: dues.reduce((somme, f) => somme + (f.montant - f.montantPaye), 0),
  };
}
