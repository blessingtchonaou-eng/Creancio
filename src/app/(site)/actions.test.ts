import { randomInt } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { CONSENTEMENT_ACTUEL, landing } from "@/content/landing";
import { db } from "@/lib/db";
import { empreinte, lireCompteur, oublier } from "@/lib/limite-debit";
import { creerJetonFormulaire, SUCCES_PILOTE } from "@/lib/pilote";

// L'action réelle du formulaire pilote, avec la vraie base : seuls les en-têtes de la requête sont simulés (IP du visiteur).
// C'est ce qui prouve que limite-pilote.ts est bien branché sur le formulaire, pas seulement testé seul.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });
let ipVisiteur = "203.0.113.1";
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": ipVisiteur }) }));

let demanderPilote: typeof import("./actions").demanderPilote;
const numeros = new Set<string>();
const ips = new Set<string>();

/** Numéro togolais unique pour ce test (79 XX XX XX), enregistré pour le nettoyage. */
function nouveauNumero() {
  const national = `79${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
  numeros.add(`+228${national}`);
  return national;
}
function nouvelleIp() {
  ipVisiteur = `198.51.100.${randomInt(1, 255)}`;
  while (ips.has(ipVisiteur)) ipVisiteur = `198.51.100.${randomInt(1, 255)}`;
  ips.add(ipVisiteur);
  return ipVisiteur;
}
const cleIp = (ip: string) => `pilote:ip:${empreinte(ip)}`;
const ilYA = (ms: number) => creerJetonFormulaire(Date.now() - ms);

function envoi(champs: Partial<Record<"nomEntreprise" | "whatsapp" | "facturesParMois" | "consentement" | "jeton" | "site_web", string>>) {
  const f = new FormData();
  const complet = { nomEntreprise: "Boutique Test", consentement: "oui", jeton: ilYA(10_000), ...champs };
  for (const [k, v] of Object.entries(complet)) if (v !== undefined) f.set(k, v);
  return demanderPilote({}, f);
}
const demande = (national: string) => db.demandePilote.findUnique({ where: { whatsapp: `+228${national}` } });

beforeAll(async () => {
  ({ demanderPilote } = await import("./actions"));
});
afterEach(async () => {
  await db.demandePilote.deleteMany({ where: { whatsapp: { in: [...numeros] } } });
  for (const ip of ips) await oublier(cleIp(ip));
});
afterAll(async () => {
  await db.$disconnect();
});

describe("formulaire pilote : contrôles avant enregistrement", () => {
  it("envoi normal : demande NOUVELLE, numéro en E.164, preuve du consentement enregistrée", async () => {
    nouvelleIp();
    const n = nouveauNumero();
    expect(await envoi({ whatsapp: `${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 6)} ${n.slice(6)}`, facturesParMois: "DE_20_A_100" })).toEqual({ success: SUCCES_PILOTE });
    const d = await demande(n);
    expect(d).toMatchObject({ statut: "NOUVELLE", nomEntreprise: "Boutique Test", facturesParMois: "DE_20_A_100", consentement: true, consentementVersion: CONSENTEMENT_ACTUEL });
    expect(d?.consentementLe).toBeInstanceOf(Date);
  });

  it("champ piège rempli : même succès, rien d'enregistré, et l'envoi ne compte pas dans la limite", async () => {
    const ip = nouvelleIp();
    const n = nouveauNumero();
    expect(await envoi({ whatsapp: n, site_web: "http://spam.example" })).toEqual({ success: SUCCES_PILOTE });
    expect(await demande(n)).toBeNull();
    expect(await lireCompteur(cleIp(ip))).toBeNull();
  });

  it("erreurs de saisie : messages par champ, rien d'enregistré, l'essai ne compte pas", async () => {
    const ip = nouvelleIp();
    const r = await envoi({ nomEntreprise: "", whatsapp: "12345", consentement: undefined, facturesParMois: "BEAUCOUP" });
    expect(r.fieldErrors).toEqual({
      nomEntreprise: landing.pilote.erreurs.nomEntrepriseVide,
      whatsapp: landing.pilote.erreurs.whatsapp,
      facturesParMois: landing.pilote.erreurs.facturesParMois,
      consentement: landing.pilote.erreurs.consentement,
    });
    expect(await lireCompteur(cleIp(ip))).toBeNull();
  });

  it("envoi moins de 3 s après l'affichage : enregistré en SUSPECTE, même succès", async () => {
    nouvelleIp();
    const n = nouveauNumero();
    expect(await envoi({ whatsapp: n, jeton: ilYA(500) })).toEqual({ success: SUCCES_PILOTE });
    expect((await demande(n))?.statut).toBe("SUSPECTE");
  });

  it("jeton absent ou falsifié : enregistré en SUSPECTE", async () => {
    nouvelleIp();
    const [a, b] = [nouveauNumero(), nouveauNumero()];
    const vrai = ilYA(10_000);
    await envoi({ whatsapp: a, jeton: "" });
    await envoi({ whatsapp: b, jeton: `${vrai.split(".")[0]}.${"0".repeat(32)}` });
    expect((await demande(a))?.statut).toBe("SUSPECTE");
    expect((await demande(b))?.statut).toBe("SUSPECTE");
  });

  it("jeton de plus de 24 h : « formulaire expiré », nouveau jeton, rien d'enregistré", async () => {
    nouvelleIp();
    const n = nouveauNumero();
    const r = await envoi({ whatsapp: n, jeton: ilYA(25 * 3600 * 1000) });
    expect(r.error).toBe(landing.pilote.erreurs.expire);
    expect(r.jeton).toMatch(/^\d{13}\.[0-9a-f]{32}$/);
    expect(await demande(n)).toBeNull();
  });
});

describe("formulaire pilote : paliers par IP (limite-pilote.ts branché sur l'action)", () => {
  it("1 à 20 envois valides : enregistrés ; 21 à 100 : en SUSPECTE ; 101ᵉ : faux succès, rien d'enregistré", async () => {
    const ip = nouvelleIp();
    const envois: string[] = [];
    for (let i = 1; i <= 101; i++) {
      const n = nouveauNumero();
      envois.push(n);
      expect(await envoi({ whatsapp: n }), `envoi ${i}`).toEqual({ success: SUCCES_PILOTE });
    }
    const statuts = await db.demandePilote.findMany({ where: { whatsapp: { in: envois.map((n) => `+228${n}`) } }, select: { whatsapp: true, statut: true } });
    const statutDe = (i: number) => statuts.find((s) => s.whatsapp === `+228${envois[i - 1]}`)?.statut ?? "non enregistré";

    expect(statutDe(1)).toBe("NOUVELLE");
    expect(statutDe(20)).toBe("NOUVELLE");
    expect(statutDe(21)).toBe("SUSPECTE");
    expect(statutDe(100)).toBe("SUSPECTE");
    expect(statutDe(101)).toBe("non enregistré");
    expect(statuts.filter((s) => s.statut === "NOUVELLE")).toHaveLength(20);
    expect(statuts.filter((s) => s.statut === "SUSPECTE")).toHaveLength(80);
    expect((await lireCompteur(cleIp(ip)))?.compteur).toBe(101);
  });

  it("une autre IP n'est pas touchée par la rafale", async () => {
    nouvelleIp();
    for (let i = 0; i < 21; i++) await envoi({ whatsapp: nouveauNumero() });
    nouvelleIp();
    const n = nouveauNumero();
    await envoi({ whatsapp: n });
    expect((await demande(n))?.statut).toBe("NOUVELLE");
  });
});

describe("formulaire pilote : une demande par numéro", () => {
  it("renvoi du même numéro : pas de doublon, statut et note conservés, nom mis à jour", async () => {
    nouvelleIp();
    const n = nouveauNumero();
    await envoi({ whatsapp: n, nomEntreprise: "Ancien nom" });
    await db.demandePilote.update({ where: { whatsapp: `+228${n}` }, data: { statut: "CONTACTEE", note: "Rappeler lundi" } });
    expect(await envoi({ whatsapp: n, nomEntreprise: "Nouveau nom" })).toEqual({ success: SUCCES_PILOTE });
    expect(await db.demandePilote.count({ where: { whatsapp: `+228${n}` } })).toBe(1);
    expect(await demande(n)).toMatchObject({ nomEntreprise: "Nouveau nom", statut: "CONTACTEE", note: "Rappeler lundi" });
  });

  it("demande ABANDONNEE ou SUSPECTE + envoi normal : repasse en NOUVELLE", async () => {
    nouvelleIp();
    const [a, s] = [nouveauNumero(), nouveauNumero()];
    await envoi({ whatsapp: a });
    await db.demandePilote.update({ where: { whatsapp: `+228${a}` }, data: { statut: "ABANDONNEE" } });
    await envoi({ whatsapp: s, jeton: ilYA(100) }); // trop rapide : SUSPECTE
    expect((await demande(s))?.statut).toBe("SUSPECTE");
    await envoi({ whatsapp: a });
    await envoi({ whatsapp: s });
    expect((await demande(a))?.statut).toBe("NOUVELLE");
    expect((await demande(s))?.statut).toBe("NOUVELLE");
  });

  it("envoi suspect sur un numéro connu : la demande existante n'est pas touchée", async () => {
    nouvelleIp();
    const n = nouveauNumero();
    await envoi({ whatsapp: n, nomEntreprise: "Vrai prospect" });
    const avant = await demande(n);
    await envoi({ whatsapp: n, nomEntreprise: "Nom écrasé par une rafale", jeton: ilYA(100) });
    const apres = await demande(n);
    expect(apres).toMatchObject({ nomEntreprise: "Vrai prospect", statut: "NOUVELLE" });
    expect(apres?.updatedAt).toEqual(avant?.updatedAt);
  });

  it("caractères hostiles : enregistrés tels quels (sur une seule ligne), jamais interprétés", async () => {
    nouvelleIp();
    const n = nouveauNumero();
    const hostile = `<script>alert("x")</script>\n<img src=x onerror=alert(1)> "guillemets" 'apostrophes' & =cmd|' /C calc'!A0`;
    expect(await envoi({ whatsapp: n, nomEntreprise: hostile })).toEqual({ success: SUCCES_PILOTE });
    expect((await demande(n))?.nomEntreprise).toBe(hostile.replace("\n", " "));
  });

  it("numéro hostile : refusé, rien d'enregistré", async () => {
    nouvelleIp();
    const r = await envoi({ whatsapp: `90123456?text=<script>` });
    expect(r.fieldErrors?.whatsapp).toBe(landing.pilote.erreurs.whatsapp);
  });
});
