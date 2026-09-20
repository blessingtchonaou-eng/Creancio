import { beforeAll, describe, expect, it } from "vitest";
import { anonyme, seConnecter, serveurAccessible } from "./session";

// Saisie rapide d'une facture vue depuis le navigateur : accès réservé, numéro proposé, clients de l'entreprise seulement.
describe("saisie rapide d'une facture (HTTP)", () => {
  let demo: Awaited<ReturnType<typeof seConnecter>>;
  let autre: Awaited<ReturnType<typeof seConnecter>>;

  beforeAll(async () => {
    await serveurAccessible();
    demo = await seConnecter("demo@creancio.tg");
    autre = await seConnecter("autre@creancio.tg");
  });

  it("un visiteur anonyme est renvoyé vers la connexion", async () => {
    const r = await anonyme("/factures/nouvelle");
    expect(r.status).toBe(307);
    expect(r.headers.get("location")).toContain("/connexion");
  });

  it("la page s'affiche avec le numéro suivant proposé (FA-AAAA-NNNN)", async () => {
    const r = await demo("/factures/nouvelle");
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html).toContain("Nouvelle facture");
    expect(html).toMatch(/FA-\d{4}-0130/); // le seed contient FA-2026-0129
    expect(html).toContain("Enregistrer et en ajouter une autre");
  });

  it("ISOLATION : les clients proposés sont ceux de l'entreprise, jamais ceux d'une autre", async () => {
    const html = await (await demo("/factures/nouvelle")).text();
    expect(html).toContain("Quincaillerie Agbéko");
    expect(html).not.toContain("Client de l");
    const htmlAutre = await (await autre("/factures/nouvelle")).text();
    expect(htmlAutre).toContain("Client de l");
    expect(htmlAutre).not.toContain("Quincaillerie Agbéko");
  });
});
