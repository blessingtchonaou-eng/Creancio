import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { lireFichier } from "./lecture";
import { ErreurImport } from "./types";
import { verifierArchiveZip } from "./zip-guard";

async function xlsx(feuilles: Record<string, unknown[][]>): Promise<Uint8Array> {
  const classeur = new ExcelJS.Workbook();
  for (const [nom, lignes] of Object.entries(feuilles)) {
    const feuille = classeur.addWorksheet(nom);
    for (const l of lignes) feuille.addRow(l);
  }
  return new Uint8Array(await classeur.xlsx.writeBuffer());
}

const texte = (s: string) => new TextEncoder().encode(s);

describe("lireFichier : Excel", () => {
  it("lit en-têtes dans un autre ordre, avec accents et colonne inconnue, en ignorant les lignes vides", async () => {
    const fichier = await xlsx({
      Factures: [
        ["Relevé des impayés – septembre"],
        [],
        ["Montant TTC", "Date d'échéance", "N° facture", "Commentaire", "Nom du client", "Téléphone"],
        [1_250_000, new Date(Date.UTC(2026, 9, 25)), "FA-1", "urgent", "Kofi Agbo", 90123456],
        [],
        ["1 250 000 FCFA", "25/10/2026", "FA-2", null, "Ama Mensah", "+228 90 12 34 56"],
        [null, null, null, null, null, null],
        [75_000, 46_310, "FA-3", null, "Yao", "0022870123456"],
      ],
    });
    const lecture = await lireFichier("test.xlsx", fichier);
    expect(lecture.colonnesIgnorees).toEqual(["Commentaire"]);
    expect(lecture.lignes).toEqual([
      { ligne: 4, numero: "FA-1", client: "Kofi Agbo", telephone: "90123456", montant: "1250000", echeance: "25/10/2026", email: "" },
      { ligne: 6, numero: "FA-2", client: "Ama Mensah", telephone: "+228 90 12 34 56", montant: "1 250 000 FCFA", echeance: "25/10/2026", email: "" },
      { ligne: 8, numero: "FA-3", client: "Yao", telephone: "0022870123456", montant: "75000", echeance: expect.stringMatching(/^\d{2}\/\d{2}\/20\d{2}$/), email: "" },
    ]);
  });

  it("lit une formule par son résultat et un texte enrichi", async () => {
    const classeur = new ExcelJS.Workbook();
    const f = classeur.addWorksheet("Factures");
    f.addRow(["Numéro", "Client", "Montant", "Échéance"]);
    f.addRow(["FA-1", { richText: [{ text: "Kofi " }, { text: "Agbo" }] }, { formula: "100000+50000", result: 150_000 }, "25/10/2026"]);
    const lecture = await lireFichier("f.xlsx", new Uint8Array(await classeur.xlsx.writeBuffer()));
    expect(lecture.lignes[0]).toMatchObject({ client: "Kofi Agbo", montant: "150000" });
  });

  it("choisit la feuille qui contient les factures, pas la feuille d'explications", async () => {
    const fichier = await xlsx({
      Notes: [["Mode d'emploi"], ["Remplissez la feuille suivante"]],
      Factures: [["Numéro", "Client", "Montant", "Échéance"], ["FA-1", "Kofi", 1000, "25/10/2026"]],
    });
    const lecture = await lireFichier("f.xlsx", fichier);
    expect(lecture.feuille).toBe("Factures");
    expect(lecture.lignes).toHaveLength(1);
  });

  it("signale une colonne obligatoire manquante", async () => {
    const fichier = await xlsx({ F: [["Numéro", "Client", "Montant"], ["FA-1", "Kofi", 1000]] });
    await expect(lireFichier("f.xlsx", fichier)).rejects.toThrow(/Échéance/);
  });

  it("avertit quand deux colonnes désignent la même chose", async () => {
    const fichier = await xlsx({ F: [["Numéro", "Client", "Montant", "Total", "Échéance"], ["FA-1", "Kofi", 1000, 2000, "25/10/2026"]] });
    const lecture = await lireFichier("f.xlsx", fichier);
    expect(lecture.avertissements[0]).toMatch(/Montant/);
    expect(lecture.lignes[0].montant).toBe("1000");
  });

  it("refuse un fichier sans factures sous les titres", async () => {
    const fichier = await xlsx({ F: [["Numéro", "Client", "Montant", "Échéance"]] });
    await expect(lireFichier("f.xlsx", fichier)).rejects.toThrow(/aucune facture/);
  });
});

describe("lireFichier : CSV", () => {
  const entetes = ["Numéro", "Client", "Téléphone", "Montant", "Échéance"];

  it("lit un CSV UTF-8 à point-virgule", async () => {
    const csv = `${entetes.join(";")}\nFA-1;Kofi Agbo;90123456;1 250 000;25/10/2026\n;;;;\nFA-2;Ama;70123456;75000;05-11-2026\n`;
    const lecture = await lireFichier("f.csv", texte(csv));
    expect(lecture.lignes.map((l) => l.numero)).toEqual(["FA-1", "FA-2"]);
    expect(lecture.lignes[1]).toMatchObject({ ligne: 4, echeance: "05-11-2026" });
  });

  it("lit un CSV à virgule avec montants entre guillemets", async () => {
    const csv = `${entetes.join(",")}\nFA-1,Kofi Agbo,90123456,"1,250,000",25/10/2026\n`;
    expect((await lireFichier("f.csv", texte(csv))).lignes[0].montant).toBe("1,250,000");
  });

  it("lit un CSV en Windows-1252 avec en-têtes accentués", async () => {
    const CODES: Record<string, number> = { é: 0xe9, É: 0xc9, "°": 0xb0 };
    const contenu = "N° facture;Client;Montant;Échéance\nFA-1;Kofi;1000;25/10/2026\n";
    const octets = Uint8Array.from(Array.from(contenu, (c) => CODES[c] ?? c.charCodeAt(0)));
    const lecture = await lireFichier("f.csv", octets);
    expect(lecture.lignes[0]).toMatchObject({ numero: "FA-1", client: "Kofi", echeance: "25/10/2026" });
  });

  it("lit un CSV UTF-8 avec BOM", async () => {
    const csv = `﻿${entetes.join(";")}\nFA-1;Kofi;90123456;1000;25/10/2026\n`;
    expect((await lireFichier("f.csv", texte(csv))).lignes).toHaveLength(1);
  });
});

describe("lireFichier : fichiers refusés", () => {
  it("refuse un format inconnu, un .xls, un fichier vide et un faux .xlsx", async () => {
    await expect(lireFichier("f.pdf", texte("x"))).rejects.toThrow(ErreurImport);
    await expect(lireFichier("f.xls", texte("x"))).rejects.toThrow(/\.xlsx/);
    await expect(lireFichier("f.csv", new Uint8Array())).rejects.toThrow(/vide/);
    await expect(lireFichier("f.xlsx", texte("ceci n'est pas un zip"))).rejects.toThrow(/vrai fichier/);
  });

  it("refuse plus de 2 Mo", async () => {
    await expect(lireFichier("f.csv", new Uint8Array(2 * 1024 * 1024 + 1).fill(97))).rejects.toThrow(/2 Mo/);
  });

  it("refuse plus de 1000 lignes", async () => {
    const csv = ["Numéro;Client;Montant;Échéance", ...Array.from({ length: 1001 }, (_, i) => `FA-${i};K;1000;25/10/2026`)].join("\n");
    await expect(lireFichier("f.csv", texte(csv))).rejects.toThrow(/plus de 1.000 lignes/);
  });

  it("refuse un CSV binaire", async () => {
    await expect(lireFichier("f.csv", Uint8Array.from([0x41, 0x00, 0x42]))).rejects.toThrow(/vrai fichier CSV/);
  });
});

describe("garde contre les archives ZIP piégées", () => {
  it("accepte un vrai .xlsx", async () => {
    const fichier = await xlsx({ F: [["a"]] });
    expect(verifierArchiveZip(fichier)).toMatchObject({ ok: true });
  });

  it("refuse une archive qui annonce une taille décompressée énorme", async () => {
    const fichier = await xlsx({ F: [["a"]] });
    const trafique = new Uint8Array(fichier);
    const vue = new DataView(trafique.buffer);
    // Annuaire central : on gonfle la taille décompressée déclarée de la première entrée à 500 Mo.
    let fin = trafique.length - 22;
    while (vue.getUint32(fin, true) !== 0x06054b50) fin--;
    const debut = vue.getUint32(fin + 16, true);
    vue.setUint32(debut + 24, 500 * 1024 * 1024, true);
    const r = verifierArchiveZip(trafique);
    expect(r).toMatchObject({ ok: false });
    expect(r.ok ? "" : r.error).toMatch(/volumineux/);
  });

  it("refuse une archive tronquée", async () => {
    const fichier = await xlsx({ F: [["a"]] });
    expect(verifierArchiveZip(fichier.slice(0, fichier.length - 30))).toMatchObject({ ok: false });
  });
});
