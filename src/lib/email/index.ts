import { choisirPilote, lireExpediteur, type Environnement } from "./pilote";

export interface Courriel {
  a: string;
  sujet: string;
  texte: string;
  html: string;
}

const EXPEDITEUR_LOCAL = "Créancio <ne-pas-repondre@creancio.local>";

async function poster(url: string, corps: unknown, entetes: Record<string, string>, service: string) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...entetes }, body: JSON.stringify(corps), signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`${service} a refusé l'e-mail (code ${r.status}).`);
}

/**
 * Envoie un e-mail avec le pilote choisi par l'environnement (voir pilote.ts). Lève une erreur si l'envoi échoue :
 * à l'appelant de décider si l'utilisateur doit le savoir (pour la réinitialisation : non, sinon la réponse dirait si le compte existe).
 */
export async function envoyerEmail(courriel: Courriel, env: Environnement = process.env): Promise<void> {
  const { pilote, problemes } = choisirPilote(env);
  if (problemes.length > 0) throw new Error(`Envoi d'e-mail impossible : ${problemes.join(" ")}`);
  const from = lireExpediteur(env.EMAIL_FROM || EXPEDITEUR_LOCAL);
  if (!from) throw new Error("EMAIL_FROM n'est pas une adresse valide.");

  switch (pilote) {
    case "console":
      // Développement seulement : l'e-mail (donc son lien) s'affiche ici, il ne part nulle part.
      console.log(`\n--- E-mail (non envoyé, pilote « console ») ---\nÀ : ${courriel.a}\nObjet : ${courriel.sujet}\n\n${courriel.texte}\n--- fin ---\n`);
      return;
    case "mailpit":
      // Mailpit (docker compose up -d mailpit) : boîte de réception locale sur http://localhost:8025
      return poster(`${env.MAILPIT_URL || "http://localhost:8025"}/api/v1/send`, { From: { Email: from.email, Name: from.nom }, To: [{ Email: courriel.a }], Subject: courriel.sujet, Text: courriel.texte, HTML: courriel.html }, {}, "Mailpit");
    case "resend":
      return poster("https://api.resend.com/emails", { from: `${from.nom} <${from.email}>`, to: [courriel.a], subject: courriel.sujet, text: courriel.texte, html: courriel.html }, { Authorization: `Bearer ${env.RESEND_API_KEY}` }, "Resend");
    case "brevo":
      return poster("https://api.brevo.com/v3/smtp/email", { sender: { name: from.nom, email: from.email }, to: [{ email: courriel.a }], subject: courriel.sujet, textContent: courriel.texte, htmlContent: courriel.html }, { "api-key": env.BREVO_API_KEY ?? "" }, "Brevo");
  }
}
