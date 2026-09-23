import { z } from "zod";
import { landing } from "@/content/landing";
import { normalizeTogoPhone } from "@/lib/phone";

const e = landing.pilote.erreurs;

export const VOLUMES_FACTURES = ["MOINS_DE_20", "DE_20_A_100", "PLUS_DE_100"] as const;

/** Espaces multiples, sauts de ligne et caractères de contrôle ramenés à une seule espace : un nom tient sur une ligne. */
const uneLigne = (v: string) => v.replace(/[\u0000-\u001F\u007F\s]+/g, " ").trim();

export const demandePiloteSchema = z.object({
  nomEntreprise: z
    .string({ message: e.nomEntrepriseVide })
    .transform(uneLigne)
    .pipe(z.string().min(2, e.nomEntrepriseVide).max(120, e.nomEntrepriseLong)),
  // Toujours enregistré au format E.164 : c'est ce numéro, jamais la saisie brute, qui sert ensuite au lien wa.me.
  whatsapp: z.string({ message: e.whatsapp }).transform((v, ctx) => {
    const r = normalizeTogoPhone(v);
    if (!r.ok) {
      ctx.addIssue({ code: "custom", message: e.whatsapp });
      return z.NEVER;
    }
    return r.e164;
  }),
  facturesParMois: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.enum(VOLUMES_FACTURES, { message: e.facturesParMois }).optional()),
  consentement: z.literal("oui", { message: e.consentement }),
});

export type DemandePiloteValide = z.infer<typeof demandePiloteSchema>;
