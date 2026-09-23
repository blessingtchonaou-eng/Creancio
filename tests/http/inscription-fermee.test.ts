import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { BASE_URL, serveurAccessible } from "./session";

// Inscription publique fermée pendant le pilote (INSCRIPTIONS_OUVERTES non renseignée dans .env : fermée par défaut).
// Un appel DIRECT à la route Better Auth doit être refusé (hooks.before de src/lib/auth.ts), même avec des champs valides :
// seule l'action serveur inscription() (qui vérifie elle-même un jeton d'invitation) peut créer un compte.
const ipAleatoire = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
const EMAIL = `test-inscription-fermee-${randomBytes(4).toString("hex")}@example.com`;

function signUpDirect(email: string) {
  return fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE_URL, "x-forwarded-for": ipAleatoire() },
    body: JSON.stringify({ name: "Test Fermeture", email, password: "creancio-test-2026" }),
  });
}

describe("inscription fermée : appel direct à la route (HTTP)", () => {
  beforeAll(async () => {
    await serveurAccessible();
    await db.utilisateur.deleteMany({ where: { email: EMAIL } });
  });
  afterAll(async () => {
    await db.utilisateur.deleteMany({ where: { email: EMAIL } });
    await db.$disconnect();
  });

  it("refuse l'appel direct à /api/auth/sign-up/email, aucun compte n'est créé", async () => {
    const r = await signUpDirect(EMAIL);
    expect(r.status, await r.text().catch(() => "")).toBeGreaterThanOrEqual(400);
    expect(await db.utilisateur.findUnique({ where: { email: EMAIL } })).toBeNull();
  });
});
