import Link from "next/link";
import { landing } from "@/content/landing";
import { lienWhatsApp } from "@/lib/whatsapp";
import { CONTENEUR } from "./commun";

export function SiteFooter() {
  const p = landing.piedDePage;
  // L'e-mail et le numéro ne s'affichent que s'ils sont renseignés dans landing.ts (jamais de « [VOTRE E-MAIL] » en ligne).
  const avantNumero = [p.lieu, p.email].filter(Boolean).join(" · ");
  // Le numéro reste affiché au format lisible ; le lien n'utilise que les chiffres, revérifiés par lienWhatsApp.
  const lienNumero = p.telephone ? lienWhatsApp(p.telephone.replace(/\s/g, ""), p.messageWhatsApp) : null;
  return (
    <footer className={`${CONTENEUR} mt-auto flex flex-col gap-2 py-8 text-body-sm text-ink-muted md:flex-row md:items-center md:justify-between md:py-10`}>
      <span className="font-display text-lg text-ink">Créancio</span>
      <span>
        {avantNumero}
        {p.telephone && (
          <>
            {avantNumero && " · "}
            {lienNumero ? (
              <a
                href={lienNumero}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Écrire sur WhatsApp au ${p.telephone}`}
                className="inline-flex min-h-11 items-center whitespace-nowrap text-ink-muted underline underline-offset-2 hover:text-ink"
              >
                {p.telephone}
              </a>
            ) : (
              p.telephone
            )}
          </>
        )}
      </span>
      <nav aria-label="Informations légales" className="flex gap-5">
        {p.liens.map((lien) => (
          <Link key={lien.href} href={lien.href} className="flex min-h-11 items-center text-ink-muted underline underline-offset-2 hover:text-ink">
            {lien.libelle}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
