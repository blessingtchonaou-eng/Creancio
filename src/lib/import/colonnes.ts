export type Colonne = "numero" | "client" | "telephone" | "montant" | "dateFacture" | "echeance" | "email";

export const COLONNES_OBLIGATOIRES: Colonne[] = ["numero", "client", "montant", "echeance"];

export const LIBELLE_COLONNE: Record<Colonne, string> = {
  numero: "Numéro de facture",
  client: "Client",
  telephone: "Téléphone WhatsApp",
  montant: "Montant (FCFA)",
  dateFacture: "Date de facture",
  echeance: "Échéance",
  email: "E-mail",
};

/** « Date d'échéance » → « datedecheance » : sans accents, majuscules, espaces ni ponctuation. */
export function normaliserEntete(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const ALIAS: Record<Colonne, string[]> = {
  numero: [
    "numero", "numerofacture", "numerodefacture", "nfacture", "ndefacture", "nofacture", "nodefacture",
    "numfacture", "numdefacture", "facture", "reference", "referencefacture", "reffacture", "ref",
  ],
  client: ["client", "nomclient", "nomduclient", "clientnom", "raisonsociale", "societe", "acheteur", "debiteur", "destinataire", "nom", "nomprenom"],
  telephone: [
    "telephone", "tel", "telclient", "telephoneclient", "whatsapp", "numerowhatsapp", "numerowhatsappclient",
    "whatsappclient", "mobile", "portable", "gsm", "contact", "numerotelephone", "numerodetelephone",
  ],
  montant: ["montant", "montantfcfa", "montantenfcfa", "montantxof", "montantttc", "montantdu", "montanttotal", "montantfacture", "total", "totalttc", "totalfcfa"],
  dateFacture: ["datefacture", "datedefacture", "datefact", "dateemission", "datedemission", "emission", "dateemissionfacture", "datedemissiondefacture"],
  echeance: ["echeance", "dateecheance", "datedecheance", "echeancele", "echeancedepaiement", "datelimite", "datelimitedepaiement"],
  email: ["email", "mail", "courriel", "adresseemail", "emailclient", "adressemail"],
};

/** Mots-clés de repli pour les colonnes peu ambiguës (« Téléphone du client », « Date d'échéance de paiement »). */
const MOTS_CLES: Partial<Record<Colonne, (s: string) => boolean>> = {
  echeance: (s) => s.includes("echeance"),
  dateFacture: (s) => s.includes("emission") || s.includes("datefacture") || s.includes("datedefacture"),
  telephone: (s) => s.includes("whatsapp") || s.includes("telephone") || s.startsWith("tel"),
  email: (s) => s.includes("mail") || s.includes("courriel"),
};

/** Colonne canonique qui correspond à un en-tête, ou null. Le numéro, le client et le montant demandent un nom exact : pas de devinette. */
export function reconnaitreColonne(entete: string): Colonne | null {
  const s = normaliserEntete(entete);
  if (s === "") return null;
  for (const [colonne, alias] of Object.entries(ALIAS) as [Colonne, string[]][]) if (alias.includes(s)) return colonne;
  for (const [colonne, test] of Object.entries(MOTS_CLES) as [Colonne, (s: string) => boolean][]) if (test(s)) return colonne;
  return null;
}
