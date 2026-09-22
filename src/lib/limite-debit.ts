import { createHmac } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Compteurs de limite de débit en base (table LimiteDebit) : ils survivent aux redémarrages et sont partagés entre instances.
 * Fenêtre fixe : elle s'ouvre au premier passage, dure `fenetre` secondes, puis le compteur repart à zéro.
 * Toutes les dates sont calculées par la base (heure UTC, comme les colonnes écrites par Prisma) : pas de décalage d'horloge
 * entre instances, et un seul aller-retour, atomique, par comptage.
 */
export type Fenetre = { fenetre: number; max: number };
export type Etat = { compteur: number; resteSecondes: number };

const MAINTENANT = `(now() AT TIME ZONE 'UTC')`;

/** Empreinte HMAC d'une valeur (adresse IP, adresse e-mail) : la table ne contient jamais ces données en clair. */
export function empreinte(valeur: string): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET manquant : impossible de calculer les empreintes de la limite de débit.");
  return createHmac("sha256", secret).update(valeur).digest("hex").slice(0, 32);
}

/** Compteur de la fenêtre en cours, ou null s'il n'y en a pas. */
export async function lireCompteur(cle: string): Promise<Etat | null> {
  const lignes = await db.$queryRawUnsafe<{ compteur: number; reste: number }[]>(
    `SELECT "compteur", EXTRACT(EPOCH FROM ("expireLe" - ${MAINTENANT}))::float8 AS reste FROM "LimiteDebit" WHERE "cle" = $1 AND "expireLe" > ${MAINTENANT}`,
    cle,
  );
  return lignes[0] ? { compteur: Number(lignes[0].compteur), resteSecondes: Number(lignes[0].reste) } : null;
}

/** Ajoute 1 au compteur (ouvre une fenêtre si besoin) et renvoie le nouvel état. Ne refuse rien : voir `consommer`. */
export async function incrementer(cle: string, fenetre: number): Promise<Etat> {
  const [ligne] = await db.$queryRawUnsafe<{ compteur: number; reste: number }[]>(
    `INSERT INTO "LimiteDebit" ("cle", "compteur", "expireLe") VALUES ($1, 1, ${MAINTENANT} + make_interval(secs => $2::float8))
     ON CONFLICT ("cle") DO UPDATE SET
       "compteur" = CASE WHEN "LimiteDebit"."expireLe" <= ${MAINTENANT} THEN 1 ELSE "LimiteDebit"."compteur" + 1 END,
       "expireLe" = CASE WHEN "LimiteDebit"."expireLe" <= ${MAINTENANT} THEN ${MAINTENANT} + make_interval(secs => $2::float8) ELSE "LimiteDebit"."expireLe" END
     RETURNING "compteur", EXTRACT(EPOCH FROM ("expireLe" - ${MAINTENANT}))::float8 AS reste`,
    cle,
    fenetre,
  );
  nettoyerParfois();
  return { compteur: Number(ligne.compteur), resteSecondes: Number(ligne.reste) };
}

/** Compte un passage et dit s'il est autorisé (les `max` premiers de la fenêtre le sont). Pour les limites « par requête ». */
export async function consommer(cle: string, { fenetre, max }: Fenetre): Promise<{ autorise: boolean; resteSecondes: number }> {
  const etat = await incrementer(cle, fenetre);
  return { autorise: etat.compteur <= max, resteSecondes: etat.resteSecondes };
}

export async function oublier(cle: string): Promise<void> {
  await db.limiteDebit.deleteMany({ where: { cle } });
}

/** Une fois sur cinquante, supprime les compteurs périmés depuis plus d'une heure : la table ne grossit pas sans fin. */
function nettoyerParfois() {
  if (Math.random() >= 0.02) return;
  void db.limiteDebit.deleteMany({ where: { expireLe: { lt: new Date(Date.now() - 3_600_000) } } }).catch(() => undefined);
}
