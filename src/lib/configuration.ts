import { choisirPilote, type Environnement } from "./email/pilote";
import { listeAdminsPlateforme } from "./admin-plateforme";

/**
 * Contrôles de démarrage (appelés par src/instrumentation.ts). Fonction pure : renvoie la liste des problèmes, vide si tout va bien.
 * 1. E-mail : en production, un pilote réel avec sa clé et EMAIL_FROM (voir email/pilote.ts).
 * 2. ADMIN_PLATEFORME_EMAILS : si elle est renseignée, chaque entrée doit être une adresse valide. Une faute de frappe
 *    ne doit pas retirer l'accès en silence. Si elle est vide, personne n'a accès à l'administration : c'est sûr, on ne bloque pas.
 */
export function erreursConfiguration(env: Environnement): string[] {
  const problemes = [...choisirPilote(env).problemes];
  for (const invalide of listeAdminsPlateforme(env.ADMIN_PLATEFORME_EMAILS).invalides) {
    problemes.push(`ADMIN_PLATEFORME_EMAILS : « ${invalide} » n'est pas une adresse e-mail valide.`);
  }
  return problemes;
}
