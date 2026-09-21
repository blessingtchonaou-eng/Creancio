import { afterEach, describe, expect, it, vi } from "vitest";
import { envoyerEmail } from "./index";
import { courrielMotDePasseModifie, courrielReinitialisation, courrielVerification } from "./modeles";

const courriel = { a: "kofi@exemple.tg", sujet: "Objet", texte: "Corps", html: "<p>Corps</p>" };
const FROM = "Créancio <ne-pas-repondre@creancio.tg>";

afterEach(() => vi.restoreAllMocks());

describe("envoi d'e-mails", () => {
  it("« console » affiche l'e-mail et n'appelle aucun service", async () => {
    const fetchEspion = vi.spyOn(globalThis, "fetch");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await envoyerEmail(courriel, { NODE_ENV: "development" });
    expect(fetchEspion).not.toHaveBeenCalled();
    expect(String(log.mock.calls[0][0])).toContain("kofi@exemple.tg");
  });

  it("Resend : un seul appel, clé dans l'en-tête, jamais dans le corps", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    await envoyerEmail(courriel, { NODE_ENV: "production", EMAIL_DRIVER: "resend", RESEND_API_KEY: "re_secrete", EMAIL_FROM: FROM });
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer re_secrete");
    expect(String(init!.body)).not.toContain("re_secrete");
    expect(JSON.parse(String(init!.body))).toMatchObject({ from: FROM, to: ["kofi@exemple.tg"], subject: "Objet" });
  });

  it("Brevo : expéditeur séparé, clé dans « api-key »", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 201 }));
    await envoyerEmail(courriel, { NODE_ENV: "production", EMAIL_DRIVER: "brevo", BREVO_API_KEY: "xkey", EMAIL_FROM: FROM });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect((init!.headers as Record<string, string>)["api-key"]).toBe("xkey");
    expect(JSON.parse(String(init!.body)).sender).toEqual({ name: "Créancio", email: "ne-pas-repondre@creancio.tg" });
  });

  it("Mailpit local : appel vers la boîte locale", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    await envoyerEmail(courriel, { NODE_ENV: "development", EMAIL_DRIVER: "mailpit" });
    expect(f.mock.calls[0][0]).toBe("http://localhost:8025/api/v1/send");
  });

  it("un refus du service lève une erreur sans exposer la clé", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("nope", { status: 401 }));
    const erreur = await envoyerEmail(courriel, { NODE_ENV: "production", EMAIL_DRIVER: "resend", RESEND_API_KEY: "re_secrete", EMAIL_FROM: FROM }).catch((e: Error) => e);
    expect((erreur as Error).message).toContain("401");
    expect((erreur as Error).message).not.toContain("re_secrete");
  });

  it("production sans clé : rien ne part, pas de repli sur « console »", async () => {
    const f = vi.spyOn(globalThis, "fetch");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await expect(envoyerEmail(courriel, { NODE_ENV: "production", EMAIL_DRIVER: "resend", EMAIL_FROM: FROM })).rejects.toThrow("RESEND_API_KEY");
    expect(f).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });
});

describe("modèles d'e-mails", () => {
  it("réinitialisation : lien en clair et en HTML, durée, prénom", () => {
    const c = courrielReinitialisation("kofi@exemple.tg", "Kofi Agbo", "https://creancio.tg/api/auth/reset-password/abc?callbackURL=%2Fx");
    expect(c.texte).toContain("Bonjour Kofi,");
    expect(c.texte).toContain("https://creancio.tg/api/auth/reset-password/abc?callbackURL=%2Fx");
    expect(c.texte).toContain("1 heure");
    expect(c.html).toContain('href="https://creancio.tg/api/auth/reset-password/abc?callbackURL=%2Fx"');
  });

  it("échappe le nom et l'adresse dans le HTML", () => {
    const c = courrielVerification("a@b.tg", "<script>x</script>", 'https://x.tg/?a=1&b="2"');
    expect(c.html).not.toContain("<script>");
    expect(c.html).toContain("&amp;b=&quot;2&quot;");
  });

  it("notification de changement : aucun lien", () => {
    const c = courrielMotDePasseModifie("a@b.tg", "Ama");
    expect(c.texte).not.toMatch(/https?:\/\//);
    expect(c.sujet).toContain("changé");
  });
});
