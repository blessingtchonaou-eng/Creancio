import { beforeAll, describe, expect, it } from "vitest";
import { analyserLignes } from "@/lib/import/analyse";
import { lireFichier } from "@/lib/import/lecture";
import { anonyme, seConnecter, serveurAccessible } from "./session";

// Écran d'import vu depuis le navigateur : accès réservé, modèle téléchargeable et relisible par l'import lui-même.
describe("import de factures (HTTP)", () => {
  let demo: Awaited<ReturnType<typeof seConnecter>>;

  beforeAll(async () => {
    await serveurAccessible();
    demo = await seConnecter("demo@creancio.tg");
  });

  it("un visiteur anonyme est renvoyé vers la connexion, page comme modèle", async () => {
    for (const chemin of ["/factures/import", "/factures/import/modele"]) {
      const r = await anonyme(chemin);
      expect(r.status, chemin).toBe(307);
      expect(r.headers.get("location"), chemin).toContain("/connexion");
    }
  });

  it("la page s'affiche pour un utilisateur connecté", async () => {
    const r = await demo("/factures/import");
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html).toContain("Déposez votre fichier ici");
    expect(html).toContain("/factures/import/modele");
  });

  it("le modèle se télécharge en .xlsx et l'import sait le relire", async () => {
    const r = await demo("/factures/import/modele");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("spreadsheetml");
    expect(r.headers.get("content-disposition")).toContain("modele-import-factures.xlsx");

    const lecture = await lireFichier("modele.xlsx", new Uint8Array(await r.arrayBuffer()));
    expect(lecture.colonnesIgnorees).toEqual([]);
    expect(lecture.lignes).toHaveLength(2);
    const { comptes } = analyserLignes(lecture.lignes, { clients: [], numerosExistants: new Set() });
    expect(comptes).toEqual({ pretes: 2, aCorriger: 0, dejaImportees: 0 });
  });
});
