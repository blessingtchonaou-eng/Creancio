import { buttonClasses } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { landing } from "@/content/landing";
import { formatAmount, formatFCFA } from "@/lib/format";
import { Adaptatif, CONTENEUR } from "./commun";

export function Accroche() {
  const a = landing.accroche;
  return (
    <section className={`${CONTENEUR} flex flex-col gap-10 pt-5 pb-9 xl:flex-row xl:items-center xl:gap-14 xl:pt-12 xl:pb-20`}>
      <div className="flex flex-col gap-5 md:gap-6 xl:flex-[1.05]">
        <p className="self-start rounded-full bg-st-reminding-bg px-3 py-1.5 text-[0.8125rem] font-semibold text-st-reminding-fg md:px-3.5 md:py-2 md:text-body-sm">
          {a.surtitre}
        </p>
        <h1 className="font-display text-[2.5rem] leading-[1.06] font-medium tracking-[-0.8px] md:text-[4rem] md:leading-[1.04] md:tracking-[-1.6px]">
          {a.titre} <span className="text-primary">{a.titreSuite}</span>
        </h1>
        <p className="max-w-[540px] text-[1.0625rem] leading-[1.55] text-ink-muted md:text-[1.1875rem]">
          <Adaptatif texte={a.texte} court={a.court} />
        </p>
        <div className="flex flex-col gap-3 sm:flex-row md:mt-1">
          <a href="#pilote" className={buttonClasses("primary", "lg")}>
            {a.boutonPrincipal}
          </a>
          <a href="#comment-ca-marche" className={buttonClasses("secondary", "lg")}>
            {a.boutonSecondaire}
          </a>
        </div>
        <ul className="hidden flex-wrap gap-x-5.5 gap-y-1 text-body-sm text-ink-muted md:flex">
          {a.atouts.map((atout) => (
            <li key={atout}>
              <span aria-hidden>✓ </span>
              {atout}
            </li>
          ))}
        </ul>
      </div>
      <Apercu />
    </section>
  );
}

/**
 * Aperçu du produit en HTML/CSS (aucune image). Données fictives, annoncées par la légende : l'illustration est masquée aux
 * lecteurs d'écran, la légende ne l'est pas.
 */
function Apercu() {
  const p = landing.apercu;
  const bulle = (
    <div className="rounded-[20px] bg-surface-muted p-3.5 shadow-float">
      <p className="mb-2 text-[0.6875rem] font-semibold text-ink-muted">WhatsApp</p>
      <div className="rounded-[4px_14px_14px_14px] bg-surface px-3.25 py-3 text-[0.8125rem] leading-normal md:text-body-sm xl:text-[0.8125rem]">
        <p className="font-semibold">{p.whatsapp.expediteur}</p>
        <p>{p.whatsapp.message}</p>
        <p className="mt-0.75 text-right text-[0.625rem] text-ink-muted">{p.whatsapp.heure} ✓✓</p>
        <p className="-mx-3.25 mt-1.5 -mb-0.5 border-t border-border pt-2 text-center font-semibold text-info">↗ {p.whatsapp.bouton}</p>
      </div>
    </div>
  );
  const notification = (court: boolean) => (
    <div className="flex items-start gap-3 rounded-2xl border-l-4 border-success bg-surface px-4 py-3.5 text-[0.8125rem] leading-[1.45] shadow-float">
      <span className="font-bold text-success">✓</span>
      <div>
        <p className="font-semibold">{p.notification.titre}</p>
        <p>{court ? p.notification.court : p.notification.texte}</p>
      </div>
    </div>
  );

  return (
    <figure className="w-full max-w-md xl:max-w-none xl:flex-1">
      {/* Bureau : tableau de bord, bulle WhatsApp et notification superposés. */}
      <div aria-hidden className="relative hidden h-[520px] xl:block">
        <div className="absolute top-5 left-0 w-[440px] rounded-[22px] border border-border bg-surface p-5.5 shadow-float">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[0.8125rem] text-ink-muted">{p.salutation}</p>
            <span className="rounded-full bg-st-reminding-bg px-2.5 py-0.5 text-caption font-semibold text-st-reminding-fg">{p.etiquette}</span>
          </div>
          <p className="mt-1 font-display text-[1.875rem] leading-[1.15]">
            {p.attendu.libelle} <span className="text-primary">{formatFCFA(p.attendu.montant)}</span>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-[14px] border border-border p-3">
              <p className="text-caption text-ink-muted">{p.retard.libelle}</p>
              <p className="mt-1 font-display text-xl">{formatAmount(p.retard.montant)}</p>
              <p className="text-caption text-danger">{p.retard.detail}</p>
            </div>
            <div className="rounded-[14px] border border-border p-3">
              <p className="text-caption text-ink-muted">{p.delai.libelle}</p>
              <p className="mt-1 font-display text-xl">{p.delai.valeur}</p>
              <p className="text-caption text-success">{p.delai.detail}</p>
            </div>
          </div>
          <ul className="mt-3.5 flex flex-col gap-2">
            {p.factures.map((f) => (
              <li key={f.client} className="flex items-center justify-between text-[0.8125rem]">
                <span className="font-semibold">{f.client}</span>
                <StatusBadge status={f.statut} />
              </li>
            ))}
          </ul>
        </div>
        <div className="absolute top-[190px] right-0 w-[300px]">{bulle}</div>
        <div className="absolute bottom-0 left-15 w-[330px]">{notification(false)}</div>
      </div>
      {/* Téléphone et tablette : la bulle WhatsApp et la notification, comme la maquette mobile. */}
      <div aria-hidden className="flex flex-col gap-2.5 xl:hidden">
        <div className="flex justify-end">
          <span className="rounded-full bg-st-reminding-bg px-2.5 py-0.5 text-caption font-semibold text-st-reminding-fg">{p.etiquette}</span>
        </div>
        {bulle}
        {notification(true)}
      </div>
      <figcaption className="mt-3 text-caption text-ink-muted xl:mt-4">{p.legende}</figcaption>
    </figure>
  );
}
