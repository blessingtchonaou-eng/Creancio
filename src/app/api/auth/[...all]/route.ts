import { auth } from "@/lib/auth";

// Gestionnaire Better Auth : inscription, connexion, déconnexion, session.
export function GET(request: Request) {
  return auth.handler(request);
}

export function POST(request: Request) {
  return auth.handler(request);
}
