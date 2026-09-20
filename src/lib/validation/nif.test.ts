import { describe, expect, it } from "vitest";
import { validerNif } from "./nif";

describe("validerNif", () => {
  it("accepte un champ vide (facultatif)", () => {
    expect(validerNif("")).toEqual({ ok: true, nif: null });
    expect(validerNif("   ")).toEqual({ ok: true, nif: null });
  });

  it("accepte un NIF en chiffres", () => {
    expect(validerNif("1000123456")).toEqual({ ok: true, nif: "1000123456" });
  });

  it("retire les espaces, points et tirets", () => {
    expect(validerNif(" 1000 123-456 ")).toEqual({ ok: true, nif: "1000123456" });
  });

  it("refuse les lettres, les symboles et les longueurs impossibles", () => {
    for (const mauvais of ["ABC123", "1000123456X", "12345", "12345678901234", "10@0123456"]) {
      expect(validerNif(mauvais).ok).toBe(false);
    }
  });
});
