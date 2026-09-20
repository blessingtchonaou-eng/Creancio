import { beforeAll, describe, expect, it } from "vitest";
import { anonyme, seConnecter, serveurAccessible } from "./session";

// Isolation entre entreprises, vue depuis le navigateur : /factures et /tableau-de-bord.
// Comptes du seed : demo@creancio.tg (entreprise de démo) et autre@creancio.tg (une seule cliente, deux factures échues).
const CLIENT_AUTRE = "Client de l&#x27;autre entreprise"; // apostrophe échappée dans le HTML
const CLIENT_DEMO = "Garage Kodjo"; // client de FA-2026-0001 (payée), dans l'entreprise de démo seulement

describe("factures et tableau de bord : isolation entre entreprises (HTTP)", () => {
  let demo: Awaited<ReturnType<typeof seConnecter>>;
  let autre: Awaited<ReturnType<typeof seConnecter>>;

  beforeAll(async () => {
    await serveurAccessible();
    demo = await seConnecter("demo@creancio.tg");
    autre = await seConnecter("autre@creancio.tg");
  });

  it("un visiteur anonyme est renvoyé vers la connexion", async () => {
    for (const chemin of ["/factures", "/tableau-de-bord"]) {
      const r = await anonyme(chemin);
      expect(r.status, chemin).toBe(307);
      expect(r.headers.get("location"), chemin).toContain("/connexion");
    }
  });

  it("la liste de l'entreprise de démo ne contient pas les factures de l'autre entreprise, quel que soit le filtre", async () => {
    for (const chemin of ["/factures", "/factures?statut=toutes", "/factures?statut=echues", "/factures?tri=desc"]) {
      const r = await demo(chemin);
      expect(r.status, chemin).toBe(200);
      expect(await r.text(), chemin).not.toContain(CLIENT_AUTRE);
    }
  });

  it("la recherche ne traverse pas les entreprises", async () => {
    const html = await (await demo("/factures?q=autre+entreprise")).text();
    expect(html).not.toContain(CLIENT_AUTRE);
    expect(html).toContain("Aucune facture pour");
    // Chez l'autre entreprise, les mêmes numéros (FA-2026-0001) donnent SES factures, pas celles de la démo
    const chezAutre = await (await autre("/factures?q=FA-2026-0001")).text();
    expect(chezAutre).toContain(CLIENT_AUTRE);
    expect(chezAutre).not.toContain(CLIENT_DEMO);
  });

  it("le tableau de bord ne mélange pas les entreprises", async () => {
    const chezDemo = await (await demo("/tableau-de-bord")).text();
    expect(chezDemo).not.toContain(CLIENT_AUTRE);
    const chezAutre = await autre("/tableau-de-bord");
    expect(chezAutre.status).toBe(200);
    const html = await chezAutre.text();
    expect(html).toContain(CLIENT_AUTRE);
    expect(html).not.toContain("Quincaillerie");
  });

  it("une recherche trouve une facture payée alors que « À encaisser » est le filtre par défaut, et le dit", async () => {
    const sansRecherche = await (await demo("/factures")).text();
    expect(sansRecherche).not.toContain("FA-2026-0001"); // payée : hors de « À encaisser »
    const html = await (await demo("/factures?q=FA-2026-0001")).text();
    expect(html).toContain("FA-2026-0001");
    expect(html).toContain(CLIENT_DEMO);
    expect(html).toContain("Recherche dans toutes vos factures");
  });
});
