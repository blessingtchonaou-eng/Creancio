import ExcelJS from "exceljs";
import { COLONNES_OBLIGATOIRES, LIBELLE_COLONNE, reconnaitreColonne, type Colonne } from "./colonnes";
import { decoderTexte, parserCsv } from "./csv";
import { dateExcelVersTexte, serieExcelVersTexte } from "./date";
import { ErreurImport, LIGNES_MAX, TAILLE_FICHIER_MAX, type Lecture, type LigneBrute } from "./types";
import { verifierArchiveZip } from "./zip-guard";

type Cellule = string | number | boolean | Date | null;
interface LigneGrille {
  ligne: number; // numéro de ligne dans le fichier
  cellules: Cellule[];
}

const LIGNES_A_CHERCHER_ENTETES = 20;

function simplifier(v: ExcelJS.CellValue | undefined): Cellule {
  if (v === null || v === undefined) return null;
  if (v instanceof Date || typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  if ("result" in v) return simplifier(v.result as ExcelJS.CellValue); // formule : on lit son résultat
  if ("richText" in v) return v.richText.map((r) => r.text).join("");
  if ("text" in v) return String(v.text); // lien hypertexte
  if ("error" in v) return String(v.error);
  return null;
}

function versTexte(cellule: Cellule | undefined, colonne: Colonne | null): string {
  if (cellule === null || cellule === undefined) return "";
  if (cellule instanceof Date) return dateExcelVersTexte(cellule);
  if (typeof cellule === "number") return colonne === "echeance" ? serieExcelVersTexte(cellule) : String(cellule);
  if (typeof cellule === "boolean") return cellule ? "VRAI" : "FAUX";
  return cellule.trim();
}

const estVide = (c: Cellule | undefined) => c === null || c === undefined || (typeof c === "string" && c.trim() === "");

interface Entetes {
  indexLigne: number;
  colonnes: Map<number, Colonne>;
  ignorees: string[];
  avertissements: string[];
}

/** Cherche la ligne d'en-têtes dans les premières lignes (des titres ou des lignes vides peuvent la précéder). */
function trouverEntetes(grille: LigneGrille[]): Entetes | { erreur: string } {
  let meilleur: (Entetes & { score: number }) | null = null;
  for (let i = 0; i < Math.min(grille.length, LIGNES_A_CHERCHER_ENTETES); i++) {
    const colonnes = new Map<number, Colonne>();
    const deja = new Set<Colonne>();
    const ignorees: string[] = [];
    const avertissements: string[] = [];
    grille[i].cellules.forEach((c, index) => {
      const texte = versTexte(c, null);
      if (texte === "") return;
      const colonne = reconnaitreColonne(texte);
      if (!colonne) ignorees.push(texte);
      else if (deja.has(colonne)) avertissements.push(`Deux colonnes ressemblent à « ${LIBELLE_COLONNE[colonne]} » : seule la première est lue (« ${texte} » est ignorée).`);
      else {
        deja.add(colonne);
        colonnes.set(index, colonne);
      }
    });
    if (deja.size >= 2 && (!meilleur || deja.size > meilleur.score)) meilleur = { indexLigne: i, colonnes, ignorees, avertissements, score: deja.size };
  }
  if (!meilleur) {
    return {
      erreur: `Je ne trouve pas la ligne des titres de colonnes. Le fichier doit contenir : ${COLONNES_OBLIGATOIRES.map((c) => LIBELLE_COLONNE[c]).join(", ")}. Téléchargez le modèle pour partir d'un fichier prêt.`,
    };
  }
  const trouvees = new Set(meilleur.colonnes.values());
  const manquantes = COLONNES_OBLIGATOIRES.filter((c) => !trouvees.has(c));
  if (manquantes.length > 0) {
    const noms = manquantes.map((c) => `« ${LIBELLE_COLONNE[c]} »`).join(", ");
    const pluriel = manquantes.length > 1;
    return { erreur: `Il manque ${pluriel ? "les colonnes" : "la colonne"} ${noms}. Renommez-${pluriel ? "les" : "la"} dans votre fichier ou téléchargez le modèle.` };
  }
  return meilleur;
}

function extraireLignes(grille: LigneGrille[]): Lecture | { erreur: string } {
  const entetes = trouverEntetes(grille);
  if ("erreur" in entetes) return entetes;

  const lignes: LigneBrute[] = [];
  for (const { ligne, cellules } of grille.slice(entetes.indexLigne + 1)) {
    if (cellules.every(estVide)) continue; // ligne entièrement vide : ignorée
    const brute: LigneBrute = { ligne, numero: "", client: "", telephone: "", montant: "", echeance: "", email: "" };
    for (const [index, colonne] of entetes.colonnes) brute[colonne] = versTexte(cellules[index], colonne);
    lignes.push(brute);
    if (lignes.length > LIGNES_MAX) throw new ErreurImport(`Ce fichier contient plus de ${LIGNES_MAX.toLocaleString("fr-FR")} lignes. Divisez-le en plusieurs fichiers.`);
  }
  if (lignes.length === 0) return { erreur: "Ce fichier ne contient aucune facture sous les titres de colonnes." };
  return { lignes, colonnesIgnorees: entetes.ignorees, avertissements: entetes.avertissements };
}

async function grillesXlsx(octets: Uint8Array): Promise<{ nom: string; grille: LigneGrille[] }[]> {
  if (octets.byteLength < 2 || octets[0] !== 0x50 || octets[1] !== 0x4b) {
    throw new ErreurImport("Ce fichier n'est pas un vrai fichier .xlsx. Enregistrez-le depuis Excel au format « Classeur Excel (.xlsx) ».");
  }
  const zip = verifierArchiveZip(octets);
  if (!zip.ok) throw new ErreurImport(zip.error);

  const classeur = new ExcelJS.Workbook();
  try {
    await classeur.xlsx.load(Buffer.from(octets) as unknown as ExcelJS.Buffer);
  } catch {
    throw new ErreurImport("Ce fichier .xlsx est illisible. Réenregistrez-le depuis Excel puis réessayez.");
  }
  return classeur.worksheets.map((feuille) => {
    const grille: LigneGrille[] = [];
    feuille.eachRow({ includeEmpty: false }, (row, numero) => {
      const cellules: Cellule[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colonne) => {
        cellules[colonne - 1] = simplifier(cell.value);
      });
      grille.push({ ligne: numero, cellules: Array.from(cellules, (c) => c ?? null) });
    });
    return { nom: feuille.name, grille };
  });
}

/**
 * Lit un fichier .xlsx ou .csv de factures. Détecte la ligne des titres, reconnaît les colonnes quel que soit
 * leur ordre ou leur écriture, ignore les lignes vides. Lève ErreurImport (message à afficher) si le fichier est inutilisable.
 */
export async function lireFichier(nom: string, octets: Uint8Array): Promise<Lecture> {
  if (octets.byteLength === 0) throw new ErreurImport("Ce fichier est vide.");
  if (octets.byteLength > TAILLE_FICHIER_MAX) throw new ErreurImport("Ce fichier dépasse 2 Mo. Divisez-le en plusieurs fichiers.");

  const extension = nom.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  if (extension === "xls") {
    throw new ErreurImport("Le format .xls est trop ancien. Enregistrez le fichier au format .xlsx (Fichier > Enregistrer sous) puis réessayez.");
  }

  if (extension === "csv") {
    if (octets.includes(0)) throw new ErreurImport("Ce fichier n'est pas un vrai fichier CSV. Enregistrez-le depuis Excel au format « CSV ».");
    const lignes = parserCsv(decoderTexte(octets));
    const resultat = extraireLignes(lignes.map((cellules, i) => ({ ligne: i + 1, cellules })));
    if ("erreur" in resultat) throw new ErreurImport(resultat.erreur);
    return resultat;
  }
  if (extension !== "xlsx") throw new ErreurImport("Choisissez un fichier Excel (.xlsx) ou un fichier CSV (.csv).");

  const feuilles = await grillesXlsx(octets);
  let premiereErreur: string | null = null;
  for (const { nom: feuille, grille } of feuilles) {
    if (grille.length === 0) continue;
    const resultat = extraireLignes(grille);
    if (!("erreur" in resultat)) return { ...resultat, feuille };
    premiereErreur ??= resultat.erreur;
  }
  throw new ErreurImport(premiereErreur ?? "Ce fichier est vide.");
}
