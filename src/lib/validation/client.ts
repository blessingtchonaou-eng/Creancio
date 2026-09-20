import { z } from "zod";
import { normalizeTogoPhone } from "@/lib/phone";

/** Client d'une entreprise : nom, numéro WhatsApp (stocké en E.164) et e-mail facultatif. */
export const clientSchema = z.object({
  nom: z.string().trim().min(2, "Saisissez le nom du client.").max(120, "Ce nom est trop long."),
  whatsapp: z.string().transform((v, ctx) => {
    const r = normalizeTogoPhone(v);
    if (!r.ok) {
      ctx.addIssue({ code: "custom", message: r.error });
      return z.NEVER;
    }
    return r.e164;
  }),
  email: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.email("Cette adresse e-mail n'est pas valide. Vérifiez-la ou laissez le champ vide.").nullable()),
});
