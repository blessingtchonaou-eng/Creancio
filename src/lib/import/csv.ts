export type Separateur = ";" | "," | "\t";

/**
 * Décode un fichier CSV : UTF-8 (avec ou sans BOM) et, s'il n'est pas de l'UTF-8 valide,
 * Windows-1252 (l'encodage des exports Excel français).
 */
export function decoderTexte(octets: Uint8Array): string {
  let texte: string;
  try {
    texte = new TextDecoder("utf-8", { fatal: true }).decode(octets);
  } catch {
    texte = new TextDecoder("windows-1252").decode(octets);
  }
  return texte.replace(/^﻿/, "");
}

/** Compte les séparateurs d'une ligne, hors guillemets. */
function compterSeparateurs(ligne: string): Record<Separateur, number> {
  const n: Record<Separateur, number> = { ";": 0, ",": 0, "\t": 0 };
  let entreGuillemets = false;
  for (const c of ligne) {
    if (c === '"') entreGuillemets = !entreGuillemets;
    else if (!entreGuillemets && (c === ";" || c === "," || c === "\t")) n[c]++;
  }
  return n;
}

/** Devine le séparateur sur les premières lignes : celui qui revient le plus. À égalité, le point-virgule (usage français). */
export function detecterSeparateur(texte: string): Separateur {
  const total: Record<Separateur, number> = { ";": 0, ",": 0, "\t": 0 };
  const lignes = texte.split(/\r\n|\n|\r/).filter((l) => l.trim() !== "").slice(0, 10);
  for (const l of lignes) {
    const n = compterSeparateurs(l);
    for (const s of Object.keys(total) as Separateur[]) total[s] += n[s];
  }
  let meilleur: Separateur = ";";
  for (const s of [",", "\t"] as const) if (total[s] > total[meilleur]) meilleur = s;
  return meilleur;
}

/** Analyse un CSV (guillemets, guillemets doublés, retours à la ligne dans une cellule). Renvoie les lignes de cellules. */
export function parserCsv(texte: string, separateur: Separateur = detecterSeparateur(texte)): string[][] {
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let cellule = "";
  let entreGuillemets = false;
  let cellulePresente = false;

  const finCellule = () => {
    ligne.push(cellule);
    cellule = "";
    cellulePresente = false;
  };
  const finLigne = () => {
    finCellule();
    lignes.push(ligne);
    ligne = [];
  };

  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (entreGuillemets) {
      if (c === '"') {
        if (texte[i + 1] === '"') {
          cellule += '"';
          i++;
        } else entreGuillemets = false;
      } else cellule += c;
    } else if (c === '"' && cellule === "") {
      entreGuillemets = true;
      cellulePresente = true;
    } else if (c === separateur) {
      finCellule();
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texte[i + 1] === "\n") i++;
      finLigne();
    } else {
      cellule += c;
      cellulePresente = true;
    }
  }
  if (cellulePresente || cellule !== "" || ligne.length > 0) finLigne();
  return lignes;
}
