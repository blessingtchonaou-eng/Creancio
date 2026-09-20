import type { Colonne } from "./colonnes";

/** Une ligne du fichier, telle qu'affichée et modifiable dans l'aperçu : que du texte. */
export interface LigneBrute {
  /** Numéro de la ligne dans le fichier (celui qu'on voit dans Excel). */
  ligne: number;
  numero: string;
  client: string;
  telephone: string;
  montant: string;
  echeance: string;
  email: string;
}

export const CHAMPS_LIGNE: Colonne[] = ["numero", "client", "telephone", "montant", "echeance", "email"];

export interface Lecture {
  lignes: LigneBrute[];
  /** Colonnes du fichier qu'on ne connaît pas (elles sont ignorées, mais on le dit). */
  colonnesIgnorees: string[];
  avertissements: string[];
  /** Feuille lue (fichiers Excel). */
  feuille?: string;
}

/** Erreur que l'utilisateur peut corriger : le message dit quoi faire. */
export class ErreurImport extends Error {}

export const TAILLE_FICHIER_MAX = 2 * 1024 * 1024;
export const LIGNES_MAX = 1000;
