import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Appelle une route Better Auth (« /request-password-reset », « /reset-password »…) depuis une action serveur EN PASSANT PAR LE ROUTEUR.
 * Contrairement à auth.api.xxx(), qui appelle la fonction directement, le routeur applique la limite de débit (par adresse IP)
 * et le contrôle d'origine : une action de page ne contourne donc pas les limites de la route publique.
 */
export async function appelerRoute(chemin: string, corps: unknown): Promise<Response> {
  const entrant = await headers();
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const entetes = new Headers({ "Content-Type": "application/json", Origin: new URL(base).origin });
  for (const nom of ["x-forwarded-for", "x-real-ip", "user-agent"]) {
    const valeur = entrant.get(nom);
    if (valeur) entetes.set(nom, valeur);
  }
  return auth.handler(new Request(`${base}/api/auth${chemin}`, { method: "POST", headers: entetes, body: JSON.stringify(corps) }));
}
