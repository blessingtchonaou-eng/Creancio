/**
 * Crée un compte pour administrer la plateforme (/admin/pilote) SANS rouvrir les inscriptions publiques.
 *
 * Pourquoi ça marche même quand INSCRIPTIONS_OUVERTES=false : ce script appelle auth.api.signUpEmail(...)
 * directement (pas de requête HTTP), donc ctx.request est absent dans le hook de src/lib/auth.ts, qui ne
 * bloque que les appels HTTP réels sur /sign-up/email.
 *
 * Le compte n'a pas besoin d'entreprise : requireAdminPlateforme() (src/lib/session.ts) n'exige qu'une
 * adresse listée dans ADMIN_PLATEFORME_EMAILS et confirmée, jamais entrepriseId.
 *
 * Usage (production, voir README) : NODE_ENV=production npm run admin:creer -- --email admin@creancio.tg --nom "Prénom Nom"
 * Le mot de passe est saisi au terminal, sans écho (jamais en argument, jamais dans l'historique du shell).
 * Ne dépend d'aucune devDependency : tsx et @next/env sont dans "dependencies" (installation `npm ci --omit=dev`).
 */
import { loadEnvConfig } from "@next/env";
import { createInterface } from "node:readline";
import { Writable } from "node:stream";

// Mêmes fichiers .env* que `next start` / `next dev`, sans écraser les variables déjà posées par l'hébergeur.
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

function lireArgument(nom: string): string | undefined {
  const args = process.argv.slice(2);
  const prefixe = `--${nom}=`;
  const parEgal = args.find((a) => a.startsWith(prefixe));
  if (parEgal) return parEgal.slice(prefixe.length);
  const index = args.indexOf(`--${nom}`);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

// Une seule interface pour toutes les questions ; pendant la saisie du mot de passe, l'écho est coupé.
let muet = false;
const sortie = new Writable({
  write(morceau, encodage, suite) {
    if (!muet) process.stdout.write(morceau, encodage);
    suite();
  },
});
const rl = createInterface({ input: process.stdin, output: sortie, terminal: process.stdin.isTTY === true });
rl.on("SIGINT", () => {
  process.stdout.write("\nInterrompu, aucun compte créé.\n");
  process.exit(130);
});
// L'itérateur garde les lignes reçues d'un bloc (collage, entrée redirigée) jusqu'à la question suivante.
const lignes = rl[Symbol.asyncIterator]();

async function demander(question: string, masque = false): Promise<string> {
  muet = false;
  rl.setPrompt(question);
  rl.prompt();
  muet = masque;
  const { value, done } = await lignes.next();
  muet = false;
  if (masque) process.stdout.write("\n");
  if (done) throw new Error("saisie interrompue, aucun compte créé.");
  return value;
}

async function main() {
  // Importés après le chargement du .env : la connexion à la base et Better Auth lisent leurs variables à l'import.
  const { erreursConfiguration } = await import("@/lib/configuration");
  const { choisirPilote } = await import("@/lib/email/pilote");

  const problemes = erreursConfiguration(process.env);
  if (problemes.length > 0) throw new Error(`configuration invalide, aucun compte créé :\n- ${problemes.join("\n- ")}`);
  const { pilote } = choisirPilote(process.env);
  console.log(`Environnement : ${process.env.NODE_ENV ?? "development"} · e-mails : ${pilote}` + (pilote === "console" ? " (l'e-mail s'affichera ici, il ne partira pas)" : ""));

  const email = (lireArgument("email") ?? (await demander("E-mail de l'administrateur : "))).trim().toLowerCase();
  const nom = (lireArgument("nom") ?? (await demander("Nom complet : "))).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("adresse e-mail invalide.");
  if (nom.length < 2) throw new Error("le nom doit faire au moins 2 caractères.");

  const motDePasse = await demander("Mot de passe (8 caractères au moins, non affiché) : ", true);
  if (motDePasse.length < 8 || motDePasse.length > 128) throw new Error("le mot de passe doit faire entre 8 et 128 caractères.");
  if ((await demander("Confirmez le mot de passe : ", true)) !== motDePasse) throw new Error("les deux mots de passe ne correspondent pas.");

  const { auth } = await import("@/lib/auth");
  const { db } = await import("@/lib/db");
  const { APIError } = await import("better-auth/api");
  try {
    // callbackURL : après le clic sur le lien de confirmation, l'administrateur arrive directement sur /admin/pilote.
    const resultat = await auth.api.signUpEmail({ body: { name: nom, email, password: motDePasse, callbackURL: "/admin/pilote" } });
    console.log(`\nCompte créé : ${resultat.user.email} (sans entreprise).`);
    console.log("Un e-mail de confirmation vient de partir. Listez cette adresse dans ADMIN_PLATEFORME_EMAILS et redémarrez l'application :");
    console.log("une fois l'adresse confirmée, /admin/pilote est accessible.");
  } catch (e) {
    if (e instanceof APIError) {
      const code = (e.body as { code?: string } | undefined)?.code ?? "";
      if (code.includes("USER_ALREADY_EXISTS")) throw new Error(`un compte existe déjà avec ${email}.`);
      throw new Error(e.body?.message ?? "le compte n'a pas pu être créé.");
    }
    throw e;
  } finally {
    await db.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(`\nErreur : ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
