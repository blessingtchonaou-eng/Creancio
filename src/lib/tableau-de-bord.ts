import { db } from "@/lib/db";
import { STATUTS_DUS } from "@/lib/clients";
import { toIsoDate } from "@/lib/format";
import type { LigneFacture } from "@/lib/factures-liste";
import { dateDuJour, statutAffiche } from "@/lib/status";

/**
 * Chiffres du tableau de bord. Chaque requête filtre par l'entrepriseId de la session (jamais celui du navigateur).
 * Aucun chiffre n'est estimé : ce qui ne peut pas être calculé est renvoyé vide (null), pas inventé.
 */

export const NB_FACTURES_A_SUIVRE = 7;

export type FactureASuivre = LigneFacture;

export interface TableauDeBord {
  nbFactures: number;
  /** Ce que les clients doivent encore : factures non payées, moins les paiements partiels. */
  encours: { montant: number; nb: number };
  /** La part de l'encours dont l'échéance est passée. */
  enRetard: { montant: number; nb: number };
  encaisse: { ceMois: number; moisPrecedent: number; nbPaiementsMoisPrecedent: number };
  /** jours = null tant qu'aucune facture payée n'a une vraie date d'émission. */
  delaiMoyen: { jours: number | null; nb: number; nonCompteesDateEstimee: number };
  aSuivre: FactureASuivre[];
}

/** Premier jour du mois de `iso` et du mois suivant, à minuit UTC. */
export function bornesDuMois(iso: string): { debut: Date; fin: Date; debutPrecedent: Date } {
  const [annee, mois] = iso.split("-").map(Number);
  return {
    debut: new Date(Date.UTC(annee, mois - 1, 1)),
    fin: new Date(Date.UTC(annee, mois, 1)),
    debutPrecedent: new Date(Date.UTC(annee, mois - 2, 1)),
  };
}

const resteDu = (somme: { montant: number | null; montantPaye: number | null }) => (somme.montant ?? 0) - (somme.montantPaye ?? 0);

export async function chargerTableauDeBord(entrepriseId: string, aujourdhui: string): Promise<TableauDeBord> {
  const jour = dateDuJour(aujourdhui);
  const { debut, fin, debutPrecedent } = bornesDuMois(aujourdhui);
  const dues = { entrepriseId, statut: { in: STATUTS_DUS } };

  const [nbFactures, encours, enRetard, ceMois, moisPrecedent, delai, nonComptees, aSuivre] = await Promise.all([
    db.facture.count({ where: { entrepriseId } }),
    db.facture.aggregate({ where: dues, _sum: { montant: true, montantPaye: true }, _count: { _all: true } }),
    db.facture.aggregate({ where: { ...dues, echeance: { lt: jour } }, _sum: { montant: true, montantPaye: true }, _count: { _all: true } }),
    db.paiement.aggregate({ where: { facture: { entrepriseId }, payeLe: { gte: debut, lt: fin } }, _sum: { montant: true } }),
    db.paiement.aggregate({ where: { facture: { entrepriseId }, payeLe: { gte: debutPrecedent, lt: debut } }, _sum: { montant: true }, _count: { _all: true } }),
    // Délai = dernier paiement moins date d'émission, pour les factures soldées dont la date d'émission est connue.
    // Une valeur négative (payée avant d'être émise) est une erreur de saisie : elle n'entre pas dans la moyenne.
    db.$queryRaw<{ nb: number; moyenne: number | null }[]>`
      SELECT COUNT(*)::int AS nb, AVG(jours)::float8 AS moyenne
      FROM (
        SELECT (MAX(p."payeLe")::date - f."dateFacture") AS jours
        FROM "Facture" f
        JOIN "Paiement" p ON p."factureId" = f."id"
        WHERE f."entrepriseId" = ${entrepriseId} AND f."statut" = 'PAYEE' AND f."dateFactureEstimee" = false
        GROUP BY f."id"
      ) AS delais
      WHERE jours >= 0`,
    db.facture.count({ where: { entrepriseId, statut: "PAYEE", dateFactureEstimee: true, paiements: { some: {} } } }),
    db.facture.findMany({
      where: dues,
      orderBy: [{ echeance: "asc" }, { numero: "asc" }, { id: "asc" }],
      take: NB_FACTURES_A_SUIVRE,
      select: { id: true, numero: true, clientId: true, montant: true, montantPaye: true, echeance: true, statut: true, client: { select: { nom: true } } },
    }),
  ]);

  const { nb, moyenne } = delai[0] ?? { nb: 0, moyenne: null };
  return {
    nbFactures,
    encours: { montant: resteDu(encours._sum), nb: encours._count._all },
    enRetard: { montant: resteDu(enRetard._sum), nb: enRetard._count._all },
    encaisse: {
      ceMois: ceMois._sum.montant ?? 0,
      moisPrecedent: moisPrecedent._sum.montant ?? 0,
      nbPaiementsMoisPrecedent: moisPrecedent._count._all,
    },
    delaiMoyen: { jours: nb > 0 && moyenne !== null ? Math.round(moyenne) : null, nb, nonCompteesDateEstimee: nonComptees },
    aSuivre: aSuivre.map((f) => ({
      id: f.id,
      numero: f.numero,
      clientId: f.clientId,
      clientNom: f.client.nom,
      echeance: toIsoDate(f.echeance),
      montant: f.montant,
      montantPaye: f.montantPaye,
      statut: statutAffiche(f.statut, f.echeance, aujourdhui),
    })),
  };
}
