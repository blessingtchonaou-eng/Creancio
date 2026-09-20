import { z } from "zod";

/**
 * Format du NIF (numéro d'identification fiscale, OTR).
 * Règle PROVISOIRE : 7 à 13 chiffres, en attendant la confirmation du format officiel par l'OTR
 * (voir TODO-PRODUCTION.md). Elle est volontairement large pour ne pas refuser un NIF valide.
 * Pour la resserrer, ne modifier que cette constante.
 */
const FORMAT_NIF = /^\d{7,13}$/;

/** Retire les espaces, points et tirets qu'on tape souvent en recopiant un NIF. */
export function nettoyerNif(input: string): string {
  return input.replace(/[\s.-]/g, "");
}

export type ResultatNif = { ok: true; nif: string | null } | { ok: false; error: string };

/** Le NIF est facultatif : vide → null. S'il est saisi, il doit respecter le format. */
export function validerNif(input: string): ResultatNif {
  const nif = nettoyerNif(input);
  if (nif === "") return { ok: true, nif: null };
  if (!FORMAT_NIF.test(nif)) return { ok: false, error: "Le NIF contient uniquement des chiffres (7 à 13). Vérifiez-le ou laissez ce champ vide." };
  return { ok: true, nif };
}

/** Schéma zod du champ NIF facultatif. */
export const nifSchema = z.string().transform((v, ctx) => {
  const r = validerNif(v);
  if (!r.ok) {
    ctx.addIssue({ code: "custom", message: r.error });
    return z.NEVER;
  }
  return r.nif;
});
