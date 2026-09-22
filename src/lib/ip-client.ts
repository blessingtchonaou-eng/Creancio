import { isIP } from "node:net";

/**
 * Adresse IP du visiteur, pour la limite de débit.
 *
 * Derrière un proxy inverse, l'en-tête contient une chaîne « client, proxy1, proxy2 » : chaque proxy de confiance ajoute à la
 * fin l'adresse dont il a reçu la requête. La partie gauche est écrite par le visiteur et n'a aucune valeur. On compte donc
 * depuis la DROITE, en sautant les proxys de confiance : avec N proxys, le visiteur est la N-ième adresse en partant de la fin.
 *   - VPS avec nginx ou Caddy devant l'application : CLIENT_IP_HEADER=x-forwarded-for, TRUSTED_PROXY_COUNT=1
 *   - Vercel (en-tête à une seule adresse, posé par la plateforme) : CLIENT_IP_HEADER=x-forwarded-for, TRUSTED_PROXY_COUNT=1
 *   - Cloudflare devant un proxy : CLIENT_IP_HEADER=x-forwarded-for, TRUSTED_PROXY_COUNT=2 (à vérifier sur l'installation réelle)
 * Le proxy doit ÉCRASER (ou compléter) l'en-tête reçu, pas le laisser passer tel quel : voir le README.
 */
export type ConfigIp = { entete: string; proxys: number };
type Env = Record<string, string | undefined>;

const NOM_ENTETE = /^[a-z0-9-]+$/i;
const MAX_PROXYS = 10;

/** Lecture de la configuration. En production, les deux variables sont obligatoires. Ailleurs : x-forwarded-for et 1 proxy. */
export function configIp(env: Env): { config: ConfigIp; problemes: string[] } {
  const production = env.NODE_ENV === "production";
  const entete = (env.CLIENT_IP_HEADER ?? "").trim();
  const proxysBrut = (env.TRUSTED_PROXY_COUNT ?? "").trim();
  const problemes: string[] = [];

  if (production && entete === "") problemes.push("En production, CLIENT_IP_HEADER doit nommer l'en-tête qui porte l'adresse IP du visiteur (ex. x-forwarded-for).");
  else if (entete !== "" && !NOM_ENTETE.test(entete)) problemes.push(`CLIENT_IP_HEADER : « ${entete} » n'est pas un nom d'en-tête valide.`);

  const proxys = proxysBrut === "" ? 1 : Number(proxysBrut);
  if (production && proxysBrut === "") problemes.push("En production, TRUSTED_PROXY_COUNT doit donner le nombre de proxys de confiance devant l'application (ex. 1).");
  else if (proxysBrut !== "" && !(/^\d+$/.test(proxysBrut) && proxys >= 1 && proxys <= MAX_PROXYS)) {
    problemes.push(`TRUSTED_PROXY_COUNT : « ${proxysBrut} » doit être un entier de 1 à ${MAX_PROXYS}.`);
  }

  return { config: { entete: NOM_ENTETE.test(entete) ? entete.toLowerCase() : "x-forwarded-for", proxys: Number.isInteger(proxys) && proxys >= 1 ? proxys : 1 }, problemes };
}

/** IPv6 « mappée » sur IPv4 (::ffff:1.2.3.4) : ramenée à l'IPv4. Renvoie null si ce n'est pas une adresse IP. */
export function normaliserIp(ip: string): string | null {
  const version = isIP(ip);
  if (version === 4) return ip;
  if (version !== 6) return null;
  const mappee = /^(?:::ffff:|0:0:0:0:0:ffff:)(\d+\.\d+\.\d+\.\d+)$/.exec(ip.toLowerCase());
  return mappee && isIP(mappee[1]) === 4 ? mappee[1] : ip.toLowerCase();
}

/**
 * Étiquette servant à compter : l'adresse IPv4 telle quelle, ou le réseau /64 pour l'IPv6 (un abonné en obtient un entier :
 * changer les 64 derniers bits ne doit pas permettre d'échapper à la limite).
 */
export function groupeIp(ip: string): string {
  if (isIP(ip) !== 6) return ip;
  const [gauche, droite] = ip.toLowerCase().split("::");
  const g = gauche ? gauche.split(":") : [];
  const d = droite !== undefined && droite !== "" ? droite.split(":") : [];
  const groupes = ip.includes("::") ? [...g, ...Array(Math.max(0, 8 - g.length - d.length)).fill("0"), ...d] : g;
  return `${groupes.slice(0, 4).map((x) => x.padStart(4, "0")).join(":")}::/64`;
}

/**
 * Adresse du visiteur, ou null si elle est introuvable (en-tête absent, plus court que prévu, adresse invalide).
 * Hors production, sans en-tête : 127.0.0.1 (poste de travail, tests).
 */
export function lireIpClient(entetes: Headers, env: Env = process.env): string | null {
  const { config } = configIp(env);
  const brut = entetes.get(config.entete);
  if (brut) {
    const liste = brut.split(",").map((s) => s.trim()).filter(Boolean);
    const candidate = liste[liste.length - config.proxys];
    const ip = candidate ? normaliserIp(candidate) : null;
    if (ip) return ip;
  }
  return env.NODE_ENV === "production" ? null : "127.0.0.1";
}

/**
 * En-tête interne que Better Auth lit pour son propre limiteur (voir auth.ts). Seul le serveur l'écrit : celui qu'envoie
 * le visiteur est toujours supprimé, sinon il pourrait choisir lui-même l'adresse sous laquelle il est compté.
 */
export const ENTETE_IP_INTERNE = "x-creancio-ip";

export function avecIpDeConfiance(entetes: Headers, env: Env = process.env): Headers {
  const copie = new Headers(entetes);
  copie.delete(ENTETE_IP_INTERNE);
  const ip = lireIpClient(entetes, env);
  if (ip) copie.set(ENTETE_IP_INTERNE, ip);
  return copie;
}
