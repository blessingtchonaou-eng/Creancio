export type ResultatDate = { ok: true; iso: string } | { ok: false; error: string };

const err = (error: string): ResultatDate => ({ ok: false, error });

const ANNEE_MIN = 2000;
const ANNEE_MAX = 2100;

const deux = (n: number) => String(n).padStart(2, "0");

function construire(jour: number, mois: number, annee: number): ResultatDate {
  if (annee < ANNEE_MIN || annee > ANNEE_MAX) return err("Vérifiez l'année de cette date.");
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  if (d.getUTCFullYear() !== annee || d.getUTCMonth() !== mois - 1 || d.getUTCDate() !== jour) return err("Cette date n'existe pas.");
  return { ok: true, iso: `${annee}-${deux(mois)}-${deux(jour)}` };
}

/** Heure éventuelle à la fin (« 25/10/2026 00:00:00 ») : ignorée, seule la date compte. */
const HEURE = String.raw`(?:[ T]\d{1,2}:\d{2}(?::\d{2}(?:\.\d+)?)?Z?)?`;
const JJ_MM_AAAA = new RegExp(String.raw`^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})${HEURE}$`);
const JJ_MM_AA = /^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2}$/;
const AAAA_MM_JJ = new RegExp(String.raw`^(\d{4})-(\d{1,2})-(\d{1,2})${HEURE}$`);

/**
 * Lit une date d'échéance : JJ/MM/AAAA ou JJ-MM-AAAA (jour d'abord, toujours), ou AAAA-MM-JJ.
 * Une date inexistante (31/02), à année sur 2 chiffres ou illisible est une erreur : on ne devine jamais.
 * Renvoie « AAAA-MM-JJ ».
 */
export function parserDate(brut: string): ResultatDate {
  const s = brut.normalize("NFKC").trim();
  if (s === "") return err("Saisissez la date d'échéance.");

  let m = JJ_MM_AAAA.exec(s);
  if (m) return construire(Number(m[1]), Number(m[2]), Number(m[3]));
  m = AAAA_MM_JJ.exec(s);
  if (m) return construire(Number(m[3]), Number(m[2]), Number(m[1]));
  if (JJ_MM_AA.test(s)) return err("Écrivez l'année sur 4 chiffres, par exemple 25/10/2026.");
  return err("Date illisible. Écrivez-la ainsi : 25/10/2026.");
}

/** « 2026-10-25 » → « 25/10/2026 » : la forme que l'aperçu affiche et que parserDate relit. */
export function isoVersJourMoisAnnee(iso: string): string {
  const [a, m, j] = iso.split("-");
  return `${j}/${m}/${a}`;
}

/** Cellule date d'Excel (lue à minuit UTC) → « 25/10/2026 ». */
export function dateExcelVersTexte(date: Date): string {
  if (Number.isNaN(date.getTime())) return "";
  return `${deux(date.getUTCDate())}/${deux(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

/**
 * Numéro de série Excel (jours depuis le 30/12/1899) → « 25/10/2026 ».
 * Hors des années 2000 à 2100, le nombre est probablement autre chose qu'une date : il est renvoyé tel quel
 * et sera signalé comme illisible.
 */
export function serieExcelVersTexte(serie: number): string {
  if (!Number.isFinite(serie)) return String(serie);
  const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(serie) * 86_400_000);
  const annee = date.getUTCFullYear();
  return annee >= ANNEE_MIN && annee <= ANNEE_MAX ? dateExcelVersTexte(date) : String(serie);
}
