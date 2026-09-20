import { describe, expect, it } from "vitest";
import { aEnvoyer, ajouterALaFile, cleFile, ecrireFile, lireFile, marquerErreur, retirerDeLaFile, type FactureEnAttente, type Stockage } from "./file-attente";

const element = (cle: string, surcharge: Partial<FactureEnAttente> = {}): FactureEnAttente => ({
  saisie: { cle, numero: `FA-${cle}`, montant: "1000", dateFacture: "2026-09-20", echeance: "2026-10-20", client: { type: "existant", id: "c1" } },
  resume: `FA-${cle} · Kofi`,
  ...surcharge,
});

function faux(): Stockage {
  const donnees = new Map<string, string>();
  return { getItem: (k) => donnees.get(k) ?? null, setItem: (k, v) => void donnees.set(k, v) };
}

describe("file d'attente hors connexion", () => {
  it("garde puis relit les factures", () => {
    const s = faux();
    expect(ecrireFile(s, "e1", [element("a"), element("b")])).toBe(true);
    expect(lireFile(s, "e1").map((f) => f.saisie.cle)).toEqual(["a", "b"]);
  });

  it("ISOLATION : la file d'une entreprise n'est pas lue par une autre sur le même téléphone", () => {
    const s = faux();
    ecrireFile(s, "e1", [element("a")]);
    expect(lireFile(s, "e2")).toEqual([]);
    expect(cleFile("e1")).not.toBe(cleFile("e2"));
  });

  it("repart d'une file vide si le contenu est illisible ou si le stockage est absent", () => {
    const s = faux();
    s.setItem(cleFile("e1"), "{pas du json");
    expect(lireFile(s, "e1")).toEqual([]);
    s.setItem(cleFile("e1"), '{"a":1}');
    expect(lireFile(s, "e1")).toEqual([]);
    expect(lireFile(null, "e1")).toEqual([]);
  });

  it("dit quand le navigateur refuse d'écrire (jamais un faux « enregistré »)", () => {
    const plein: Stockage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(ecrireFile(plein, "e1", [element("a")])).toBe(false);
    expect(ecrireFile(null, "e1", [element("a")])).toBe(false);
  });

  it("n'ajoute pas deux fois la même facture", () => {
    expect(ajouterALaFile(ajouterALaFile([], element("a")), element("a"))).toHaveLength(1);
  });

  it("n'envoie que les factures qui n'ont pas été refusées, et retire celles qui sont parties", () => {
    let f = [element("a"), element("b"), element("c")];
    f = marquerErreur(f, "b", "Numéro déjà utilisé");
    expect(aEnvoyer(f).map((x) => x.saisie.cle)).toEqual(["a", "c"]);
    f = retirerDeLaFile(f, "a");
    expect(f.map((x) => x.saisie.cle)).toEqual(["b", "c"]);
    expect(f[0].erreur).toBe("Numéro déjà utilisé");
  });
});
