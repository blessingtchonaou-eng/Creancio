import { describe, expect, it } from "vitest";
import { dateExcelVersTexte, parserDate, serieExcelVersTexte } from "./date";

const iso = (s: string) => {
  const r = parserDate(s);
  return r.ok ? r.iso : r.error;
};

describe("parserDate", () => {
  it("lit JJ/MM/AAAA et JJ-MM-AAAA, le jour d'abord", () => {
    expect(iso("25/10/2026")).toBe("2026-10-25");
    expect(iso("25-10-2026")).toBe("2026-10-25");
    expect(iso("05/10/2026")).toBe("2026-10-05"); // 5 octobre, pas 10 mai
    expect(iso("5/1/2026")).toBe("2026-01-05");
    expect(iso("25.10.2026")).toBe("2026-10-25");
  });

  it("lit une date ISO et ignore l'heure", () => {
    expect(iso("2026-10-25")).toBe("2026-10-25");
    expect(iso("25/10/2026 00:00:00")).toBe("2026-10-25");
    expect(iso("2026-10-25T00:00:00Z")).toBe("2026-10-25");
  });

  it("accepte le 29 février d'une année bissextile seulement", () => {
    expect(iso("29/02/2028")).toBe("2028-02-29");
    expect(iso("29/02/2027")).toMatch(/n'existe pas/);
  });

  it("refuse les dates inexistantes plutôt que de les corriger", () => {
    expect(iso("31/02/2026")).toMatch(/n'existe pas/);
    expect(iso("32/01/2026")).toMatch(/n'existe pas/);
    expect(iso("10/25/2026")).toMatch(/n'existe pas/); // format américain : le mois 25 n'existe pas
    expect(iso("00/10/2026")).toMatch(/n'existe pas/);
  });

  it("refuse l'année sur 2 chiffres, le texte, le vide et les années absurdes", () => {
    expect(iso("25/10/26")).toMatch(/4 chiffres/);
    expect(iso("bientôt")).toMatch(/illisible/);
    expect(iso("25 octobre 2026")).toMatch(/illisible/);
    expect(iso("")).toMatch(/Saisissez/);
    expect(iso("25/10/0026")).toMatch(/année/);
    expect(iso("25/10/2126")).toMatch(/année/);
  });
});

describe("cellules Excel", () => {
  it("convertit une cellule date (minuit UTC)", () => {
    expect(dateExcelVersTexte(new Date(Date.UTC(2026, 9, 25)))).toBe("25/10/2026");
    expect(dateExcelVersTexte(new Date("invalide"))).toBe("");
  });

  it("convertit un numéro de série Excel", () => {
    expect(serieExcelVersTexte(46_000)).toBe("09/12/2025"); // repère : 46000 jours après le 30/12/1899
    expect(serieExcelVersTexte(46_000.75)).toBe("09/12/2025"); // l'heure est ignorée
    expect(parserDate(serieExcelVersTexte(46_310)).ok).toBe(true);
  });

  it("laisse tel quel un nombre qui n'est pas une date plausible", () => {
    expect(serieExcelVersTexte(5)).toBe("5");
    expect(serieExcelVersTexte(1_250_000)).toBe("1250000");
    expect(parserDate(serieExcelVersTexte(5)).ok).toBe(false);
  });
});
