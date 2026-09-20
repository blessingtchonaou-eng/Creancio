import type { FormState } from "@/lib/form-state";
import type { ClientMemeNumero } from "@/lib/clients";

/** État renvoyé au formulaire quand le numéro est déjà celui d'autres clients : rien n'est enregistré. */
export function etatDoublon(values: Record<string, string>, whatsapp: string, clients: ClientMemeNumero[]): FormState {
  return { values, doublon: { whatsapp, clients } };
}

/** L'utilisateur a cliqué sur « Créer quand même » pour CE numéro (et non pour un numéro modifié depuis). */
export function doublonConfirme(formData: FormData, whatsapp: string): boolean {
  return formData.get("confirmerNumero") === whatsapp;
}
