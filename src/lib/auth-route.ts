import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ENTETE_IP_INTERNE, lireIpClient } from "@/lib/ip-client";

/**
 * Appelle une route Better Auth (« /request-password-reset », « /reset-password »…) depuis une action serveur EN PASSANT PAR LE ROUTEUR.
 * Contrairement à auth.api.xxx(), qui appelle la fonction directement, le routeur applique la limite de débit (par adresse IP)
 * et le contrôle d'origine : une action de page ne contourne donc pas les limites de la route publique.
 */
export async function appelerRoute(chemin: string, corps: unknown): Promise<Response> {
  const entrant = await headers();
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const entetes = new Headers({ "Content-Type": "application/json", Origin: new URL(base).origin });
  const ua = entrant.get("user-agent");
  if (ua) entetes.set("user-agent", ua);
  const ip = lireIpClient(entrant);
  if (ip) entetes.set(ENTETE_IP_INTERNE, ip);
  return auth.handler(new Request(`${base}/api/auth${chemin}`, { method: "POST", headers: entetes, body: JSON.stringify(corps) }));
}
