import { describe, expect, it } from "vitest";
import { parserMontant } from "./montant";

const valeur = (s: string) => {
  const r = parserMontant(s);
  return r.ok ? r.valeur : r.error;
};

describe("parserMontant : formats acceptés", () => {
  it.each([
    ["1250000", 1_250_000],
    ["1 250 000", 1_250_000],
    ["1 250 000", 1_250_000], // espace insécable
    ["1 250 000", 1_250_000], // espace fine insécable (export Excel)
    ["1 250 000 FCFA", 1_250_000],
    ["1 250 000 F CFA", 1_250_000],
    ["1250000fcfa", 1_250_000],
    ["1250000 XOF", 1_250_000],
    ["1.250.000", 1_250_000],
    ["1,250,000", 1_250_000],
    ["  75000  ", 75_000],
    ["1250000,00", 1_250_000], // centimes nuls : la valeur ne change pas
    ["1.250.000,00", 1_250_000],
  ])("« %s » → %i", (entree, attendu) => {
    expect(valeur(entree)).toBe(attendu);
  });

  it("lit un nombre de cellule Excel (converti en texte)", () => {
    expect(valeur(String(1_250_000))).toBe(1_250_000);
  });
});

describe("parserMontant : refus", () => {
  it("refuse les décimales", () => {
    expect(valeur("1250000,50")).toMatch(/entier/);
    expect(valeur("1250.5")).toMatch(/entier/);
    expect(valeur("1 250 000,5 FCFA")).toMatch(/entier/);
    expect(valeur(String(1250000.5))).toMatch(/entier/);
  });

  it("refuse les montants négatifs", () => {
    expect(valeur("-5000")).toMatch(/négatif/);
    expect(valeur("−5000")).toMatch(/négatif/);
    expect(valeur("(5000)")).toMatch(/négatif/);
    expect(valeur("-1 250 000 FCFA")).toMatch(/négatif/);
  });

  it("refuse zéro", () => {
    expect(valeur("0")).toMatch(/supérieur à 0/);
    expect(valeur("0 FCFA")).toMatch(/supérieur à 0/);
    expect(valeur("0,00")).toMatch(/supérieur à 0/);
  });

  it("refuse le vide, le texte et les valeurs trop grandes", () => {
    expect(valeur("")).toMatch(/Saisissez/);
    expect(valeur("   ")).toMatch(/Saisissez/);
    expect(valeur("abc")).toMatch(/illisible/);
    expect(valeur("12 x 50")).toMatch(/illisible/);
    expect(valeur("1e6")).toMatch(/illisible/);
    expect(valeur("99999999999")).toMatch(/trop grand/);
  });
});
