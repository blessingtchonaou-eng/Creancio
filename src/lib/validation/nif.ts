import { z } from "zod";

/**
 * Format du NIF (numéro d'identification fiscale, OTR).
 * Le format officiel n'est pas publié : cette règle est une SUPPOSITION (7 à 13 chiffres) qui ne sert
 * qu'à afficher un avertissement. Elle ne refuse JAMAIS un NIF saisi (voir TODO-PRODUCTION.md).
 */
const FORMAT_NIF = /^\d{7,13}$/;

const MAX_NIF = 30;

/** Retire les espaces, points et tirets qu'on tape souvent en recopiant un NIF. */
export function nettoyerNif(input: string): string {
  return input.replace(/[\s.-]/g, "");
}

/** Le NIF saisi ressemble-t-il à un NIF ? Un champ vide est accepté (facultatif). */
export function ressembleAUnNif(input: string): boolean {
  const nif = nettoyerNif(input);
  return nif === "" || FORMAT_NIF.test(nif);
}

export const AVERTISSEMENT_NIF = "Ce numéro ne ressemble pas à un NIF, vérifiez la saisie.";

/** Valeur à enregistrer : vide → null ; format reconnu → nettoyé ; sinon tel que saisi (jamais refusé). */
export function nifAEnregistrer(input: string): string | null {
  const saisi = input.trim();
  if (saisi === "") return null;
  const nettoye = nettoyerNif(saisi);
  return FORMAT_NIF.test(nettoye) ? nettoye : saisi;
}

/** Schéma zod du NIF facultatif : seule une longueur absurde est refusée, jamais le format. */
export const nifSchema = z.string().max(MAX_NIF, "Ce NIF est trop long.").transform(nifAEnregistrer);
