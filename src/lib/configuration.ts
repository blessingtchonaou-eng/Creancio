import { choisirPilote, type Environnement } from "./email/pilote";
import { listeAdminsPlateforme } from "./admin-plateforme";
import { configIp } from "./ip-client";

/**
 * Contrôles de démarrage (appelés par src/instrumentation.ts). Fonction pure : renvoie la liste des problèmes, vide si tout va bien.
 * 1. E-mail : en production, un pilote réel avec sa clé et EMAIL_FROM (voir email/pilote.ts).
 * 2. Adresse IP du visiteur : en production, CLIENT_IP_HEADER et TRUSTED_PROXY_COUNT (voir ip-client.ts). Sans elles, la limite de
 *    débit ne saurait pas distinguer les visiteurs.
 * 3. ADMIN_PLATEFORME_EMAILS : si elle est renseignée, chaque entrée doit être une adresse valide. Une faute de frappe
 *    ne doit pas retirer l'accès en silence. Si elle est vide, personne n'a accès à l'administration : c'est sûr, on ne bloque pas.
 */
export function erreursConfiguration(env: Environnement): string[] {
  const problemes = [...choisirPilote(env).problemes, ...configIp(env).problemes];
  for (const invalide of listeAdminsPlateforme(env.ADMIN_PLATEFORME_EMAILS).invalides) {
    problemes.push(`ADMIN_PLATEFORME_EMAILS : « ${invalide} » n'est pas une adresse e-mail valide.`);
  }
  return problemes;
}
