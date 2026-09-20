import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { anonyme, seConnecter, serveurAccessible } from "./session";

// Isolation entre entreprises, vue depuis le navigateur : codes HTTP ET absence de fuite.
// Utilise les comptes du seed : demo@creancio.tg (entreprise de démo) et autre@creancio.tg (autre entreprise).
describe("isolation des clients entre entreprises (HTTP)", () => {
  let demo: Awaited<ReturnType<typeof seConnecter>>;
  let autre: Awaited<ReturnType<typeof seConnecter>>;
  let clientDemo: { id: string; nom: string };
  let clientAutre: { id: string; nom: string };

  beforeAll(async () => {
    await serveurAccessible();
    demo = await seConnecter("demo@creancio.tg");
    autre = await seConnecter("autre@creancio.tg");
    clientDemo = await db.client.findFirstOrThrow({ where: { entrepriseId: "demo-entreprise" }, select: { id: true, nom: true }, orderBy: { nom: "asc" } });
    clientAutre = await db.client.findFirstOrThrow({ where: { entrepriseId: "demo-autre-entreprise" }, select: { id: true, nom: true } });
  });
  afterAll(() => db.$disconnect());

  it("un visiteur anonyme est renvoyé vers la connexion", async () => {
    const r = await anonyme(`/clients/${clientDemo.id}`);
    expect(r.status).toBe(307);
    expect(r.headers.get("location")).toContain("/connexion");
  });

  it("l'utilisateur voit la fiche de son propre client (200)", async () => {
    const r = await demo(`/clients/${clientDemo.id}`);
    expect(r.status).toBe(200);
    expect(await r.text()).toContain(clientDemo.nom.replace(/'/g, "&#x27;"));
  });

  it("la fiche d'un client d'une autre entreprise renvoie un vrai 404, sans fuite", async () => {
    for (const chemin of [`/clients/${clientAutre.id}`, `/clients/${clientAutre.id}/modifier`]) {
      const r = await demo(chemin);
      expect(r.status, chemin).toBe(404);
      expect(await r.text(), chemin).not.toContain(clientAutre.nom.replace(/'/g, "&#x27;"));
    }
  });

  it("la même règle s'applique dans l'autre sens", async () => {
    expect((await autre(`/clients/${clientDemo.id}`)).status).toBe(404);
    expect((await autre(`/clients/${clientAutre.id}`)).status).toBe(200);
  });

  it("un identifiant qui n'existe pas renvoie aussi 404", async () => {
    expect((await demo("/clients/identifiant-inexistant")).status).toBe(404);
  });

  it("la liste ne contient pas les clients de l'autre entreprise", async () => {
    const html = await (await demo("/clients")).text();
    expect(html).toContain(clientDemo.nom.replace(/'/g, "&#x27;"));
    expect(html).not.toContain(clientAutre.id);
  });
});
