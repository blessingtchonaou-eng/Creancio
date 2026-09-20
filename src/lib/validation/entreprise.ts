import { z } from "zod";
import { normalizeTogoPhone } from "@/lib/phone";
import { nifSchema } from "./nif";

export const entrepriseSchema = z.object({
  raisonSociale: z.string().trim().min(2, "Saisissez le nom de votre entreprise.").max(120, "Ce nom est trop long."),
  nif: nifSchema,
  // Facultatif : les relances partent du compte WhatsApp Business, pas de ce numéro.
  telephone: z.string().transform((v, ctx) => {
    if (v.trim() === "") return null;
    const r = normalizeTogoPhone(v);
    if (!r.ok) {
      ctx.addIssue({ code: "custom", message: r.error });
      return z.NEVER;
    }
    return r.e164;
  }),
});
