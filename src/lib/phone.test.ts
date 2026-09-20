import { describe, expect, it } from "vitest";
import { formatTogoPhone, normalizeTogoPhone } from "./phone";

describe("normalizeTogoPhone", () => {
  it.each(["90123456", "90 12 34 56", "+228 90 12 34 56", "0022890123456", "228 90123456", "+228-90.12.34.56", "(90) 12 34 56"])(
    "accepte %s",
    (input) => expect(normalizeTogoPhone(input)).toEqual({ ok: true, e164: "+22890123456" }),
  );

  it("accepte les numéros commençant par 7", () => {
    expect(normalizeTogoPhone("70 12 34 56")).toEqual({ ok: true, e164: "+22870123456" });
  });

  it.each([
    ["", "Saisissez"],
    ["9012345", "8 chiffres"],
    ["901234567", "8 chiffres"],
    ["80123456", "7 ou 9"],
    ["+229 90123456", "8 chiffres"],
    ["90 12 ab 56", "chiffres"],
    ["90+123456", "début"],
  ])("refuse %j", (input, fragment) => {
    const r = normalizeTogoPhone(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(fragment);
  });
});

describe("formatTogoPhone", () => {
  it("regroupe par paires", () => expect(formatTogoPhone("+22890123456")).toBe("+228 90 12 34 56"));
  it("laisse une valeur inconnue telle quelle", () => expect(formatTogoPhone("abc")).toBe("abc"));
});
