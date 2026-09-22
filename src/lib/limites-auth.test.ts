import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { consommer, empreinte, incrementer, lireCompteur } from "./limite-debit";
import { LIMITES, attenteAvantTentative, clesLimites, enregistrerEchec, reussite, type Operation } from "./limites-auth";

// Base réelle (creancio_dev). Chaque test utilise des adresses IP et e-mail tirées au hasard : les compteurs ne se croisent pas,
// et tout ce qui a été créé est supprimé à la fin.
const alea = () => randomBytes(6).toString("hex");
const cleCreees = new Set<string>();
const suivre = (op: Operation, ip: string | null, email: string) => Object.values(clesLimites(op, ip, email)).forEach((c) => cleCreees.add(c));
const ipAlea = () => `198.51.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
const mail = () => `test-limite-${alea()}@example.com`;

async function echecs(op: Operation, ip: string, email: string, n: number) {
  suivre(op, ip, email);
  for (let i = 0; i < n; i++) await enregistrerEchec(op, ip, email);
}
async function tenter(op: Operation, ip: string, email: string) {
  suivre(op, ip, email);
  return attenteAvantTentative(op, ip, email);
}

afterAll(async () => {
  await db.limiteDebit.deleteMany({ where: { cle: { in: [...cleCreees] } } });
  await db.limiteDebit.deleteMany({ where: { cle: { startsWith: "test:" } } });
  await db.$disconnect();
});

describe("compteurs en base (fenêtre fixe)", () => {
  it("compte, refuse au-delà du maximum, et repart à zéro quand la fenêtre est passée", async () => {
    const cle = `test:${alea()}`;
    const regle = { fenetre: 60, max: 3 };
    expect((await consommer(cle, regle)).autorise).toBe(true);
    expect((await consommer(cle, regle)).autorise).toBe(true);
    expect((await consommer(cle, regle)).autorise).toBe(true);
    const refus = await consommer(cle, regle);
    expect(refus.autorise).toBe(false);
    expect(refus.resteSecondes).toBeGreaterThan(50);
    expect(refus.resteSecondes).toBeLessThanOrEqual(60);

    // La fenêtre est passée (on la fait expirer directement en base) : le compteur repart à 1
    await db.limiteDebit.update({ where: { cle }, data: { expireLe: new Date(Date.now() - 60_000) } }); // marge : l'horloge de la base peut avoir quelques secondes d'écart
    expect(await lireCompteur(cle)).toBeNull();
    expect((await consommer(cle, regle)).autorise).toBe(true);
    expect((await lireCompteur(cle))?.compteur).toBe(1);
  });

  it("la fenêtre ne glisse pas : les refus n'allongent pas l'attente", async () => {
    const cle = `test:${alea()}`;
    const a = await incrementer(cle, 60);
    for (let i = 0; i < 5; i++) await incrementer(cle, 60);
    const b = await lireCompteur(cle);
    expect(b!.compteur).toBe(6);
    expect(b!.resteSecondes).toBeLessThanOrEqual(a.resteSecondes);
  });

  it("des passages simultanés ne se perdent pas", async () => {
    const cle = `test:${alea()}`;
    await Promise.all(Array.from({ length: 20 }, () => incrementer(cle, 60)));
    expect((await lireCompteur(cle))?.compteur).toBe(20);
  });

  it("la clé ne contient ni IP ni adresse en clair", () => {
    const ip = "203.0.113.7";
    const email = "kofi@exemple.tg";
    const toutes = Object.values(clesLimites("connexion", ip, email)).join(" ");
    expect(toutes).not.toContain(ip);
    expect(toutes).not.toContain("kofi");
    expect(empreinte("a")).toHaveLength(32);
    expect(empreinte("a")).not.toBe(empreinte("b"));
  });
});

describe.each<Operation>(["connexion", "inscription"])("limites sur les échecs (%s)", (op) => {
  it("par IP : 20 échecs sur 20 adresses différentes bloquent cette IP, pas les autres", async () => {
    const ip = ipAlea();
    for (let i = 0; i < LIMITES.ip.max; i++) {
      expect(await tenter(op, ip, mail()), `essai ${i + 1}`).toBeNull();
      await echecs(op, ip, mail(), 1);
    }
    // On a compté 20 échecs (sur 20 adresses tirées au hasard) : la 21e tentative, avec une adresse neuve, est refusée
    expect(await tenter(op, ip, mail())).not.toBeNull();
    // Une autre IP n'est pas concernée
    expect(await tenter(op, ipAlea(), mail())).toBeNull();
  });

  it("par couple IP + adresse : 10 échecs bloquent ce couple, mais ni la même adresse depuis une autre IP ni une autre adresse depuis cette IP", async () => {
    const ip = ipAlea();
    const email = mail();
    await echecs(op, ip, email, LIMITES.couple.max - 1);
    expect(await tenter(op, ip, email)).toBeNull(); // 9 échecs : encore permis
    await echecs(op, ip, email, 1);
    expect(await tenter(op, ip, email)).not.toBeNull(); // 10 : refusé
    expect(await tenter(op, ipAlea(), email)).toBeNull(); // même adresse, autre IP
    expect(await tenter(op, ip, mail())).toBeNull(); // même IP, autre adresse
  });

  it("plafond par adresse, toutes IP confondues : dix IP différentes, une adresse → 50 échecs bloquent toutes les IP", async () => {
    const email = mail();
    const ips = Array.from({ length: 10 }, ipAlea);
    for (const ip of ips.slice(0, 9)) await echecs(op, ip, email, 5); // 45 échecs au total, 5 par IP
    expect(await tenter(op, ips[0], email)).toBeNull(); // aucune limite atteinte
    await echecs(op, ips[9], email, 5); // 50 au total
    // Aucun couple (5 < 10) ni aucune IP (5 < 20) n'a atteint sa limite : c'est bien le plafond par adresse qui joue
    for (const ip of ips) {
      const k = clesLimites(op, ip, email);
      expect((await lireCompteur(k.couple))?.compteur).toBe(5);
      expect((await lireCompteur(k.ip))?.compteur).toBeLessThan(LIMITES.ip.max);
    }
    // Toutes les IP sont refusées pour cette adresse, y compris une onzième, toute neuve
    for (const ip of ips) expect(await tenter(op, ip, email), `IP ${ip}`).not.toBeNull();
    const neuve = ipAlea();
    expect(await tenter(op, neuve, email)).not.toBeNull();
    expect(await lireCompteur(clesLimites(op, neuve, email).adresse)).toMatchObject({ compteur: 50 });
    // Une autre adresse, depuis cette même IP neuve, n'est pas concernée
    expect(await tenter(op, neuve, mail())).toBeNull();
  });

  it("49 échecs répartis : pas encore bloqué", async () => {
    const email = mail();
    for (let i = 0; i < 49; i++) await echecs(op, ipAlea(), email, 1);
    expect(await tenter(op, ipAlea(), email)).toBeNull();
  });
});

describe("règles communes", () => {
  it("connexion et inscription ont chacune leurs compteurs", async () => {
    const ip = ipAlea();
    const email = mail();
    await echecs("connexion", ip, email, LIMITES.couple.max);
    expect(await tenter("connexion", ip, email)).not.toBeNull();
    expect(await tenter("inscription", ip, email)).toBeNull();
  });

  it("une réussite remet à zéro le couple IP + adresse, pas l'IP ni l'adresse", async () => {
    const ip = ipAlea();
    const email = mail();
    await echecs("connexion", ip, email, 6);
    suivre("connexion", ip, email);
    await reussite("connexion", ip, email);
    const k = clesLimites("connexion", ip, email);
    expect(await lireCompteur(k.couple)).toBeNull();
    expect((await lireCompteur(k.ip))?.compteur).toBe(6);
    expect((await lireCompteur(k.adresse))?.compteur).toBe(6);
  });

  it("la même adresse écrite en majuscules ou avec des espaces est comptée ensemble", async () => {
    const ip = ipAlea();
    const email = mail();
    await echecs("connexion", ip, email, 4);
    await echecs("connexion", ip, `  ${email.toUpperCase()} `, 6);
    expect(await tenter("connexion", ip, email)).not.toBeNull();
  });

  it("sans IP lisible : compteur commun « ip-inconnue » (pas d'absence de limite)", async () => {
    const email = mail();
    suivre("connexion", null, email);
    for (let i = 0; i < LIMITES.couple.max; i++) await enregistrerEchec("connexion", null, email);
    expect(await attenteAvantTentative("connexion", null, email)).not.toBeNull();
  });

  it("l'attente annoncée ne dépasse pas la durée de la fenêtre", async () => {
    const ip = ipAlea();
    const email = mail();
    await echecs("connexion", ip, email, LIMITES.couple.max);
    const minutes = await tenter("connexion", ip, email);
    expect(minutes).toBeGreaterThanOrEqual(1);
    expect(minutes).toBeLessThanOrEqual(15);
  });
});
