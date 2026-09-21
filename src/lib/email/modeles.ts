import { COULEURS_EMAIL } from "./couleurs";
import type { Courriel } from "./index";

// E-mails en français : texte brut + HTML à styles en ligne (les clients de messagerie ignorent les variables CSS du design
// system). Les couleurs viennent de couleurs.ts. Le lien est aussi écrit en clair sous le bouton, pour les messageries qui
// n'affichent pas le bouton.

const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const prenomDe = (nom: string) => nom.trim().split(/\s+/)[0] || "";
const salut = (nom: string) => (prenomDe(nom) ? `Bonjour ${prenomDe(nom)},` : "Bonjour,");

const C = COULEURS_EMAIL;
const POLICE = "font-family:Arial,Helvetica,sans-serif;";
const paragraphe = (contenu: string, extra = "") => `<p style="${POLICE}font-size:16px;line-height:1.5;color:${C.texte};margin:0 0 16px;${extra}">${contenu}</p>`;

function assembler(a: string, sujet: string, nom: string, paragraphes: string[], lien?: { url: string; libelle: string }): Courriel {
  const texte = [salut(nom), ...paragraphes, ...(lien ? [`${lien.libelle} :\n${lien.url}`] : []), "L'équipe Créancio"].join("\n\n");
  const corps = [
    paragraphe(echapper(salut(nom))),
    ...paragraphes.map((p) => paragraphe(echapper(p))),
    ...(lien
      ? [
          `<p style="margin:0 0 24px;"><a href="${echapper(lien.url)}" style="${POLICE}display:inline-block;background-color:${C.bouton};color:${C.texteBouton};font-size:16px;font-weight:bold;text-decoration:none;padding:14px 24px;border-radius:8px;">${echapper(lien.libelle)}</a></p>`,
          paragraphe(`Si le bouton ne s'ouvre pas, copiez cette adresse dans votre navigateur :<br>${echapper(lien.url)}`, `font-size:14px;color:${C.texteDiscret};word-break:break-all;`),
        ]
      : []),
    paragraphe("L'équipe Créancio", `color:${C.texteDiscret};margin:0;`),
  ].join("\n");
  const html = `<!DOCTYPE html>
<html lang="fr"><body style="margin:0;padding:0;background-color:${C.fond};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${C.fond};"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:${C.carte};border:1px solid ${C.bordure};border-radius:12px;"><tr><td style="padding:24px;">
${corps}
</td></tr></table>
</td></tr></table>
</body></html>`;
  return { a, sujet, texte, html };
}

export function courrielReinitialisation(a: string, nom: string, url: string): Courriel {
  return assembler(a, "Réinitialiser votre mot de passe Créancio", nom, [
    "Vous avez demandé à changer votre mot de passe.",
    "Ce lien est valable 1 heure et ne peut servir qu'une fois.",
    "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe ne change pas.",
  ], { url, libelle: "Choisir un nouveau mot de passe" });
}

export function courrielMotDePasseModifie(a: string, nom: string): Courriel {
  return assembler(a, "Votre mot de passe Créancio a changé", nom, [
    "Le mot de passe de votre compte vient d'être modifié. Vous avez été déconnecté de tous vos appareils.",
    "Si ce n'est pas vous, demandez tout de suite un nouveau mot de passe depuis la page de connexion, et prévenez-nous.",
  ]);
}

export function courrielVerification(a: string, nom: string, url: string): Courriel {
  return assembler(a, "Confirmez votre adresse e-mail Créancio", nom, [
    "Confirmez que cette adresse e-mail est bien la vôtre. Elle vous permettra de retrouver votre compte si vous oubliez votre mot de passe.",
  ], { url, libelle: "Confirmer mon adresse e-mail" });
}
