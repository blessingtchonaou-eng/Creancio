import { readFileSync } from "node:fs";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { beforeAll, describe, expect, it } from "vitest";
import { analyserLignes, statutSelonEcheance, type ClientConnu, type ContexteAnalyse, type LigneAnalysee } from "./analyse";
import { lireFichier } from "./lecture";
import type { Lecture } from "./types";

/**
 * Fichier de test volontairement sale (tests/fixtures/creancio-import-test-sale.xlsx, 24 lignes).
 * Sa feuille « Résultat attendu » décrit le comportement attendu ligne par ligne ; chaque ligne y est un test ci-dessous.
 * Les deux règles absolues : jamais de valeur devinée en silence, jamais de ligne en erreur importée.
 */
const FICHIER = join(process.cwd(), "tests", "fixtures", "creancio-import-test-sale.xlsx");
const EXPORT_LE = "2026-09-20"; // date affichée dans le titre du fichier

// Clients du seed (entreprise de démonstration) ; FA-2026-0129 est aussi dans le seed.
const client = (id: string, nom: string, whatsapp: string): ClientConnu => ({ id, nom, whatsapp });
const AGBEKO = client("c1", "Quincaillerie Agbéko", "+22890123456");
const CLIENTS_SEED = [
  AGBEKO,
  client("c2", "Pharmacie du Port", "+22891234567"),
  client("c3", "Hôtel Les Cocotiers", "+22879345678"),
  client("c4", "Garage Kodjo & Fils", "+22892456789"),
  client("c5", "Boutique Ama Mode", "+22870567890"),
];
const EXISTANTES = new Set(["FA-2026-0129"]);

const contexte = (clients: ClientConnu[], aujourdhui = EXPORT_LE): ContexteAnalyse => ({ clients, numerosExistants: EXISTANTES, aujourdhui });

let lecture: Lecture;
let vide: Map<number, LigneAnalysee>; // aucun client en base : seul le numéro FA-2026-0129 existe
let seed: Map<number, LigneAnalysee>; // clients du seed

const parLigne = (lignes: LigneAnalysee[]) => new Map(lignes.map((l) => [l.ligne, l]));

beforeAll(async () => {
  lecture = await lireFichier("creancio-import-test-sale.xlsx", new Uint8Array(readFileSync(FICHIER)));
  vide = parLigne(analyserLignes(lecture.lignes, contexte([])).lignes);
  seed = parLigne(analyserLignes(lecture.lignes, contexte(CLIENTS_SEED)).lignes);
});

describe("fichier sale : lecture", () => {
  it("trouve les en-têtes en ligne 3 malgré la ligne de titre et les noms différents", () => {
    expect(lecture.feuille).toBe("Factures");
    expect(lecture.lignes[0].ligne).toBe(4);
    expect(lecture.lignes[0]).toMatchObject({ numero: "FA-2026-0201", client: "Quincaillerie Agbéko", telephone: "90123456", montant: "1250000" });
  });

  it("ignore la colonne inconnue « Remarque » sans bloquer, et le dit", () => {
    expect(lecture.colonnesIgnorees).toEqual(["Remarque"]);
    expect(lecture.avertissements).toEqual([]);
  });

  it("ignore la ligne 19 entièrement vide, sans la compter comme une erreur", () => {
    expect(lecture.lignes.map((l) => l.ligne)).not.toContain(19);
    expect(lecture.lignes).toHaveLength(23); // 24 lignes dont 1 vide
  });

  it("n'a pas de colonne « Date de facture » : l'aperçu doit le signaler", () => {
    expect(lecture.colonneDateFacture).toBe(false);
  });

  it("ne lit aucune ligne vide ni ne lève d'erreur : aucune ligne ne fait planter l'analyse", () => {
    expect(() => analyserLignes(lecture.lignes, contexte(CLIENTS_SEED))).not.toThrow();
    expect(vide.size).toBe(23);
  });
});

describe("fichier sale : lignes importées", () => {
  it("ligne 4 : ligne propre, 1 250 000 FCFA, échéance 28/08/2026, statut ÉCHUE (date passée)", () => {
    const l = vide.get(4)!;
    expect(l).toMatchObject({ statut: "prete", montant: 1_250_000, echeance: "2026-08-28" });
    expect(statutSelonEcheance(l.echeance!, EXPORT_LE)).toBe("ECHUE");
  });

  it("ligne 5 : « 1 250 000 », « +228 90 12 34 56 », JJ/MM/AAAA", () => {
    expect(vide.get(5)).toMatchObject({ statut: "prete", montant: 1_250_000, echeance: "2026-10-05", client: { type: "nouveau", whatsapp: "+22890123456" } });
  });

  it("ligne 6 : suffixe FCFA retiré, tirets acceptés, 00228 converti en +228", () => {
    expect(vide.get(6)).toMatchObject({ statut: "prete", montant: 860_000, echeance: "2026-10-12", client: { type: "nouveau", whatsapp: "+22891223344" } });
  });

  it("ligne 7 : points de milliers, date ISO, espaces dans le numéro", () => {
    expect(vide.get(7)).toMatchObject({ statut: "prete", montant: 1_250_000, echeance: "2026-10-15", client: { type: "nouveau", whatsapp: "+22892556677" } });
  });

  it("ligne 8 : échéance en numéro de série Excel (46320) convertie en 25/10/2026, jamais une date fausse", () => {
    expect(vide.get(8)).toMatchObject({ statut: "prete", montant: 690_000, echeance: "2026-10-25" });
  });

  it("ligne 25 : échéance du 15/07/2026 déjà passée → ÉCHUE, pas À VENIR", () => {
    const l = vide.get(25)!;
    expect(l.statut).toBe("prete");
    expect(statutSelonEcheance(l.echeance!, EXPORT_LE)).toBe("ECHUE");
    expect(statutSelonEcheance("2026-11-18", EXPORT_LE)).toBe("A_VENIR");
  });

  it("lignes 26 et 27 : lignes propres, importées", () => {
    expect(vide.get(26)).toMatchObject({ statut: "prete", montant: 1_040_000, echeance: "2026-11-18" });
    expect(vide.get(27)).toMatchObject({ statut: "prete", montant: 2_300_000, echeance: "2026-11-20" });
  });

  it("sans « Date de facture » dans le fichier : la date du jour est utilisée, et marquée comme telle", () => {
    for (const n of [4, 5, 6, 7, 8, 25, 26, 27]) expect(vide.get(n), `ligne ${n}`).toMatchObject({ dateFacture: EXPORT_LE, dateFactureParDefaut: true });
  });
});

describe("fichier sale : erreurs visibles (rien n'est deviné)", () => {
  const erreur = (n: number, champ: string, motif: RegExp) => {
    const l = vide.get(n)!;
    expect(l.statut, `ligne ${n}`).toBe("erreur");
    expect(l.erreurs[champ as keyof typeof l.erreurs], `ligne ${n}`).toMatch(motif);
  };

  it("ligne 9 : date en toutes lettres « 5 octobre 2026 » → erreur, pas de date devinée", () => {
    erreur(9, "echeance", /./);
    expect(vide.get(9)!.echeance).toBeUndefined();
  });
  it("ligne 10 : 31/02/2026 → cette date n'existe pas", () => erreur(10, "echeance", /n'existe pas/i));
  it("ligne 11 : « huit cent mille » → montant illisible", () => erreur(11, "montant", /./));
  it("ligne 12 : montant négatif → erreur", () => erreur(12, "montant", /négatif|supérieur à (zéro|0)/i));
  it("ligne 13 : montant nul → doit être supérieur à zéro", () => erreur(13, "montant", /supérieur à (zéro|0)/i));
  it("ligne 14 : 125 000,75 → erreur, le FCFA n'a pas de décimales (jamais arrondi en silence)", () => {
    erreur(14, "montant", /./);
    expect(vide.get(14)!.montant).toBeUndefined();
  });
  it("ligne 15 : téléphone commençant par 1 → numéro togolais invalide", () => erreur(15, "telephone", /./));
  it("ligne 16 : téléphone à 7 chiffres → numéro incomplet", () => erreur(16, "telephone", /./));
  it("ligne 17 : nom du client vide → client obligatoire", () => erreur(17, "client", /nom du client/i));
  it("ligne 18 : numéro de facture vide → erreur (aucun numéro inventé)", () => {
    erreur(18, "numero", /numéro/i);
    expect(vide.get(18)!.numero).toBeUndefined();
  });
  it("ligne 20 : FA-2026-0201 déjà à la ligne 4 → erreur de doublon dans le fichier ; une seule des deux est importable", () => {
    erreur(20, "numero", /ligne 4/);
    expect(vide.get(4)!.statut).toBe("prete");
  });
  it("ligne 24 : sans téléphone et client inconnu → erreur", () => erreur(24, "telephone", /WhatsApp/));
});

describe("fichier sale : clients et déjà importées", () => {
  it("ligne 21 : FA-2026-0129 déjà en base → « déjà importée », ignorée, jamais dupliquée", () => {
    expect(vide.get(21)!.statut).toBe("deja_importee");
    expect(seed.get(21)!.statut).toBe("deja_importee");
  });

  it("ligne 22 : espaces et minuscules retirés, rapprochée du client existant de même numéro", () => {
    const existant = client("c9", "Pharmacie du Port", "+22890123456");
    const l = parLigne(analyserLignes(lecture.lignes, contexte([...CLIENTS_SEED, existant])).lignes).get(22)!;
    expect(l).toMatchObject({ statut: "prete", client: { type: "existant", id: "c9" } });
  });

  it("ligne 22, client inconnu : espaces et minuscules retirés, un nouveau client « pharmacie du port »", () => {
    expect(vide.get(22)).toMatchObject({ statut: "prete", client: { type: "nouveau", nom: "pharmacie du port", whatsapp: "+22890123456" } });
  });

  it("ligne 23 : le numéro appartient déjà à un autre client → « à choisir », liste des clients de ce numéro, sans deviner", () => {
    const l = seed.get(23)!;
    expect(l.statut).toBe("a_choisir");
    expect(l.candidats).toEqual([AGBEKO]);
    // Un numéro partagé par deux clients : les deux sont proposés.
    const deux = [AGBEKO, client("c8", "Boutique Les Frères", "+22890123456")];
    const l2 = parLigne(analyserLignes(lecture.lignes, contexte(deux)).lignes).get(23)!;
    expect(l2.statut).toBe("a_choisir");
    expect(l2.candidats).toEqual(deux);
  });

  it("ligne 23 : le choix « créer un nouveau client » et le choix d'un client existant lèvent l'ambiguïté", () => {
    const l = seed.get(23)!;
    const avec = (choix: string) => parLigne(analyserLignes(lecture.lignes, contexte(CLIENTS_SEED), { [l.cleClient!]: choix }).lignes).get(23)!;
    expect(avec("nouveau")).toMatchObject({ statut: "prete", client: { type: "nouveau", whatsapp: "+22890123456" } });
    expect(avec("c1")).toMatchObject({ statut: "prete", client: { type: "existant", id: "c1" } });
  });

  it("ligne 24 : sans téléphone, rapprochée du client connu de même nom", () => {
    expect(seed.get(24)).toMatchObject({ statut: "prete", client: { type: "existant", id: "c1" } });
  });
});

describe("fichier sale : jamais de rapprochement sur le seul numéro (clients du seed)", () => {
  it.each([
    [5, "Pharmacie du Port a le numéro de « Quincaillerie Agbéko » (nom différent)"],
    [6, "« Hôtel Les Cocotiers » existe avec un autre numéro"],
    [7, "« Boutique Ama Mode » existe avec un autre numéro"],
    [8, "« Garage Kodjo & Fils » existe avec un autre numéro"],
  ])("ligne %i : à choisir, jamais importée sans choix (%s)", (n) => {
    const l = seed.get(n)!;
    expect(l.statut).toBe("a_choisir");
    expect(l.client).toBeUndefined();
    expect(l.candidats?.length).toBeGreaterThan(0);
  });
});

describe("fichier sale : règles absolues", () => {
  it("aucune ligne en erreur, à choisir ou déjà importée n'est prête à l'import (contexte vide et contexte du seed)", () => {
    for (const analyses of [vide, seed]) {
      for (const l of analyses.values()) {
        if (l.statut !== "prete") expect(l.client, `ligne ${l.ligne}`).toBeUndefined();
        if (l.statut === "erreur") expect(Object.keys(l.erreurs).length, `ligne ${l.ligne}`).toBeGreaterThan(0);
      }
    }
  });

  it("compteurs, base vide : 10 prêtes, 12 à corriger, 1 déjà importée", () => {
    expect(analyserLignes(lecture.lignes, contexte([])).comptes).toEqual({ pretes: 10, aCorriger: 12, dejaImportees: 1 });
  });

  it("toute ligne prête a un montant entier > 0, une échéance valide et un client", () => {
    for (const l of vide.values()) {
      if (l.statut !== "prete") continue;
      expect(Number.isInteger(l.montant), `ligne ${l.ligne}`).toBe(true);
      expect(l.montant!, `ligne ${l.ligne}`).toBeGreaterThan(0);
      expect(l.echeance, `ligne ${l.ligne}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(l.client, `ligne ${l.ligne}`).toBeDefined();
    }
  });
});

describe("fichier sale : la feuille « Résultat attendu » est entièrement couverte", () => {
  it("chaque ligne décrite dans la feuille est testée ci-dessus", async () => {
    const classeur = new ExcelJS.Workbook();
    await classeur.xlsx.readFile(FICHIER);
    const feuille = classeur.getWorksheet("Résultat attendu")!;
    const decrites: string[] = [];
    feuille.eachRow((row, n) => {
      const a = String(row.getCell(1).value ?? "");
      if (n >= 5 && /^\d+(-\d+)?$/.test(a)) decrites.push(a);
    });
    const couvertes = ["4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26-27"];
    expect(decrites).toEqual(couvertes);
  });
});
