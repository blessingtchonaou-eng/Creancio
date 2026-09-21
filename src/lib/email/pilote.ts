/**
 * Choix du pilote d'envoi d'e-mails. Fonction pure (l'environnement est passé en paramètre) pour pouvoir la tester.
 *
 * - Hors production : « console » (par défaut) ou « mailpit ». Les pilotes réels (Resend, Brevo) sont REFUSÉS,
 *   même si une clé est présente : un développeur ne peut pas envoyer un vrai e-mail par erreur.
 * - En production : un pilote réel, avec sa clé et une adresse d'expédition. Jamais de repli silencieux sur « console ».
 */
export type NomPilote = "console" | "mailpit" | "resend" | "brevo";

const LOCAUX: NomPilote[] = ["console", "mailpit"];
const REELS: NomPilote[] = ["resend", "brevo"];

export type Environnement = Record<string, string | undefined>;

export interface ChoixPilote {
  pilote: NomPilote;
  /** Ce qui empêche de choisir un pilote valable (vide si tout va bien). */
  problemes: string[];
}

export function choisirPilote(env: Environnement): ChoixPilote {
  const production = env.NODE_ENV === "production";
  const demande = (env.EMAIL_DRIVER ?? "").trim().toLowerCase();

  if (!production) {
    if (demande === "" || demande === "console") return { pilote: "console", problemes: [] };
    if (demande === "mailpit") return { pilote: "mailpit", problemes: [] };
    if ((REELS as string[]).includes(demande)) {
      return { pilote: "console", problemes: [`EMAIL_DRIVER=${demande} : les envois réels sont réservés à la production. En développement, utilisez « console » ou « mailpit ».`] };
    }
    return { pilote: "console", problemes: [`EMAIL_DRIVER=${demande} : pilote inconnu (console, mailpit, resend, brevo).`] };
  }

  if (!(REELS as string[]).includes(demande)) {
    const dit = LOCAUX.includes(demande as NomPilote) ? `« ${demande} » n'envoie rien` : demande === "" ? "EMAIL_DRIVER est vide" : `pilote inconnu « ${demande} »`;
    return { pilote: "console", problemes: [`En production, EMAIL_DRIVER doit valoir « resend » ou « brevo » (${dit}).`] };
  }
  const pilote = demande as NomPilote;
  const problemes: string[] = [];
  const cle = pilote === "resend" ? "RESEND_API_KEY" : "BREVO_API_KEY";
  if (!(env[cle] ?? "").trim()) problemes.push(`${cle} est vide : aucun e-mail ne peut partir.`);
  if (!(env.EMAIL_FROM ?? "").trim()) problemes.push("EMAIL_FROM est vide (exemple : Créancio <ne-pas-repondre@votre-domaine>).");
  return { pilote, problemes };
}

/** « Créancio <ne-pas-repondre@exemple.tg> » → { nom, email }. Une adresse seule est aussi acceptée. */
export function lireExpediteur(from: string): { nom: string; email: string } | null {
  const m = from.trim().match(/^(?:"?([^"<]*?)"?\s*)?<([^<>\s]+@[^<>\s]+)>$/) ?? from.trim().match(/^()([^<>\s]+@[^<>\s]+)$/);
  if (!m) return null;
  return { nom: (m[1] ?? "").trim() || "Créancio", email: m[2] };
}
