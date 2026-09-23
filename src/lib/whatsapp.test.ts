import { describe, expect, it } from "vitest";
import { lienWhatsApp } from "./whatsapp";

describe("lien wa.me", () => {
  it("numéro togolais enregistré (E.164) : lien avec les chiffres seuls", () => {
    expect(lienWhatsApp("+22890123456")).toBe("https://wa.me/22890123456");
    expect(lienWhatsApp("+22870123456")).toBe("https://wa.me/22870123456");
  });

  it("texte prérempli encodé : il ne peut ni changer de paramètre ni sortir de l'adresse", () => {
    expect(lienWhatsApp("+22890123456", "Bonjour & à bientôt ? #1\nhttps://x")).toBe(
      "https://wa.me/22890123456?text=Bonjour%20%26%20%C3%A0%20bient%C3%B4t%20%3F%20%231%0Ahttps%3A%2F%2Fx",
    );
  });

  it("tout ce qui n'est pas un numéro E.164 togolais : aucun lien", () => {
    for (const brut of ["90123456", "90 12 34 56", "+228 90 12 34 56", "+22880123456", "+2289012345", "+22890123456?text=x", "+22890123456/../x", "javascript:alert(1)", "+33612345678", ""]) {
      expect(lienWhatsApp(brut), brut).toBeNull();
    }
  });
});
