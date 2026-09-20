export type ResultatMontant = { ok: true; valeur: number } | { ok: false; error: string };

const MAX_INT = 2_147_483_647; // limite de la colonne Int de PostgreSQL

const err = (error: string): ResultatMontant => ({ ok: false, error });

/**
 * Lit un montant en FCFA tel qu'on le trouve dans un fichier :
 * « 1250000 », « 1 250 000 », « 1 250 000 FCFA », « 1.250.000 ».
 * Refuse les centimes, les montants négatifs, nuls ou illisibles : jamais de valeur devinée.
 */
export function parserMontant(brut: string): ResultatMontant {
  // NFKC transforme les espaces insécables (dont l'espace fine des exports Excel) en espaces simples.
  let s = brut.normalize("NFKC").trim();
  if (s === "") return err("Saisissez le montant.");

  s = s.replace(/\s*(?:f\s*cfa|cfa|xof|f)\s*$/i, "").trim();
  if (/^[-−–(]/.test(s)) return err("Le montant ne peut pas être négatif.");
  s = s.replace(/\s+/g, "");

  let entier: string;
  if (/^\d+$/.test(s)) {
    entier = s;
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    entier = s.replaceAll(".", ""); // 1.250.000 : le point sépare les milliers
  } else if (/^\d{1,3}(,\d{3})+$/.test(s)) {
    entier = s.replaceAll(",", ""); // 1,250,000
  } else {
    // Partie décimale : acceptée seulement si elle ne change pas la valeur (« 1250000,00 »).
    const m = /^(\d{1,3}(?:\.\d{3})+|\d{1,3}(?:,\d{3})+|\d+)[.,](\d+)$/.exec(s);
    if (!m) return err("Montant illisible. Écrivez des chiffres, par exemple 1 250 000.");
    if (/[1-9]/.test(m[2])) return err("Le montant doit être un nombre entier de FCFA, sans centimes.");
    entier = m[1].replace(/[.,]/g, "");
  }

  const valeur = Number(entier);
  if (valeur === 0) return err("Le montant doit être supérieur à 0.");
  if (!Number.isSafeInteger(valeur) || valeur > MAX_INT) return err("Ce montant est trop grand.");
  return { ok: true, valeur };
}
