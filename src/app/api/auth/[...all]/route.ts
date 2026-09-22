import { auth } from "@/lib/auth";
import { avecIpDeConfiance } from "@/lib/ip-client";

// L'adresse IP du visiteur est recalculée par le serveur (CLIENT_IP_HEADER, TRUSTED_PROXY_COUNT) et transmise dans un en-tête
// interne : celui que le visiteur enverrait est supprimé.
// (Requête recréée de zéro : new Request(requeteNext, …) échoue, la requête de Next n'est pas une Request ordinaire.)
async function avecIp(request: Request): Promise<Request> {
  const sansCorps = request.method === "GET" || request.method === "HEAD";
  return new Request(request.url, {
    method: request.method,
    headers: avecIpDeConfiance(request.headers),
    body: sansCorps ? undefined : await request.arrayBuffer(),
  });
}

// Gestionnaire Better Auth : inscription, connexion, déconnexion, session.
export async function GET(request: Request) {
  return auth.handler(await avecIp(request));
}

export async function POST(request: Request) {
  return auth.handler(await avecIp(request));
}
