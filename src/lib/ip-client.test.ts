import { describe, expect, it } from "vitest";
import { ENTETE_IP_INTERNE, avecIpDeConfiance, configIp, groupeIp, lireIpClient } from "./ip-client";

const PROD = { NODE_ENV: "production", CLIENT_IP_HEADER: "x-forwarded-for", TRUSTED_PROXY_COUNT: "1" };
const h = (o: Record<string, string>) => new Headers(o);

describe("lecture de l'IP du visiteur (configurable)", () => {
  it("un proxy de confiance : le visiteur est la dernière adresse, ce qui est écrit avant est ignoré", () => {
    expect(lireIpClient(h({ "x-forwarded-for": "203.0.113.7" }), PROD)).toBe("203.0.113.7");
    // Le visiteur écrit lui-même « 1.1.1.1 » : le proxy ajoute la vraie adresse à la fin
    expect(lireIpClient(h({ "x-forwarded-for": "1.1.1.1, 203.0.113.7" }), PROD)).toBe("203.0.113.7");
  });

  it("deux proxys de confiance : on saute les deux dernières adresses", () => {
    const env = { ...PROD, TRUSTED_PROXY_COUNT: "2" };
    expect(lireIpClient(h({ "x-forwarded-for": "9.9.9.9, 203.0.113.7, 10.0.0.1" }), env)).toBe("203.0.113.7");
    expect(lireIpClient(h({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }), env)).toBe("203.0.113.7");
  });

  it("là où Better Auth seul renvoie null (plusieurs adresses), la configuration donne une adresse", () => {
    expect(lireIpClient(h({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }), { ...PROD, TRUSTED_PROXY_COUNT: "2" })).toBe("203.0.113.7");
    expect(lireIpClient(h({ "x-forwarded-for": "198.51.100.9, 203.0.113.7" }), PROD)).toBe("203.0.113.7");
  });

  it("autre en-tête (x-real-ip)", () => {
    expect(lireIpClient(h({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "1.1.1.1" }), { ...PROD, CLIENT_IP_HEADER: "X-Real-IP" })).toBe("203.0.113.7");
  });

  it("production : en-tête absent, trop court ou invalide → null (jamais une adresse inventée)", () => {
    expect(lireIpClient(h({}), PROD)).toBeNull();
    expect(lireIpClient(h({ "x-forwarded-for": "203.0.113.7" }), { ...PROD, TRUSTED_PROXY_COUNT: "2" })).toBeNull();
    expect(lireIpClient(h({ "x-forwarded-for": "pas-une-adresse" }), PROD)).toBeNull();
    expect(lireIpClient(h({ "x-forwarded-for": "" }), PROD)).toBeNull();
  });

  it("développement : 127.0.0.1 quand il n'y a pas d'en-tête, et x-forwarded-for lu par défaut", () => {
    expect(lireIpClient(h({}), { NODE_ENV: "development" })).toBe("127.0.0.1");
    expect(lireIpClient(h({ "x-forwarded-for": "10.1.2.3" }), { NODE_ENV: "development" })).toBe("10.1.2.3");
  });

  it("IPv6 : adresse valide acceptée, IPv4 « mappée » ramenée à l'IPv4, regroupement par réseau /64", () => {
    expect(lireIpClient(h({ "x-forwarded-for": "2001:DB8:1:2:aaaa:bbbb:cccc:dddd" }), PROD)).toBe("2001:db8:1:2:aaaa:bbbb:cccc:dddd");
    expect(lireIpClient(h({ "x-forwarded-for": "::ffff:203.0.113.7" }), PROD)).toBe("203.0.113.7");
    expect(groupeIp("2001:db8:1:2:aaaa:bbbb:cccc:dddd")).toBe(groupeIp("2001:db8:1:2:1111:2222:3333:4444"));
    expect(groupeIp("2001:db8:1:2::1")).toBe(groupeIp("2001:db8:1:2:ffff::9"));
    expect(groupeIp("2001:db8:1:3::1")).not.toBe(groupeIp("2001:db8:1:2::1"));
    expect(groupeIp("203.0.113.7")).toBe("203.0.113.7");
  });
});

describe("configuration de l'IP", () => {
  it("valeurs par défaut hors production, obligatoires en production", () => {
    expect(configIp({ NODE_ENV: "development" })).toEqual({ config: { entete: "x-forwarded-for", proxys: 1 }, problemes: [] });
    expect(configIp({ NODE_ENV: "production" }).problemes).toHaveLength(2);
    expect(configIp(PROD).problemes).toEqual([]);
  });
  it("valeurs invalides signalées", () => {
    for (const proxys of ["0", "-1", "1.5", "abc", "11"]) expect(configIp({ ...PROD, TRUSTED_PROXY_COUNT: proxys }).problemes, proxys).toHaveLength(1);
    expect(configIp({ ...PROD, CLIENT_IP_HEADER: "x forwarded for" }).problemes).toHaveLength(1);
  });
});

describe("en-tête interne transmis à Better Auth", () => {
  it("celui que le visiteur envoie est écrasé par l'adresse calculée par le serveur", () => {
    const sortie = avecIpDeConfiance(h({ "x-forwarded-for": "1.1.1.1, 203.0.113.7", [ENTETE_IP_INTERNE]: "6.6.6.6" }), PROD);
    expect(sortie.get(ENTETE_IP_INTERNE)).toBe("203.0.113.7");
  });
  it("adresse introuvable en production : l'en-tête du visiteur est quand même supprimé", () => {
    const sortie = avecIpDeConfiance(h({ [ENTETE_IP_INTERNE]: "6.6.6.6" }), PROD);
    expect(sortie.has(ENTETE_IP_INTERNE)).toBe(false);
  });
});
