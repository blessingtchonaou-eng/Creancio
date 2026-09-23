import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { anonyme, seConnecter, serveurAccessible } from "./session";

// Droits sur /admin/pilote et son export, vus depuis le navigateur (voir requireAdminPlateforme, src/lib/session.ts) : ils
// n'existent même pas (404) pour qui n'est pas listé dans ADMIN_PLATEFORME_EMAILS, ou listé mais pas confirmé.
// Le chemin « admin autorisé » (contenu, filtres, export) est dans admin-pilote-contenu.test.ts.
describe("/admin/pilote : droits (HTTP)", () => {
  let demo: Awaited<ReturnType<typeof seConnecter>>;

  beforeAll(async () => {
    await serveurAccessible();
    demo = await seConnecter("demo@creancio.tg");
  });
  afterAll(() => db.$disconnect());

  it("un visiteur anonyme est renvoyé vers la connexion (page et export)", async () => {
    for (const chemin of ["/admin/pilote", "/admin/pilote?statut=SUSPECTE", "/admin/pilote/export"]) {
      const r = await anonyme(chemin);
      expect(r.status, chemin).toBe(307);
      expect(r.headers.get("location"), chemin).toContain("/connexion");
    }
  });

  it("un utilisateur connecté mais pas administrateur de la plateforme reçoit un vrai 404 (page et export)", async () => {
    for (const chemin of ["/admin/pilote", "/admin/pilote?statut=SUSPECTE", "/admin/pilote/export"]) {
      const r = await demo(chemin);
      expect(r.status, chemin).toBe(404);
      expect(r.headers.get("content-type") ?? "", chemin).not.toContain("text/csv");
    }
  });
});
