/**
 * Inscription publique fermée pendant la phase pilote : sans variable (ou toute valeur autre que "true"),
 * seule un lien d'invitation (src/lib/invitation-pilote.ts) permet de créer un compte. À repasser à "true" à
 * la fin du pilote (voir TODO-PRODUCTION.md).
 */
export function inscriptionsOuvertes(): boolean {
  return process.env.INSCRIPTIONS_OUVERTES === "true";
}
