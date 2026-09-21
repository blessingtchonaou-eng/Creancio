import { describe, expect, it } from "vitest";
import {
  AVERTISSEMENT_DATE_ESTIMEE,
  joursDeRetard,
  resteDu,
  statutApresAnnulationPaiement,
  statutApresModification,
  statutApresPaiement,
  statutApresReprise,
  validerMotif,
  validerPaiement,
  type ContextePaiement,
} from "./facture-regles";

const AUJOURDHUI = "2026-09-20";
const contexte = (surcharge: Partial<ContextePaiement> = {}): ContextePaiement => ({
  resteDu: 100_000,
  aujourdhui: AUJOURDHUI,
  dateFacture: "2026-09-01",
  dateFactureEstimee: false,
  ...surcharge,
});
const saisie = (surcharge: Partial<{ montant: string; date: string; operateur: string; reference: string }> = {}) => ({
  montant: "50 000",
  date: "2026-09-15",
  operateur: "ESPECES",
  reference: "",
  ...surcharge,
});

describe("resteDu", () => {
  it("montant moins déjà payé ; zéro quand la facture est soldée ou annulée", () => {
    expect(resteDu("A_VENIR", 100_000, 0)).toBe(100_000);
    expect(resteDu("PARTIELLEMENT_PAYEE", 200_000, 50_000)).toBe(150_000);
    expect(resteDu("PAYEE", 100_000, 100_000)).toBe(0);
    expect(resteDu("ANNULEE", 100_000, 0)).toBe(0);
    expect(resteDu("ECHUE", 100_000, 120_000)).toBe(0); // jamais négatif
  });
});

describe("joursDeRetard", () => {
  it("compte les jours depuis l'échéance pour une facture encore due", () => {
    expect(joursDeRetard("ECHUE", "2026-09-08", AUJOURDHUI)).toBe(12);
    expect(joursDeRetard("PARTIELLEMENT_PAYEE", "2026-09-19", AUJOURDHUI)).toBe(1);
    expect(joursDeRetard("SUSPENDUE", "2026-09-01", AUJOURDHUI)).toBe(19);
  });
  it("aucun retard le jour de l'échéance, avant, ni pour une facture payée ou annulée", () => {
    expect(joursDeRetard("A_VENIR", "2026-09-20", AUJOURDHUI)).toBeNull();
    expect(joursDeRetard("A_VENIR", "2026-10-01", AUJOURDHUI)).toBeNull();
    expect(joursDeRetard("PAYEE", "2026-01-01", AUJOURDHUI)).toBeNull();
    expect(joursDeRetard("ANNULEE", "2026-01-01", AUJOURDHUI)).toBeNull();
  });
});

describe("validerPaiement", () => {
  it("accepte un paiement partiel, le reste dû exact, et lit les espaces du montant", () => {
    expect(validerPaiement(saisie(), contexte())).toMatchObject({ ok: true, valeur: { montant: 50_000, date: "2026-09-15", operateur: "ESPECES", reference: null } });
    expect(validerPaiement(saisie({ montant: "100 000" }), contexte())).toMatchObject({ ok: true, valeur: { montant: 100_000 } });
  });

  it("REFUSE un montant supérieur au reste dû, en disant combien il reste", () => {
    const r = validerPaiement(saisie({ montant: "100 001" }), contexte());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreurs.montant).toMatch(/reste à payer : 100\s000\sFCFA/);
    const apresPartiel = validerPaiement(saisie({ montant: "60 000" }), contexte({ resteDu: 50_000 }));
    expect(apresPartiel.ok).toBe(false);
  });

  it("refuse tout paiement quand il ne reste rien à payer", () => {
    const r = validerPaiement(saisie(), contexte({ resteDu: 0 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreurs.montant).toMatch(/rien à payer/);
  });

  it("refuse un montant illisible, nul ou négatif (mêmes règles que la saisie d'une facture)", () => {
    for (const montant of ["", "abc", "0", "-5 000", "12,5"]) expect(validerPaiement(saisie({ montant }), contexte()).ok, montant).toBe(false);
  });

  it("refuse une date future, mais accepte aujourd'hui", () => {
    const futur = validerPaiement(saisie({ date: "2026-09-21" }), contexte());
    expect(futur.ok).toBe(false);
    if (!futur.ok) expect(futur.erreurs.date).toMatch(/futur/);
    expect(validerPaiement(saisie({ date: AUJOURDHUI }), contexte()).ok).toBe(true);
  });

  it("refuse une date avant celle de la facture ; le jour de la facture est accepté", () => {
    const avant = validerPaiement(saisie({ date: "2026-08-31" }), contexte());
    expect(avant.ok).toBe(false);
    if (!avant.ok) expect(avant.erreurs.date).toMatch(/avant celle de la facture \(01\/09\/2026\)/);
    expect(validerPaiement(saisie({ date: "2026-09-01" }), contexte()).ok).toBe(true);
  });

  it("date de facture estimée : une date avant la facture n'est qu'un avertissement", () => {
    const r = validerPaiement(saisie({ date: "2026-08-15" }), contexte({ dateFactureEstimee: true }));
    expect(r).toMatchObject({ ok: true, avertissements: { date: AVERTISSEMENT_DATE_ESTIMEE } });
  });

  it("refuse un opérateur inconnu, accepte les quatre modes, garde la référence nettoyée", () => {
    const inconnu = validerPaiement(saisie({ operateur: "PAYPAL" }), contexte());
    expect(inconnu.ok).toBe(false);
    for (const operateur of ["FLOOZ", "MIXX", "ESPECES", "VIREMENT"]) expect(validerPaiement(saisie({ operateur }), contexte()).ok, operateur).toBe(true);
    expect(validerPaiement(saisie({ reference: "  Reçu   n° 42 " }), contexte())).toMatchObject({ ok: true, valeur: { reference: "Reçu n° 42" } });
    expect(validerPaiement(saisie({ reference: "x".repeat(101) }), contexte()).ok).toBe(false);
  });
});

describe("validerMotif", () => {
  it("accepte de 3 à 200 caractères, refuse en dessous et au-dessus", () => {
    expect(validerMotif("ab").ok).toBe(false);
    expect(validerMotif("   a   ").ok).toBe(false);
    expect(validerMotif("abc")).toEqual({ ok: true, valeur: "abc" });
    expect(validerMotif("x".repeat(200)).ok).toBe(true);
    expect(validerMotif("x".repeat(201)).ok).toBe(false);
    expect(validerMotif("  Faute  de   frappe ")).toEqual({ ok: true, valeur: "Faute de frappe" });
  });
});

describe("statut après un changement", () => {
  it("paiement : partiel puis complet ; « Suspendue » le reste tant que la facture n'est pas soldée", () => {
    expect(statutApresPaiement("A_VENIR", 100_000, 40_000)).toBe("PARTIELLEMENT_PAYEE");
    expect(statutApresPaiement("PARTIELLEMENT_PAYEE", 100_000, 100_000)).toBe("PAYEE");
    expect(statutApresPaiement("ECHUE", 100_000, 100_000)).toBe("PAYEE");
    expect(statutApresPaiement("SUSPENDUE", 100_000, 40_000)).toBe("SUSPENDUE");
    expect(statutApresPaiement("SUSPENDUE", 100_000, 100_000)).toBe("PAYEE");
  });

  it("annulation d'un paiement : la facture revient à ce que disent les paiements qui restent", () => {
    expect(statutApresAnnulationPaiement("PAYEE", 100_000, 60_000, "2026-10-15", AUJOURDHUI)).toBe("PARTIELLEMENT_PAYEE");
    expect(statutApresAnnulationPaiement("PARTIELLEMENT_PAYEE", 100_000, 0, "2026-10-15", AUJOURDHUI)).toBe("A_VENIR");
    expect(statutApresAnnulationPaiement("PAYEE", 100_000, 0, "2026-09-01", AUJOURDHUI)).toBe("ECHUE");
    expect(statutApresAnnulationPaiement("SUSPENDUE", 100_000, 0, "2026-09-01", AUJOURDHUI)).toBe("SUSPENDUE");
    expect(statutApresAnnulationPaiement("PARTIELLEMENT_PAYEE", 100_000, 100_000, "2026-09-01", AUJOURDHUI)).toBe("PAYEE");
  });

  it("modification : soldée → Payée ; Payée dont le montant augmente → Partielle ; échéance → À venir ou Échue", () => {
    expect(statutApresModification("PARTIELLEMENT_PAYEE", 50_000, 50_000, "2026-10-15", AUJOURDHUI)).toBe("PAYEE");
    expect(statutApresModification("PAYEE", 150_000, 100_000, "2026-10-15", AUJOURDHUI)).toBe("PARTIELLEMENT_PAYEE");
    expect(statutApresModification("A_VENIR", 100_000, 0, "2026-09-01", AUJOURDHUI)).toBe("ECHUE");
    expect(statutApresModification("ECHUE", 100_000, 0, "2026-10-15", AUJOURDHUI)).toBe("A_VENIR");
    expect(statutApresModification("SUSPENDUE", 100_000, 0, "2026-09-01", AUJOURDHUI)).toBe("SUSPENDUE");
    expect(statutApresModification("EN_RELANCE", 100_000, 0, "2026-10-15", AUJOURDHUI)).toBe("EN_RELANCE");
    expect(statutApresModification("ANNULEE", 100_000, 0, "2026-10-15", AUJOURDHUI)).toBe("ANNULEE");
  });

  it("reprise des relances : déduit des paiements et de l'échéance", () => {
    expect(statutApresReprise(100_000, 0, "2026-10-15", AUJOURDHUI)).toBe("A_VENIR");
    expect(statutApresReprise(100_000, 0, "2026-09-01", AUJOURDHUI)).toBe("ECHUE");
    expect(statutApresReprise(100_000, 30_000, "2026-09-01", AUJOURDHUI)).toBe("PARTIELLEMENT_PAYEE");
  });
});
