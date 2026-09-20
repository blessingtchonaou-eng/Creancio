import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";

/**
 * Better Auth : e-mail + mot de passe (haché en scrypt), sessions en base, cookie httpOnly sécurisé en production.
 * Pas de cache de session dans le cookie : le rôle et l'entreprise sont relus en base à chaque requête,
 * un changement de rôle ou de rattachement s'applique donc tout de suite.
 */
export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128, autoSignIn: true },
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
    },
  },
  plugins: [nextCookies()],
});
