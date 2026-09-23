import { describe, expect, it } from "vitest";
import { creerJetonFormulaire, lireJetonFormulaire } from "./pilote";

describe("jeton horodaté du formulaire pilote", () => {
  const t0 = 1_790_000_000_000;

  it("lu 3 s ou plus après l'affichage : valide ; avant : trop rapide", () => {
    const jeton = creerJetonFormulaire(t0);
    expect(lireJetonFormulaire(jeton, t0 + 3_000)).toBe("valide");
    expect(lireJetonFormulaire(jeton, t0 + 2_999)).toBe("trop-rapide");
    expect(lireJetonFormulaire(jeton, t0)).toBe("trop-rapide");
  });

  it("plus de 24 h : expiré", () => {
    const jeton = creerJetonFormulaire(t0);
    expect(lireJetonFormulaire(jeton, t0 + 24 * 3600 * 1000)).toBe("valide");
    expect(lireJetonFormulaire(jeton, t0 + 24 * 3600 * 1000 + 1)).toBe("expire");
  });

  it("horodatage modifié, signature fausse, format inconnu ou absent : invalide", () => {
    const [, sig] = creerJetonFormulaire(t0).split(".");
    expect(lireJetonFormulaire(`${t0 - 60_000}.${sig}`, t0)).toBe("invalide"); // on recule l'heure pour paraître lent
    expect(lireJetonFormulaire(`${t0}.${"a".repeat(32)}`, t0 + 5_000)).toBe("invalide");
    expect(lireJetonFormulaire(`${t0}`, t0 + 5_000)).toBe("invalide");
    expect(lireJetonFormulaire("n'importe quoi", t0)).toBe("invalide");
    expect(lireJetonFormulaire(null, t0)).toBe("invalide");
    expect(lireJetonFormulaire(new File([], "x"), t0)).toBe("invalide");
  });

  it("jeton venant du futur : toléré jusqu'à 1 minute (horloges de deux serveurs), invalide au-delà", () => {
    const jeton = creerJetonFormulaire(t0);
    expect(lireJetonFormulaire(jeton, t0 - 30_000)).toBe("trop-rapide");
    expect(lireJetonFormulaire(jeton, t0 - 61_000)).toBe("invalide");
  });
});
