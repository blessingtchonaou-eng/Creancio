const E164_TOGO = /^\+228([79]\d{7})$/;

/**
 * Lien wa.me vers un numéro togolais. Le numéro est celui enregistré (E.164, normalisé à l'écriture) et il est revérifié
 * ici avant d'entrer dans l'adresse : jamais une saisie brute. Null si le format n'est pas celui attendu (aucun lien).
 */
export function lienWhatsApp(e164: string, texte?: string): string | null {
  const m = E164_TOGO.exec(e164);
  if (!m) return null;
  const base = `https://wa.me/228${m[1]}`;
  return texte ? `${base}?text=${encodeURIComponent(texte)}` : base;
}
