import { describe, expect, it } from "vitest";
import { analyserLignes, NOUVEAU_CLIENT, resumerComptes, type ClientConnu, type ContexteAnalyse } from "./analyse";
import type { LigneBrute } from "./types";

const ligne = (n: number, surcharge: Partial<LigneBrute> = {}): LigneBrute => ({
  ligne: n,
  numero: `FA-2026-${String(n).padStart(4, "0")}`,
  client: "Kofi Agbo",
  telephone: "90 12 34 56",
  montant: "150 000",
  echeance: "25/10/2026",
  email: "",
  ...surcharge,
});

const contexte = (clients: ClientConnu[] = [], numeros: string[] = []): ContexteAnalyse => ({ clients, numerosExistants: new Set(numeros) });

const kofi: ClientConnu = { id: "c-kofi", nom: "Kofi Agbo", whatsapp: "+22890123456" };

describe("analyserLignes : lignes valides", () => {
  it("prépare une ligne correcte avec un nouveau client", () => {
    const { lignes, comptes } = analyserLignes([ligne(4)], contexte());
    expect(lignes[0]).toMatchObject({
      statut: "prete",
      numero: "FA-2026-0004",
      montant: 150_000,
      echeance: "2026-10-25",
      client: { type: "nouveau", nom: "Kofi Agbo", whatsapp: "+22890123456" },
    });
    expect(comptes).toEqual({ pretes: 1, aCorriger: 0, dejaImportees: 0 });
  });

  it("reconnaît un client existant (même numéro, même nom aux accents et majuscules près)", () => {
    const { lignes } = analyserLignes([ligne(4, { client: "KOFI  agbo", telephone: "+228 90 12 34 56" })], contexte([kofi]));
    expect(lignes[0]).toMatchObject({ statut: "prete", client: { type: "existant", id: "c-kofi" } });
  });

  it("lit un client sans numéro quand il existe sous ce nom", () => {
    const { lignes } = analyserLignes([ligne(4, { telephone: "" })], contexte([kofi]));
    expect(lignes[0]).toMatchObject({ statut: "prete", client: { type: "existant", id: "c-kofi" } });
  });
});

describe("analyserLignes : erreurs, jamais de valeur devinée", () => {
  it("signale chaque champ illisible, sur la bonne colonne", () => {
    const { lignes, comptes } = analyserLignes(
      [ligne(4, { montant: "-500", echeance: "31/02/2026", telephone: "12345", numero: "", client: "" })],
      contexte(),
    );
    expect(lignes[0].statut).toBe("erreur");
    expect(Object.keys(lignes[0].erreurs).sort()).toEqual(["client", "echeance", "montant", "numero", "telephone"]);
    expect(comptes.aCorriger).toBe(1);
  });

  it("une ligne en erreur n'a ni montant ni date ni client retenus", () => {
    const { lignes } = analyserLignes([ligne(4, { montant: "abc" })], contexte());
    expect(lignes[0]).toMatchObject({ statut: "erreur", erreurs: { montant: expect.any(String) } });
    expect(lignes[0].montant).toBeUndefined();
    expect(lignes[0].client).toBeUndefined();
  });

  it("refuse un client inconnu sans numéro", () => {
    const { lignes } = analyserLignes([ligne(4, { telephone: "" })], contexte());
    expect(lignes[0].statut).toBe("erreur");
    expect(lignes[0].erreurs.telephone).toMatch(/n'existe pas encore/);
  });

  it("refuse un e-mail invalide", () => {
    const { lignes } = analyserLignes([ligne(4, { email: "pas-un-mail" })], contexte());
    expect(lignes[0].erreurs.email).toBeDefined();
  });
});

describe("analyserLignes : doublons", () => {
  it("signale un numéro répété dans le fichier : la première ligne reste valable, la suivante est en erreur", () => {
    const { lignes } = analyserLignes([ligne(4, { numero: "FA-1" }), ligne(5, { numero: "FA-1" }), ligne(6, { numero: "FA-1" })], contexte());
    expect(lignes.map((l) => l.statut)).toEqual(["prete", "erreur", "erreur"]);
    expect(lignes[1].erreurs.numero).toMatch(/ligne 4/);
  });

  it("marque « déjà importée » un numéro déjà enregistré, sans autre vérification", () => {
    const { lignes, comptes } = analyserLignes([ligne(4, { numero: "FA-1", montant: "n'importe quoi" })], contexte([], ["FA-1"]));
    expect(lignes[0]).toMatchObject({ statut: "deja_importee", erreurs: {} });
    expect(comptes).toEqual({ pretes: 0, aCorriger: 0, dejaImportees: 1 });
  });

  it("rejouer le même fichier ne rend aucune ligne prête", () => {
    const fichier = [ligne(4), ligne(5), ligne(6)];
    const premiere = analyserLignes(fichier, contexte());
    expect(premiere.comptes.pretes).toBe(3);
    const numeros = premiere.lignes.map((l) => l.numero!);
    const seconde = analyserLignes(fichier, contexte([], numeros));
    expect(seconde.comptes).toEqual({ pretes: 0, aCorriger: 0, dejaImportees: 3 });
  });

  it("le numéro est comparé après nettoyage des espaces", () => {
    const { lignes } = analyserLignes([ligne(4, { numero: "  FA-1  " })], contexte([], ["FA-1"]));
    expect(lignes[0].statut).toBe("deja_importee");
  });
});

describe("analyserLignes : client à choisir", () => {
  const boutique: ClientConnu = { id: "c-boutique", nom: "Boutique Agbo", whatsapp: "+22890123456" };

  it("un numéro partagé par plusieurs clients existants : la ligne est à choisir, avec les candidats", () => {
    const { lignes, comptes } = analyserLignes([ligne(4, { client: "Agbo" })], contexte([kofi, boutique]));
    expect(lignes[0].statut).toBe("a_choisir");
    expect(lignes[0].candidats?.map((c) => c.id)).toEqual(["c-kofi", "c-boutique"]);
    expect(comptes.aCorriger).toBe(1);
  });

  it("un numéro connu sous un autre nom : à choisir aussi (un numéro sert souvent à plusieurs clients)", () => {
    const { lignes } = analyserLignes([ligne(4, { client: "Nouvelle Société" })], contexte([kofi]));
    expect(lignes[0].statut).toBe("a_choisir");
    expect(lignes[0].candidats).toHaveLength(1);
  });

  it("un nom connu avec un autre numéro : à choisir", () => {
    const { lignes } = analyserLignes([ligne(4, { telephone: "70 00 00 01" })], contexte([kofi]));
    expect(lignes[0].statut).toBe("a_choisir");
  });

  it("le nom exact départage deux clients qui partagent le numéro", () => {
    const { lignes } = analyserLignes([ligne(4, { client: "Boutique Agbo" })], contexte([kofi, boutique]));
    expect(lignes[0]).toMatchObject({ statut: "prete", client: { type: "existant", id: "c-boutique" } });
  });

  it("deux clients de même nom et de même numéro : à choisir", () => {
    const double = { ...kofi, id: "c-kofi-2" };
    expect(analyserLignes([ligne(4)], contexte([kofi, double])).lignes[0].statut).toBe("a_choisir");
  });

  it("le choix d'un client existant rend la ligne prête, pour toutes les lignes du même client", () => {
    const fichier = [ligne(4, { client: "Agbo" }), ligne(5, { client: "agbo" }), ligne(6, { client: "Autre", telephone: "70 00 00 02" })];
    const ctx = contexte([kofi, boutique]);
    const cle = analyserLignes(fichier, ctx).lignes[0].cleClient!;
    const { lignes } = analyserLignes(fichier, ctx, { [cle]: "c-boutique" });
    expect(lignes.map((l) => l.statut)).toEqual(["prete", "prete", "prete"]);
    expect(lignes[0].client).toMatchObject({ type: "existant", id: "c-boutique" });
    expect(lignes[1].client).toMatchObject({ type: "existant", id: "c-boutique" });
  });

  it("« créer un nouveau client » rend la ligne prête avec un client à créer", () => {
    const ctx = contexte([kofi, boutique]);
    const cle = analyserLignes([ligne(4, { client: "Agbo" })], ctx).lignes[0].cleClient!;
    const { lignes } = analyserLignes([ligne(4, { client: "Agbo" })], ctx, { [cle]: NOUVEAU_CLIENT });
    expect(lignes[0]).toMatchObject({ statut: "prete", client: { type: "nouveau", nom: "Agbo", whatsapp: "+22890123456" } });
  });

  it("un choix qui ne fait pas partie des candidats est refusé : la ligne reste à choisir", () => {
    const ctx = contexte([kofi, boutique]);
    const cle = analyserLignes([ligne(4, { client: "Agbo" })], ctx).lignes[0].cleClient!;
    const { lignes } = analyserLignes([ligne(4, { client: "Agbo" })], ctx, { [cle]: "id-d-une-autre-entreprise" });
    expect(lignes[0].statut).toBe("a_choisir");
  });

  it("une autre erreur passe avant le choix du client", () => {
    const { lignes } = analyserLignes([ligne(4, { client: "Agbo", montant: "abc" })], contexte([kofi, boutique]));
    expect(lignes[0].statut).toBe("erreur");
    expect(lignes[0].candidats).toHaveLength(2);
  });
});

describe("résumé", () => {
  it("écrit le compteur permanent", () => {
    expect(resumerComptes({ pretes: 247, aCorriger: 3, dejaImportees: 0 })).toBe("247 prêtes, 3 à corriger");
    expect(resumerComptes({ pretes: 1, aCorriger: 0, dejaImportees: 12 })).toBe("1 prête, 0 à corriger, 12 déjà importées");
  });
});
