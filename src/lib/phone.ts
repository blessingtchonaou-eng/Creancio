export type PhoneResult = { ok: true; e164: string } | { ok: false; error: string };

const NATIONAL = /^[79]\d{7}$/;

/**
 * Normalise un numéro togolais au format E.164 (+228XXXXXXXX).
 * Accepte « 90123456 », « 90 12 34 56 », « +228 90 12 34 56 », « 0022890123456 » et « 228 90123456 ».
 * Un numéro togolais a 8 chiffres et commence par 7 ou 9.
 */
export function normalizeTogoPhone(input: string): PhoneResult {
  const raw = input.trim();
  if (!raw) return { ok: false, error: "Saisissez un numéro de téléphone." };
  if (/[^\d\s.\-()+]/.test(raw)) return { ok: false, error: "Le numéro ne doit contenir que des chiffres." };

  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.includes("+") && !digits.startsWith("+")) return { ok: false, error: "Le signe + se place au début du numéro." };
  digits = digits.replace(/^\+/, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("228") && digits.length === 11) digits = digits.slice(3);

  if (digits.length !== 8) return { ok: false, error: "Un numéro togolais a 8 chiffres, par exemple 90 12 34 56." };
  if (!NATIONAL.test(digits)) return { ok: false, error: "Un numéro togolais commence par 7 ou 9." };
  return { ok: true, e164: `+228${digits}` };
}

/** +22890123456 → « 90 12 34 56 » (pour un champ de saisie qui affiche déjà le préfixe +228) */
export function nationalTogoPhone(e164: string): string {
  return formatTogoPhone(e164).replace(/^\+228 /, "");
}

/** +22890123456 → « +228 90 12 34 56 » */
export function formatTogoPhone(e164: string): string {
  const m = /^\+228(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(e164);
  return m ? `+228 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : e164;
}
