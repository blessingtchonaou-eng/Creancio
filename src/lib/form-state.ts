/** État renvoyé par une Server Action de formulaire (useActionState). */
export interface FormState {
  /** Erreur générale, affichée au-dessus du bouton. */
  error?: string;
  /** Erreur par champ, indexée par le nom du champ. */
  fieldErrors?: Record<string, string>;
  /** Valeurs saisies, pour ne pas vider le formulaire après une erreur. */
  values?: Record<string, string>;
  /** Message de réussite (quand l'écran reste affiché). */
  success?: string;
  /** Numéro déjà utilisé par d'autres clients : l'utilisateur doit confirmer ou ouvrir la fiche existante. */
  doublon?: { whatsapp: string; clients: { id: string; nom: string }[] };
  /** Lien d'inscription pilote nouvellement créé : affiché une seule fois, jamais renvoyé après un rechargement. */
  invitationCreee?: { url: string; expireLe: string };
}

/** Transforme les erreurs zod en erreurs par champ (la première erreur de chaque champ). */
export function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !(key in out)) out[key] = issue.message;
  }
  return out;
}

/** Valeurs textuelles d'un FormData, sans les fichiers. */
export function stringValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") out[k] = v;
  return out;
}
