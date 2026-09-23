import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { anonyme, seConnecter, serveurAccessible } from "./session";

// Page d'accueil publique et pages légales provisoires.
describe("page d'accueil publique (HTTP)", () => {
  beforeAll(async () => {
    await serveurAccessible();
  });
  afterAll(() => db.$disconnect());

  it("« / » s'ouvre sans connexion : accroche, sections, formulaire pilote avec son jeton et sa case de consentement", async () => {
    const r = await anonyme("/");
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html).toContain("Faites-vous payer,");
    for (const id of ["comment-ca-marche", "fonctionnalites", "securite", "questions", "pilote"]) expect(html, id).toContain(`id="${id}"`);
    for (const champ of ["nomEntreprise", "whatsapp", "facturesParMois", "consentement", "jeton", "site_web"]) expect(html, champ).toContain(`name="${champ}"`);
    expect(html).toMatch(/name="jeton" value="\d{13}\.[0-9a-f]{32}"/);
    expect(html).toContain("J&#x27;accepte d&#x27;être contacté sur ce numéro au sujet du pilote Créancio.");
    expect(html).toContain("Se connecter");
    expect(html).not.toContain("Mon espace");
  });

  it("aucun texte provisoire ni nom de commerce réel de la maquette ; le numéro de contact est un lien WhatsApp dans le pied de page", async () => {
    const html = await (await anonyme("/")).text();
    expect(html).toContain("Lomé, Togo");
    // Numéro affiché lisible, lien wa.me en chiffres seuls avec le message prérempli, ouvert dans un nouvel onglet.
    const lien = html.match(/<a [^>]*href="https:\/\/wa\.me\/[^"]*"[^>]*>([^<]*)<\/a>/);
    expect(lien, "lien WhatsApp du pied de page").not.toBeNull();
    expect(lien![1]).toBe("+228 71 45 39 42");
    expect(lien![0]).toContain(`href="https://wa.me/22871453942?text=${encodeURIComponent("Bonjour, je vous contacte au sujet de Créancio")}"`);
    expect(lien![0]).toContain('target="_blank"');
    expect(lien![0]).toContain('rel="noopener noreferrer"');
    expect(lien![0]).toContain("min-h-11"); // zone tactile de 44 px
    for (const interdit of ["[VOTRE", "[VOS TARIFS", "Pharmacie du Port", "Cocotiers", "Kodjo", "Agbéko", "2019-014"]) expect(html, interdit).not.toContain(interdit);
  });

  it("visiteur connecté : « Mon espace » à la place de « Se connecter », sans redirection", async () => {
    const demo = await seConnecter("demo@creancio.tg");
    const r = await demo("/");
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html).toContain("Mon espace");
    expect(html).toContain('href="/tableau-de-bord"');
  });

  it("pages légales provisoires : publiques, avec le bandeau « à compléter »", async () => {
    for (const chemin of ["/confidentialite", "/conditions"]) {
      const r = await anonyme(chemin);
      expect(r.status, chemin).toBe(200);
      expect(await r.text(), chemin).toContain("À compléter avant la mise en ligne.");
    }
  });

  it("le reste de l'application reste protégé", async () => {
    const r = await anonyme("/tableau-de-bord");
    expect(r.status).toBe(307);
    expect(r.headers.get("location")).toContain("/connexion");
  });
});
