import { describe, expect, it } from "vitest";
import { landing } from "@/content/landing";
import { demandePiloteSchema } from "./pilote";

const e = landing.pilote.erreurs;
const valide = { nomEntreprise: "Boutique Test", whatsapp: "90 12 34 56", consentement: "oui" };
const erreurs = (champs: Record<string, unknown>) => {
  const r = demandePiloteSchema.safeParse(champs);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]));
};

describe("validation du formulaire pilote", () => {
  it("numéro togolais sous toutes ses formes : enregistré en E.164", () => {
    for (const saisie of ["90123456", "90 12 34 56", "+228 90 12 34 56", "0022890123456", "228 90123456"]) {
      expect(demandePiloteSchema.parse({ ...valide, whatsapp: saisie }).whatsapp).toBe("+22890123456");
    }
  });

  it("numéro invalide ou hostile : refusé avec le message du formulaire", () => {
    for (const saisie of ["", "1234", "80123456", "+33 6 12 34 56 78", "90123456?text=x", "javascript:alert(1)", "<b>90123456</b>"]) {
      expect(erreurs({ ...valide, whatsapp: saisie }).whatsapp, saisie).toBe(e.whatsapp);
    }
  });

  it("consentement obligatoire", () => {
    expect(erreurs({ ...valide, consentement: undefined }).consentement).toBe(e.consentement);
    expect(erreurs({ ...valide, consentement: "on" }).consentement).toBe(e.consentement);
  });

  it("nom : 2 à 120 caractères, sur une seule ligne", () => {
    expect(erreurs({ ...valide, nomEntreprise: undefined }).nomEntreprise).toBe(e.nomEntrepriseVide);
    expect(erreurs({ ...valide, nomEntreprise: "  A  " }).nomEntreprise).toBe(e.nomEntrepriseVide);
    expect(erreurs({ ...valide, nomEntreprise: "x".repeat(121) }).nomEntreprise).toBe(e.nomEntrepriseLong);
    expect(demandePiloteSchema.parse({ ...valide, nomEntreprise: "  Garage\r\n\tdu\u0000  Centre " }).nomEntreprise).toBe("Garage du Centre");
  });

  it("nombre de factures : facultatif, et seulement une valeur de la liste", () => {
    expect(demandePiloteSchema.parse({ ...valide, facturesParMois: "" }).facturesParMois).toBeUndefined();
    expect(demandePiloteSchema.parse({ ...valide, facturesParMois: "PLUS_DE_100" }).facturesParMois).toBe("PLUS_DE_100");
    expect(erreurs({ ...valide, facturesParMois: "MILLE" }).facturesParMois).toBe(e.facturesParMois);
  });
});
