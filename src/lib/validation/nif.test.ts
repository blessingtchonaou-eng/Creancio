import { describe, expect, it } from "vitest";
import { nifAEnregistrer, ressembleAUnNif } from "./nif";

describe("ressembleAUnNif", () => {
  it("accepte un champ vide et un NIF en chiffres", () => {
    expect(ressembleAUnNif("")).toBe(true);
    expect(ressembleAUnNif("   ")).toBe(true);
    expect(ressembleAUnNif("1000123456")).toBe(true);
    expect(ressembleAUnNif(" 1000 123-456 ")).toBe(true);
  });

  it("signale (sans refuser) ce qui ne ressemble pas à un NIF", () => {
    for (const bizarre of ["ABC123", "12345", "12345678901234", "10@0123456"]) {
      expect(ressembleAUnNif(bizarre)).toBe(false);
    }
  });
});

describe("nifAEnregistrer", () => {
  it("vide → null", () => {
    expect(nifAEnregistrer("  ")).toBeNull();
  });

  it("nettoie un NIF au format reconnu", () => {
    expect(nifAEnregistrer(" 1000 123-456 ")).toBe("1000123456");
  });

  it("garde tel quel un NIF qui ne correspond pas au format : on ne refuse jamais un vrai NIF", () => {
    expect(nifAEnregistrer(" 1000123456X ")).toBe("1000123456X");
    expect(nifAEnregistrer("TG-98/12")).toBe("TG-98/12");
  });
});
