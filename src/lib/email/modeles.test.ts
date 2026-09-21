import { describe, expect, it } from "vitest";
import { COULEURS_EMAIL } from "./couleurs";
import { courrielReinitialisation } from "./modeles";

describe("mise en forme des e-mails", () => {
  it("le bouton est olive sur fond crème, avec les couleurs de la constante unique", () => {
    const { html } = courrielReinitialisation("kofi@exemple.tg", "Kofi", "https://creancio.tg/x");
    expect(COULEURS_EMAIL.bouton).toBe("#4F6B2A");
    expect(COULEURS_EMAIL.fond).toBe("#F3F2EA");
    expect(html).toContain(`background-color:${COULEURS_EMAIL.bouton}`);
    expect(html).toContain(`background-color:${COULEURS_EMAIL.fond}`);
  });

  it("aucune couleur en dur en dehors de la constante", () => {
    const { html } = courrielReinitialisation("kofi@exemple.tg", "Kofi", "https://creancio.tg/x");
    const valeurs = new Set<string>(Object.values(COULEURS_EMAIL));
    for (const hex of html.match(/#[0-9A-Fa-f]{6}\b/g) ?? []) expect(valeurs.has(hex), hex).toBe(true);
  });

  it("le lien reste écrit en clair sous le bouton et le texte brut le contient aussi", () => {
    const c = courrielReinitialisation("kofi@exemple.tg", "Kofi", "https://creancio.tg/x");
    expect(c.texte).toContain("https://creancio.tg/x");
    expect(c.html.split("https://creancio.tg/x").length - 1).toBeGreaterThanOrEqual(2);
  });
});
