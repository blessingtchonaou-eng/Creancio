import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
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
  afterAll(() => db.$disconnect());

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

  describe("fiche d'une facture (/factures/[id])", () => {
    let factureDemo: { id: string; numero: string };
    let factureAutre: { id: string; numero: string };

    beforeAll(async () => {
      factureDemo = await db.facture.findFirstOrThrow({ where: { entrepriseId: "demo-entreprise", numero: "FA-2026-0007" }, select: { id: true, numero: true } });
      // Même numéro que chez la démo pour les autres factures du seed : on prend celle-ci, propre à l'autre entreprise par son client
      factureAutre = await db.facture.findFirstOrThrow({ where: { entrepriseId: "demo-autre-entreprise", numero: "FA-2026-0002" }, select: { id: true, numero: true } });
    });

    it("un visiteur anonyme est renvoyé vers la connexion", async () => {
      for (const chemin of [`/factures/${factureDemo.id}`, `/factures/${factureDemo.id}/modifier`, `/factures/${factureDemo.id}/paiement`]) {
        const r = await anonyme(chemin);
        expect(r.status, chemin).toBe(307);
        expect(r.headers.get("location"), chemin).toContain("/connexion");
      }
    });

    it("l'utilisateur voit la fiche de sa propre facture (200), avec son client", async () => {
      const r = await demo(`/factures/${factureDemo.id}`);
      expect(r.status).toBe(200);
      const html = await r.text();
      expect(html).toContain(factureDemo.numero);
      expect(html).toContain("Quincaillerie");
    });

    it("la fiche, la modification et le paiement d'une facture d'une autre entreprise renvoient un vrai 404, sans fuite", async () => {
      for (const chemin of [`/factures/${factureAutre.id}`, `/factures/${factureAutre.id}/modifier`, `/factures/${factureAutre.id}/paiement`]) {
        const r = await demo(chemin);
        expect(r.status, chemin).toBe(404);
        const html = await r.text();
        expect(html, chemin).not.toContain(CLIENT_AUTRE);      }
    });

    it("la même règle s'applique dans l'autre sens", async () => {
      expect((await autre(`/factures/${factureDemo.id}`)).status).toBe(404);
      expect((await autre(`/factures/${factureDemo.id}/paiement`)).status).toBe(404);
      const r = await autre(`/factures/${factureAutre.id}`);
      expect(r.status).toBe(200);
      expect(await r.text()).toContain(CLIENT_AUTRE);
    });

    it("un identifiant qui n'existe pas renvoie aussi 404", async () => {
      for (const chemin of ["/factures/identifiant-inexistant", "/factures/identifiant-inexistant/modifier", "/factures/identifiant-inexistant/paiement"]) {
        expect((await demo(chemin)).status, chemin).toBe(404);
      }
    });

    it("les listes renvoient vers la fiche de chaque facture", async () => {
      const html = await (await demo("/factures")).text();
      expect(html).toContain(`href="/factures/${factureDemo.id}"`);
      expect(html).not.toContain(factureAutre.id);
      expect(await (await demo("/tableau-de-bord")).text()).toContain(`href="/factures/${factureDemo.id}"`);
    });
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
