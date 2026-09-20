import { z } from "zod";
import { normalizeTogoPhone } from "@/lib/phone";

export const entrepriseSchema = z.object({
  raisonSociale: z.string().trim().min(2, "Saisissez le nom de votre entreprise.").max(120, "Ce nom est trop long."),
  nif: z
    .string()
    .trim()
    .max(30, "Ce NIF est trop long.")
    .regex(/^[A-Za-z0-9-]*$/, "Le NIF ne contient que des chiffres et des lettres.")
    .transform((v) => (v === "" ? null : v)),
  telephone: z.string().transform((v, ctx) => {
    const r = normalizeTogoPhone(v);
    if (!r.ok) {
      ctx.addIssue({ code: "custom", message: r.error });
      return z.NEVER;
    }
    return r.e164;
  }),
});
