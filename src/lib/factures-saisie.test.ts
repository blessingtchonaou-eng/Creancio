import { describe, expect, it } from "vitest";
import { formaterSaisieMontant, numeroSuivant, suggererNumero, validerSaisie, type SaisieFacture } from "./factures-saisie";

const saisie = (surcharge: Partial<SaisieFacture> = {}): SaisieFacture => ({
  cle: "k1",
  numero: "FA-2026-0007",
  montant: "150 000",
  dateFacture: "2026-09-20",
  echeance: "2026-10-20",
  client: { type: "existant", id: "c1" },
  ...surcharge,
});

describe("formaterSaisieMontant", () => {
  it.each([
    ["", ""],
    ["1", "1"],
    ["1250", "1 250"],
    ["1250000", "1 250 000"],
    ["1 250 000", "1 250 000"],
    ["12a50", "1 250"],
    ["0012", "12"],
    ["0", "0"],
    ["1234567890", "1 234 567 890"],
  ])("« %s » → « %s »", (entree, attendu) => expect(formaterSaisieMontant(entree)).toBe(attendu));
});

describe("suggererNumero / numeroSuivant", () => {
  it("propose le plus grand numéro de l'année plus un, sur 4 chiffres", () => {
    expect(suggererNumero(["FA-2026-0007", "FA-2026-0129", "FA-2026-0100"], 2026)).toBe("FA-2026-0130");
  });
  it("repart de 0001 sans facture, ou quand seules d'autres années existent", () => {
    expect(suggererNumero([], 2026)).toBe("FA-2026-0001");
    expect(suggererNumero(["FA-2025-0300"], 2026)).toBe("FA-2026-0001");
  });
  it("ignore les numéros qui n'ont pas le format", () => {
    expect(suggererNumero(["2026/12", "FA-2026-ABC", "FA-2026-0003-bis"], 2026)).toBe("FA-2026-0001");
  });
  it("numeroSuivant garde le format saisi", () => {
    expect(numeroSuivant("FA-2026-0007")).toBe("FA-2026-0008");
    expect(numeroSuivant("FA-2026-0999")).toBe("FA-2026-1000");
    expect(numeroSuivant("F12")).toBe("F13");
    expect(numeroSuivant("sans-chiffre")).toBeNull();
  });
});

describe("validerSaisie", () => {
  it("accepte une saisie complète", () => {
    expect(validerSaisie(saisie())).toEqual({
      ok: true,
      valeur: { numero: "FA-2026-0007", montant: 150_000, dateFacture: "2026-09-20", echeance: "2026-10-20", client: { type: "existant", id: "c1" } },
    });
  });
  it("normalise le nom et le numéro WhatsApp d'un nouveau client", () => {
    const r = validerSaisie(saisie({ client: { type: "nouveau", nom: "  Kofi   Agbo ", whatsapp: "90 12 34 56" } }));
    expect(r).toMatchObject({ ok: true, valeur: { client: { type: "nouveau", nom: "Kofi Agbo", whatsapp: "+22890123456" } } });
  });
  it("refuse les champs vides et dit lesquels", () => {
    const r = validerSaisie(saisie({ numero: " ", montant: "", dateFacture: "", echeance: "", client: { type: "existant", id: "" } }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.erreurs).sort()).toEqual(["client", "dateFacture", "echeance", "montant", "numero"]);
  });
  it("refuse un montant nul, négatif ou avec décimales (jamais arrondi en silence)", () => {
    for (const montant of ["0", "-5000", "1250,75"]) expect(validerSaisie(saisie({ montant })).ok, montant).toBe(false);
  });
  it("refuse une date qui n'existe pas", () => {
    expect(validerSaisie(saisie({ echeance: "2026-02-31" })).ok).toBe(false);
  });
  it("refuse une échéance avant la date de facture", () => {
    const r = validerSaisie(saisie({ dateFacture: "2026-11-01", echeance: "2026-10-20" }));
    expect(r).toMatchObject({ ok: false, erreurs: { echeance: expect.stringMatching(/après la date de facture/) } });
  });
  it("accepte une échéance le jour même de la facture", () => {
    expect(validerSaisie(saisie({ echeance: "2026-09-20" })).ok).toBe(true);
  });
  it("refuse un numéro WhatsApp invalide et un nom vide pour un nouveau client", () => {
    const r = validerSaisie(saisie({ client: { type: "nouveau", nom: "", whatsapp: "12345678" } }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.erreurs).sort()).toEqual(["nom", "whatsapp"]);
  });
});
