import { randomInt } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { empreinte, oublier } from "@/lib/limite-debit";
import { BASE_URL, serveurAccessible } from "./session";

// Le formulaire « Rejoindre le pilote » envoyé comme par un navigateur SANS JavaScript : on relève les champs cachés du
// formulaire rendu (identifiant de l'action, jeton horodaté), puis on envoie un POST multipart vers « / ».
const IP_TEST = `198.51.100.${randomInt(1, 255)}`;
const numeros: string[] = [];
const nouveauNumero = () => {
  const n = `79${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;
  numeros.push(`+228${n}`);
  return n;
};
const entites = (v: string) => v.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** Champs cachés du formulaire pilote tel que le serveur le rend. */
async function champsCaches(): Promise<[string, string][]> {
  const html = await (await fetch(`${BASE_URL}/`, { headers: { "x-forwarded-for": IP_TEST } })).text();
  const i = html.indexOf('name="nomEntreprise"');
  const form = html.slice(html.lastIndexOf("<form", i), html.indexOf("</form>", i));
  return [...form.matchAll(/<input type="hidden" name="([^"]+)"(?: value="([^"]*)")?\/>/g)].map((m) => [m[1], entites(m[2] ?? "")]);
}

async function envoyer(caches: [string, string][], champs: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of caches) f.append(k, v);
  for (const [k, v] of Object.entries(champs)) f.append(k, v);
  const r = await fetch(`${BASE_URL}/`, { method: "POST", body: f, headers: { "x-forwarded-for": IP_TEST, Origin: BASE_URL } });
  return { status: r.status, html: await r.text() };
}
const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("formulaire pilote envoyé sans JavaScript (HTTP)", () => {
  beforeAll(async () => {
    await serveurAccessible();
  });
  afterAll(async () => {
    await db.demandePilote.deleteMany({ where: { whatsapp: { in: numeros } } });
    await oublier(`pilote:ip:${empreinte(IP_TEST)}`);
    await db.$disconnect();
  });

  it("envoi normal : message de remerciement, demande NOUVELLE avec la preuve du consentement", async () => {
    const caches = await champsCaches();
    expect(caches.map(([k]) => k)).toContain("jeton");
    await attendre(3_200);
    const n = nouveauNumero();
    const r = await envoyer(caches, { nomEntreprise: "Boutique Sans JS", whatsapp: n, facturesParMois: "MOINS_DE_20", consentement: "oui", site_web: "" });
    expect(r.status).toBe(200);
    expect(r.html).toContain("Nous vous contactons sur WhatsApp très vite.");
    expect(await db.demandePilote.findUnique({ where: { whatsapp: `+228${n}` } })).toMatchObject({
      statut: "NOUVELLE",
      nomEntreprise: "Boutique Sans JS",
      consentementVersion: "v1-2026-09-23",
    });
  });

  it("envoi aussitôt la page affichée (moins de 3 s) : même remerciement, demande en SUSPECTE", async () => {
    const caches = await champsCaches();
    const n = nouveauNumero();
    const r = await envoyer(caches, { nomEntreprise: "Robot pressé", whatsapp: n, consentement: "oui", site_web: "" });
    expect(r.html).toContain("Nous vous contactons sur WhatsApp très vite.");
    expect((await db.demandePilote.findUnique({ where: { whatsapp: `+228${n}` } }))?.statut).toBe("SUSPECTE");
  });

  it("caractères hostiles avec une erreur de saisie : réaffichés comme du texte, jamais interprétés, rien d'enregistré", async () => {
    const caches = await champsCaches();
    await attendre(3_200);
    const hostile = `<script>alert("x")</script> "guillemets" 'apostrophes' & <img src=x onerror=alert(1)>`;
    const r = await envoyer(caches, { nomEntreprise: hostile, whatsapp: `"><script>alert(2)</script>`, consentement: "oui", site_web: "" });
    expect(r.status).toBe(200);
    expect(r.html).toContain("Saisissez un numéro togolais valide, par exemple 90 12 34 56.");
    expect(r.html).toContain(
      'value="&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &quot;guillemets&quot; &#x27;apostrophes&#x27; &amp; &lt;img src=x onerror=alert(1)&gt;"',
    );
    expect(r.html).toContain('value="&quot;&gt;&lt;script&gt;alert(2)&lt;/script&gt;"');
    expect(r.html).not.toContain('<script>alert("x")');
    expect(r.html).not.toContain("<script>alert(2)");
    expect(r.html).not.toContain("<img src=x onerror");
  });
});
