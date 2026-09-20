// (BASE_URL est déjà utilisé par Vitest pour autre chose)
export const BASE_URL = process.env.CREANCIO_URL ?? "http://localhost:3000";
const MOT_DE_PASSE = process.env.DEMO_PASSWORD ?? "creancio-demo-2026";

export async function serveurAccessible() {
  try {
    await fetch(`${BASE_URL}/connexion`, { redirect: "manual" });
  } catch {
    throw new Error(`Le serveur ne répond pas sur ${BASE_URL}. Lancez « npm run dev » (et « docker compose up -d »), puis relancez.`);
  }
}

/** Ouvre une session avec un compte de démonstration et renvoie un fetch qui l'utilise. */
export async function seConnecter(email: string) {
  const r = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE_URL },
    body: JSON.stringify({ email, password: MOT_DE_PASSE }),
  });
  if (r.status !== 200) throw new Error(`Connexion impossible pour ${email} (code ${r.status}). Le seed a-t-il été exécuté ?`);
  const cookie = r.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  return (chemin: string) => fetch(`${BASE_URL}${chemin}`, { headers: { Cookie: cookie }, redirect: "manual" });
}

export async function anonyme(chemin: string) {
  return fetch(`${BASE_URL}${chemin}`, { redirect: "manual" });
}
