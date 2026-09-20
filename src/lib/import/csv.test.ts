import { describe, expect, it } from "vitest";
import { decoderTexte, detecterSeparateur, parserCsv } from "./csv";

const octets = (s: string) => new TextEncoder().encode(s);
/** Windows-1252 : les caractères accentués tiennent sur un octet. */
const CODES: Record<string, number> = { é: 0xe9, è: 0xe8, à: 0xe0, É: 0xc9, "°": 0xb0 };
const windows1252 = (s: string) => Uint8Array.from(Array.from(s, (c) => CODES[c] ?? c.charCodeAt(0)));

describe("détection du séparateur", () => {
  it("détecte le point-virgule, la virgule et la tabulation", () => {
    expect(detecterSeparateur("a;b;c\n1;2;3")).toBe(";");
    expect(detecterSeparateur("a,b,c\n1,2,3")).toBe(",");
    expect(detecterSeparateur("a\tb\tc\n1\t2\t3")).toBe("\t");
  });

  it("ignore les séparateurs entre guillemets", () => {
    expect(detecterSeparateur('"Mensah, Kofi";"1,5";x\n"Agbo, Ama";"2,5";y')).toBe(";");
  });

  it("choisit le point-virgule à égalité (usage français)", () => {
    expect(detecterSeparateur("seule colonne")).toBe(";");
  });
});

describe("décodage", () => {
  it("lit l'UTF-8 avec ou sans BOM", () => {
    expect(decoderTexte(octets("Échéance"))).toBe("Échéance");
    expect(decoderTexte(Uint8Array.from([0xef, 0xbb, 0xbf, ...octets("Échéance")]))).toBe("Échéance");
  });

  it("retombe sur Windows-1252 quand ce n'est pas de l'UTF-8", () => {
    expect(decoderTexte(windows1252("Échéance;Téléphone"))).toBe("Échéance;Téléphone");
    expect(decoderTexte(windows1252("N° facture"))).toBe("N° facture");
  });
});

describe("parserCsv", () => {
  it("découpe les lignes et les cellules", () => {
    expect(parserCsv("a;b\n1;2\n")).toEqual([["a", "b"], ["1", "2"]]);
    expect(parserCsv("a;b\r\n1;2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("gère les guillemets, les guillemets doublés et les retours à la ligne dans une cellule", () => {
    expect(parserCsv('"Mensah; Frères";"il dit ""oui""";"ligne 1\nligne 2"')).toEqual([["Mensah; Frères", 'il dit "oui"', "ligne 1\nligne 2"]]);
  });

  it("garde les cellules vides", () => {
    expect(parserCsv("a;;c\n;;")).toEqual([["a", "", "c"], ["", "", ""]]);
  });

  it("lit avec la virgule quand elle est détectée", () => {
    expect(parserCsv('n,montant\nFA-1,"1,250"')).toEqual([["n", "montant"], ["FA-1", "1,250"]]);
  });
});
