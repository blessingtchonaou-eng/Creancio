import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { envoyerSansEchec, preparerReinitialisation, preparerVerification } from "@/lib/auth-courriels";
import { courrielMotDePasseModifie } from "@/lib/email/modeles";

/**
 * Better Auth : e-mail + mot de passe (haché en scrypt), sessions en base, cookie httpOnly sécurisé en production.
 * Pas de cache de session dans le cookie : le rôle et l'entreprise sont relus en base à chaque requête,
 * un changement de rôle ou de rattachement s'applique donc tout de suite.
 */
export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    // Mot de passe oublié : lien à usage unique (consommé à l'utilisation), valable 1 heure.
    resetPasswordTokenExpiresIn: 60 * 60,
    // Après une réinitialisation, toutes les sessions de l'utilisateur sont fermées (un pirate déjà connecté est expulsé).
    revokeSessionsOnPasswordReset: true,
    // Pas d'await : l'envoi part en arrière-plan, la réponse ne révèle pas (par sa durée) si le compte existe.
    sendResetPassword: async (data) => {
      const courriel = await preparerReinitialisation(data);
      if (courriel) void envoyerSansEchec(courriel);
    },
    onPasswordReset: async ({ user }) => {
      void envoyerSansEchec(courrielMotDePasseModifie(user.email, user.name));
    },
  },
  // Confirmation de l'adresse : e-mail envoyé à l'inscription, mais l'accès n'est pas bloqué (un bandeau le rappelle).
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async (data) => {
      const courriel = await preparerVerification(data);
      if (courriel) void envoyerSansEchec(courriel);
    },
  },
  user: {
    modelName: "utilisateur",
    fields: { name: "nom" },
    additionalFields: {
      // input: false → jamais modifiable depuis le navigateur. Seul le serveur attribue le rôle et l'entreprise.
      role: { type: "string", required: false, defaultValue: "COLLABORATEUR", input: false },
      entrepriseId: { type: "string", required: false, input: false },
    },
  },
  session: { modelName: "session", expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
  account: { modelName: "compte" },
  verification: { modelName: "verification" },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      // Mot de passe oublié : par adresse IP. La limite par adresse e-mail est dans traiterDemandeReinitialisation.
      "/request-password-reset": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 10 },
      "/send-verification-email": { window: 60, max: 3 },
    },
  },
  plugins: [nextCookies()],
});
