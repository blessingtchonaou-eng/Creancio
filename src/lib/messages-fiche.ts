/**
 * Messages affichés en haut de la fiche d'une facture après une action. La valeur passe dans l'adresse (?message=…) :
 * seule une clé de cette liste est reconnue, jamais du texte libre.
 */
export const MESSAGES_FICHE = {
  paiement: "Paiement enregistré.",
  modifiee: "Les changements sont enregistrés.",
  suspendue: "Les relances de cette facture sont suspendues.",
  reprise: "Les relances de cette facture reprennent.",
  annulee: "La facture est annulée.",
  "paiement-annule": "Le paiement est annulé. Il reste visible dans l'historique.",
} as const;

export type CleMessage = keyof typeof MESSAGES_FICHE;

export const lireMessage = (valeur: string | string[] | undefined): CleMessage | null => {
  const v = Array.isArray(valeur) ? valeur[0] : valeur;
  return v && Object.hasOwn(MESSAGES_FICHE, v) ? (v as CleMessage) : null;
};
