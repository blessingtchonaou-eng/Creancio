import type { FacturesParMois, StatutDemandePilote } from "@/generated/prisma/enums";

/** Statuts et libellés des demandes de pilote, sans accès à la base : utilisables dans un composant client. */
export const STATUTS_DEMANDE = ["NOUVELLE", "CONTACTEE", "INSCRITE", "ABANDONNEE", "SUSPECTE"] as const satisfies readonly StatutDemandePilote[];

export const LIBELLES_STATUT: Record<StatutDemandePilote, string> = {
  NOUVELLE: "Nouvelle",
  CONTACTEE: "Contactée",
  INSCRITE: "Inscrite",
  ABANDONNEE: "Abandonnée",
  SUSPECTE: "Suspecte",
};

export const LIBELLES_VOLUME: Record<FacturesParMois, string> = {
  MOINS_DE_20: "Moins de 20 factures/mois",
  DE_20_A_100: "20 à 100 factures/mois",
  PLUS_DE_100: "Plus de 100 factures/mois",
};
