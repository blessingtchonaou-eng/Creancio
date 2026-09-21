/**
 * Exécuté une fois au démarrage du serveur. Le contrôle vit dans instrumentation-node.ts, chargé seulement côté Node :
 * il utilise process.exit, qui n'existe pas dans le runtime Edge.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { verifierConfiguration } = await import("./instrumentation-node");
  verifierConfiguration();
}
