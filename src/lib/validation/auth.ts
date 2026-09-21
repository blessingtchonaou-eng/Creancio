import { z } from "zod";

export const signUpSchema = z.object({
  nom: z.string().trim().min(2, "Saisissez votre nom.").max(100, "Ce nom est trop long."),
  email: z.string().trim().toLowerCase().pipe(z.email("Saisissez une adresse e-mail valide, par exemple nom@exemple.com.")),
  password: z.string().min(8, "Choisissez un mot de passe d'au moins 8 caractères.").max(128, "Ce mot de passe est trop long."),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Saisissez votre adresse e-mail.")),
  password: z.string().min(1, "Saisissez votre mot de passe."),
});

export const demandeReinitialisationSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Saisissez une adresse e-mail valide, par exemple nom@exemple.com.")),
});

export const nouveauMotDePasseSchema = z.object({
  token: z.string().min(1).max(200),
  password: z.string().min(8, "Choisissez un mot de passe d'au moins 8 caractères.").max(128, "Ce mot de passe est trop long."),
});
