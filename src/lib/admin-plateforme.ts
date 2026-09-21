/**
 * Administration de la plateforme (l'équipe Créancio, pas les administrateurs d'une PME) : réservée aux adresses listées
 * dans ADMIN_PLATEFORME_EMAILS (séparées par des virgules) ET dont l'adresse e-mail est confirmée.
 * Sans confirmation, n'importe qui pourrait s'inscrire avec l'adresse d'un administrateur et obtenir l'accès.
 */
const ADRESSE = /^[^\s@,;:<>()]+@[^\s@,;:<>()]+\.[^\s@,;:<>()]{2,}$/;

export function listeAdminsPlateforme(brut: string | undefined): { adresses: string[]; invalides: string[] } {
  const adresses: string[] = [];
  const invalides: string[] = [];
  for (const entree of (brut ?? "").split(",")) {
    const e = entree.trim().toLowerCase();
    if (e === "") continue;
    (ADRESSE.test(e) ? adresses : invalides).push(e);
  }
  return { adresses, invalides };
}

export function estAdminPlateforme(email: string, emailVerifie: boolean, brut: string | undefined = process.env.ADMIN_PLATEFORME_EMAILS): boolean {
  if (!emailVerifie) return false;
  return listeAdminsPlateforme(brut).adresses.includes(email.trim().toLowerCase());
}
