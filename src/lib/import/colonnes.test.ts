import { describe, expect, it } from "vitest";
import { normaliserEntete, reconnaitreColonne } from "./colonnes";

describe("reconnaissance des en-têtes", () => {
  it("ignore accents, majuscules, espaces et ponctuation", () => {
    expect(normaliserEntete(" Date d'échéance ")).toBe("datedecheance");
    expect(normaliserEntete("N° Facture")).toBe("nfacture");
  });

  it.each([
    ["Échéance", "echeance"],
    ["echeance", "echeance"],
    ["ECHÉANCE", "echeance"],
    ["Date d'échéance", "echeance"],
    ["Date d’échéance", "echeance"], // apostrophe typographique
    ["Date d'échéance de paiement", "echeance"],
    ["Numéro de facture", "numero"],
    ["N° facture", "numero"],
    ["Nº Facture", "numero"],
    ["Référence", "numero"],
    ["Client", "client"],
    ["Nom du client", "client"],
    ["Téléphone", "telephone"],
    ["Telephone client", "telephone"],
    ["N° WhatsApp", "telephone"],
    ["Tél.", "telephone"],
    ["Montant", "montant"],
    ["Montant (FCFA)", "montant"],
    ["Montant TTC", "montant"],
    ["E-mail", "email"],
    ["Courriel", "email"],
  ])("« %s » → %s", (entete, colonne) => {
    expect(reconnaitreColonne(entete)).toBe(colonne);
  });

  it("ne devine pas les colonnes ambiguës ou inconnues", () => {
    expect(reconnaitreColonne("Date de facture")).toBeNull();
    expect(reconnaitreColonne("Montant payé")).toBeNull();
    expect(reconnaitreColonne("Montant HT")).toBeNull();
    expect(reconnaitreColonne("Commentaire")).toBeNull();
    expect(reconnaitreColonne("")).toBeNull();
  });
});
