import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Contrôle « optimiste » : présence du cookie de session, sans accès à la base. Il évite d'afficher une page
// protégée à un visiteur anonyme. Le vrai contrôle (session valide, entreprise, rôle) est fait par
// requireEntreprise() dans chaque page et chaque action. On ne renvoie jamais un visiteur connecté loin de
// /connexion ici : un cookie périmé provoquerait une boucle de redirections. Les pages /connexion et
// /inscription le font elles-mêmes, après lecture de la vraie session.
const PUBLIC_PREFIXES = ["/connexion", "/inscription", "/api/auth"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!isPublic && !getSessionCookie(request)) {
    const url = new URL("/connexion", request.url);
    if (pathname !== "/") url.searchParams.set("suite", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Tout sauf les fichiers statiques, les images, la manifest et les icônes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|ico|js)$).*)"],
};
