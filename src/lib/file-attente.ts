import type { SaisieFacture } from "@/lib/factures-saisie";

/**
 * File d'attente hors connexion : les factures saisies sans réseau sont gardées dans le navigateur (localStorage),
 * puis envoyées quand la connexion revient. Fonctions pures sur un « Storage » pour être testables sans navigateur.
 * La clé contient l'entreprise : sur un téléphone partagé, une autre entreprise ne voit pas cette file.
 */

export interface FactureEnAttente {
  saisie: SaisieFacture;
  /** Libellé lisible (« FA-2026-0007 · Kofi Agbo ») affiché dans la file. */
  resume: string;
  /** Rempli quand le serveur a refusé la facture : elle attend une correction, elle n'est pas renvoyée en boucle. */
  erreur?: string;
}

export interface Stockage {
  getItem(cle: string): string | null;
  setItem(cle: string, valeur: string): void;
}

export const cleFile = (entrepriseId: string) => `creancio:file-factures:${entrepriseId}`;

export function lireFile(stockage: Stockage | null, entrepriseId: string): FactureEnAttente[] {
  if (!stockage) return [];
  try {
    const brut = stockage.getItem(cleFile(entrepriseId));
    if (!brut) return [];
    const donnees: unknown = JSON.parse(brut);
    if (!Array.isArray(donnees)) return [];
    return donnees.filter((d): d is FactureEnAttente => typeof d === "object" && d !== null && typeof (d as FactureEnAttente).saisie?.cle === "string");
  } catch {
    return []; // stockage illisible ou bloqué : on repart d'une file vide plutôt que de planter
  }
}

/** Écrit la file ; renvoie false si le navigateur refuse (stockage plein ou bloqué), pour ne jamais faire croire à un enregistrement. */
export function ecrireFile(stockage: Stockage | null, entrepriseId: string, file: FactureEnAttente[]): boolean {
  if (!stockage) return false;
  try {
    stockage.setItem(cleFile(entrepriseId), JSON.stringify(file));
    return true;
  } catch {
    return false;
  }
}

export const ajouterALaFile = (file: FactureEnAttente[], element: FactureEnAttente): FactureEnAttente[] => [...file.filter((f) => f.saisie.cle !== element.saisie.cle), element];
export const retirerDeLaFile = (file: FactureEnAttente[], cle: string): FactureEnAttente[] => file.filter((f) => f.saisie.cle !== cle);
export const marquerErreur = (file: FactureEnAttente[], cle: string, erreur: string): FactureEnAttente[] => file.map((f) => (f.saisie.cle === cle ? { ...f, erreur } : f));
/** Factures à envoyer : celles qui n'ont pas déjà été refusées par le serveur. */
export const aEnvoyer = (file: FactureEnAttente[]) => file.filter((f) => !f.erreur);
