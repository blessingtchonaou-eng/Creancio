import { hashPassword } from "better-auth/crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { seConnecter, serveurAccessible } from "./session";

// /admin/pilote vu par un administrateur de la plateforme : filtre par statut (SUSPECTE incluse), rendu des textes saisis
// par des inconnus, lien WhatsApp, export CSV.
// PRÉREQUIS (comme admin-plateforme-redirection.test.ts) : ADMIN_PLATEFORME_EMAILS="admin-plateforme-test@example.com" npm run dev
const ADMIN = { id: "test-admin-plateforme", email: "admin-plateforme-test@example.com", nom: "Admin Plateforme Test" };
const MOT_DE_PASSE = process.env.DEMO_PASSWORD ?? "creancio-demo-2026";
const HOSTILE = {
  nomEntreprise: `<script>alert("x")</script> <img src=x onerror=alert(1)> "guillemets" 'apostrophes' & =cmd|' /C calc'!A0`,
  nomContact: `</p><a href="javascript:alert(1)">clic</a>`,
  // Commence par « = » : c'est en début de cellule qu'Excel lirait une formule.
  note: `=HYPERLINK("http://x")\n<b>gras ?</b>\n"; DROP TABLE "DemandePilote"; --`,
};
const DEMANDES = {
  hostile: { id: "test-http-demande-hostile", whatsapp: "+22879990001", statut: "NOUVELLE" as const, ...HOSTILE },
  suspecte: { id: "test-http-demande-suspecte", whatsapp: "+22879990002", statut: "SUSPECTE" as const, nomEntreprise: "Envoi en rafale" },
  // Valeur impossible via le formulaire (écrite directement en base) : aucun lien wa.me ne doit en sortir.
  numeroInvalide: { id: "test-http-demande-numero-invalide", whatsapp: "javascript:alert(1)", statut: "CONTACTEE" as const, nomEntreprise: "Numéro invalide" },
};

async function nettoyer() {
  await db.demandePilote.deleteMany({ where: { id: { in: Object.values(DEMANDES).map((d) => d.id) } } });
  await db.utilisateur.deleteMany({ where: { id: ADMIN.id } });
}

describe("/admin/pilote vu par l'administrateur (HTTP)", () => {
  let page: Awaited<ReturnType<typeof seConnecter>>;

  beforeAll(async () => {
    await serveurAccessible();
    await nettoyer();
    await db.utilisateur.create({
      data: { id: ADMIN.id, nom: ADMIN.nom, email: ADMIN.email, emailVerified: true, comptes: { create: { accountId: ADMIN.id, providerId: "credential", password: await hashPassword(MOT_DE_PASSE) } } },
    });
    await db.demandePilote.createMany({ data: Object.values(DEMANDES).map((d) => ({ ...d, consentement: true, consentementVersion: "v1-2026-09-23" })) });
    page = await seConnecter(ADMIN.email);
    const r = await page("/admin/pilote");
    if (r.status === 404) throw new Error(`Le serveur ne connaît pas ${ADMIN.email} comme administrateur : relancez-le avec ADMIN_PLATEFORME_EMAILS="${ADMIN.email}" npm run dev`);
  });
  afterAll(async () => {
    await nettoyer();
    await db.$disconnect();
  });

  it("filtre par défaut : les suspectes n'apparaissent pas, mais leur nombre est affiché", async () => {
    const html = await (await page("/admin/pilote")).text();
    expect(html).not.toContain("Envoi en rafale");
    expect(html).toContain("Numéro invalide");
    expect(html).toMatch(/href="\/admin\/pilote\?statut=SUSPECTE"[^>]*>Suspectes/);
    const nbSuspectes = await db.demandePilote.count({ where: { statut: "SUSPECTE" } });
    expect(html).toContain(`n&#x27;inclut pas les demandes suspectes (<!-- -->${nbSuspectes}<!-- -->)`);
  });

  it("filtre « Suspectes » : seules les suspectes, et le filtre est marqué actif", async () => {
    const html = await (await page("/admin/pilote?statut=SUSPECTE")).text();
    expect(html).toContain("Envoi en rafale");
    expect(html).not.toContain("Numéro invalide");
    expect(html).toMatch(/aria-current="true"[^>]*>Suspectes/);
  });

  it("textes hostiles : affichés comme du texte (échappés), jamais interprétés", async () => {
    const html = await (await page("/admin/pilote")).text();
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &lt;img src=x onerror=alert(1)&gt; &quot;guillemets&quot; &#x27;apostrophes&#x27; &amp; =cmd|&#x27; /C calc&#x27;!A0");
    expect(html).toContain("&lt;/p&gt;&lt;a href=&quot;javascript:alert(1)&quot;&gt;clic&lt;/a&gt;");
    expect(html).toContain("&lt;b&gt;gras ?&lt;/b&gt;");
    expect(html).not.toContain('<script>alert("x")');
    expect(html).not.toContain("<img src=x onerror");
    expect(html).not.toContain('<a href="javascript:');
    expect(html).not.toContain("<b>gras");
  });

  it("lien WhatsApp : construit depuis le numéro enregistré revérifié, absent pour une valeur invalide", async () => {
    const html = await (await page("/admin/pilote")).text();
    expect(html).toContain('href="https://wa.me/22879990001"');
    expect(html).not.toMatch(/wa\.me\/[^"]*javascript/);
    expect(html).not.toContain("wa.me/javascript");
  });

  it("export CSV : fichier téléchargé, filtre respecté, formules neutralisées", async () => {
    const r = await page("/admin/pilote/export?statut=NOUVELLE");
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(r.headers.get("content-disposition")).toMatch(/^attachment; filename="demandes-pilote-nouvelle-\d{4}-\d{2}-\d{2}\.csv"$/);
    const octets = new Uint8Array(await r.arrayBuffer());
    expect([...octets.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // BOM UTF-8 : Excel lit les accents
    const csv = new TextDecoder().decode(octets);
    expect(csv).toContain(`;"'=HYPERLINK(""http://x"")\n<b>gras ?</b>`); // note : début de cellule neutralisé, saut de ligne gardé
    expect(csv).toContain(`"79 99 00 01"`);
    expect(csv).not.toContain("Envoi en rafale");
  });
});
