import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { anonyme, seConnecter, serveurAccessible } from "./session";

// Droits sur /admin/pilote, vus depuis le navigateur (voir requireAdminPlateforme, src/lib/session.ts) : la page n'existe
// même pas (404) pour qui n'est pas listé dans ADMIN_PLATEFORME_EMAILS, listé mais pas confirmé. Aucun compte du seed n'est
// admin plateforme dans cet environnement (ADMIN_PLATEFORME_EMAILS n'y est pas configurée) : le chemin « admin autorisé »
// est couvert par src/lib/invitation-pilote.test.ts (logique) plutôt qu'ici (accès complet, cookie réel).
describe("/admin/pilote : droits (HTTP)", () => {
  let demo: Awaited<ReturnType<typeof seConnecter>>;

  beforeAll(async () => {
    await serveurAccessible();
    demo = await seConnecter("demo@creancio.tg");
  });
  afterAll(() => db.$disconnect());

  it("un visiteur anonyme est renvoyé vers la connexion", async () => {
    const r = await anonyme("/admin/pilote");
    expect(r.status).toBe(307);
    expect(r.headers.get("location")).toContain("/connexion");
  });

  it("un utilisateur connecté mais pas administrateur de la plateforme reçoit un vrai 404", async () => {
    const r = await demo("/admin/pilote");
    expect(r.status).toBe(404);
  });
});
