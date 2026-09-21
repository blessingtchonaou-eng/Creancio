import { erreursConfiguration } from "@/lib/configuration";

/**
 * Refuse de démarrer si la configuration est dangereuse : en production sans moyen d'envoyer des e-mails (personne ne
 * pourrait récupérer son mot de passe), ou avec une liste ADMIN_PLATEFORME_EMAILS mal écrite.
 * En production, le processus s'arrête (code 1) : l'hébergeur voit l'échec du déploiement au lieu d'un site qui répond 500.
 * En développement, on lève l'erreur seulement : elle s'affiche dans le navigateur et le serveur reste en vie pour la corriger.
 */
export function verifierConfiguration() {
  const problemes = erreursConfiguration(process.env);
  if (problemes.length === 0) return;
  const message = `Configuration invalide, démarrage refusé :\n- ${problemes.join("\n- ")}`;
  if (process.env.NODE_ENV === "production") {
    console.error(message);
    process.exit(1);
  }
  throw new Error(message);
}
