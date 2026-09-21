/**
 * Couleurs des e-mails. Seul endroit du projet où des valeurs hexadécimales en dur sont permises :
 * un client de messagerie ne comprend pas les variables CSS de src/app/globals.css, les styles doivent être en ligne.
 * Les valeurs reprennent les jetons Baobab du thème clair (à garder alignées avec globals.css).
 */
export const COULEURS_EMAIL = {
  fond: "#F3F2EA", // --c-bg (crème)
  carte: "#FFFFFB", // --c-surface
  texte: "#232A1B", // --c-ink
  texteDiscret: "#585C4C", // --c-ink-muted
  bordure: "#E1E0D2", // --c-border
  bouton: "#4F6B2A", // --c-primary (olive)
  texteBouton: "#FFFFFB", // --c-on-primary
} as const;
