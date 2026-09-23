import { Banknote, LayoutDashboard, MessageCircle, PencilLine, Upload, Users, type LucideIcon } from "lucide-react";
import { landing } from "@/content/landing";
import { cn } from "@/lib/cn";
import { Adaptatif, CONTENEUR, EnPreparation, Surtitre, TitreSection } from "./commun";

export function Probleme() {
  const p = landing.probleme;
  return (
    <section className="bg-inverse text-on-inverse">
      <div className={`${CONTENEUR} py-10 md:py-16`}>
        <h2 className="max-w-[760px] font-display text-[1.75rem] leading-[1.2] font-medium md:text-[2.25rem]">
          {p.titre} <span className="text-mustard">{p.titreSuite}</span>
        </h2>
        <div className="mt-5.5 grid gap-5.5 md:mt-9 md:grid-cols-3 md:gap-8">
          {p.points.map((point) => (
            <div key={point.titre} className="border-t-2 border-mustard pt-3.5 md:pt-4.5">
              <h3 className="text-[1.0625rem] font-semibold md:text-lg">{point.titre}</h3>
              <p className="mt-1.5 text-body leading-[1.55] text-on-inverse/75 md:mt-2">
                <Adaptatif texte={point.texte} court={"court" in point ? point.court : undefined} />
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Couleurs des pastilles du calendrier, dans l'ordre de la maquette : le ton monte avec le retard.
const PASTILLES = ["bg-surface-muted text-ink", "bg-surface-muted text-ink", "bg-mustard text-ink", "bg-inverse text-on-inverse"];

export function CommentCaMarche() {
  const c = landing.commentCaMarche;
  return (
    <section id="comment-ca-marche" className={`${CONTENEUR} flex flex-col gap-4 pt-12 pb-8 md:gap-10 md:pt-22 md:pb-18`}>
      <div className="max-w-[680px]">
        <Surtitre>{c.surtitre}</Surtitre>
        <TitreSection className="mt-2">{c.titre}</TitreSection>
      </div>
      <ol className="grid gap-4 md:grid-cols-2 md:gap-4.5 lg:grid-cols-4">
        {c.etapes.map((etape, i) => (
          <li
            key={etape.titre}
            className={cn("rounded-[18px] border bg-surface p-4.5 md:rounded-[20px] md:p-6", i === 0 ? "border-2 border-primary" : "border-border")}
          >
            <div className="flex items-center gap-3.5 md:block">
              <span
                aria-hidden
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full font-display text-lg md:size-11 md:text-xl",
                  i === 0 ? "bg-primary text-on-primary" : "bg-primary/10 text-primary-strong",
                )}
              >
                {i + 1}
              </span>
              <h3 className="text-[1.0625rem] font-semibold md:mt-4.5 md:text-lg">{etape.titre}</h3>
            </div>
            <p className="mt-2.5 text-body leading-[1.55] text-ink-muted md:mt-2">
              <Adaptatif texte={etape.texte} court={"court" in etape ? etape.court : undefined} />
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 md:mt-3.5">
              <span className="text-[0.8125rem] font-semibold text-primary">{etape.badge}</span>
              <EnPreparation livraison={etape.livraison} />
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-3 rounded-[18px] border border-border bg-surface p-4.5 md:flex-row md:flex-wrap md:items-center md:gap-3.5 md:px-5.5">
        <div className="flex flex-wrap items-center gap-2 md:mr-2">
          <h3 className="text-body font-semibold">{c.calendrier.titre}</h3>
          <EnPreparation livraison={c.calendrier.livraison} />
        </div>
        <ul className="flex flex-col gap-3 md:flex-row md:flex-wrap md:gap-3.5">
          {c.calendrier.etapes.map((etape, i) => (
            <li key={etape.jour} className="flex items-center gap-3 text-body md:gap-2.5 md:text-body-sm">
              <span className={cn("inline-flex h-8 min-w-13 items-center justify-center rounded-full px-2 text-[0.8125rem] font-semibold md:h-7.5 md:min-w-11.5", PASTILLES[i])}>
                {etape.jour}
              </span>
              {etape.libelle}
            </li>
          ))}
        </ul>
        <p className="text-[0.8125rem] text-ink-muted md:ml-auto md:text-body-sm">{c.calendrier.note}</p>
      </div>
    </section>
  );
}

const ICONES: Record<(typeof landing.fonctionnalites.elements)[number]["icone"], LucideIcon> = {
  tableau: LayoutDashboard,
  import: Upload,
  whatsapp: MessageCircle,
  paiement: Banknote,
  manuel: PencilLine,
  equipe: Users,
};

export function Fonctionnalites() {
  const f = landing.fonctionnalites;
  return (
    <section id="fonctionnalites" className={`${CONTENEUR} flex flex-col gap-3.5 pt-8 pb-12 md:gap-9 md:pb-22`}>
      <div className="max-w-[720px]">
        <Surtitre>{f.surtitre}</Surtitre>
        <TitreSection className="mt-2">{f.titre}</TitreSection>
      </div>
      <ul className="grid gap-3.5 md:grid-cols-2 md:gap-4.5 lg:grid-cols-3">
        {f.elements.map((el) => {
          const Icone = ICONES[el.icone];
          return (
            <li key={el.titre} className="flex gap-3.5 rounded-[18px] border border-border bg-surface p-4.5 md:block md:rounded-[20px] md:p-6.5">
              <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary-strong">
                <Icone className="size-5" />
              </span>
              <div>
                <h3 className="text-[1.0625rem] font-semibold md:mt-4.5 md:text-[1.1875rem]">
                  <Adaptatif texte={el.titre} court={"titreCourt" in el ? el.titreCourt : undefined} />
                </h3>
                <p className="mt-1.5 text-body leading-normal text-ink-muted md:mt-2 md:leading-[1.55]">
                  <Adaptatif texte={el.texte} court={el.court} />
                </p>
                {el.livraison === "a-venir" && (
                  <p className="mt-2.5">
                    <EnPreparation livraison={el.livraison} />
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Confiance() {
  const c = landing.confiance;
  return (
    <section id="securite" className="border-y border-border bg-surface">
      <div className={`${CONTENEUR} flex flex-col gap-6 py-12 md:py-22 lg:flex-row lg:gap-16`}>
        <div className="lg:flex-[0.9]">
          <Surtitre>{c.surtitre}</Surtitre>
          <TitreSection className="mt-2">{c.titre}</TitreSection>
          <p className="mt-4.5 text-[1.0625rem] leading-[1.6] text-ink-muted">{c.texte}</p>
        </div>
        <ul className="flex flex-col gap-3.5 lg:flex-[1.1]">
          {c.engagements.map((e) => (
            <li key={e.titre} className="flex gap-4 rounded-2xl border border-border bg-bg px-5 py-4.5">
              <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-on-primary">
                ✓
              </span>
              <div>
                <h3 className="text-[1.0625rem] font-semibold">{e.titre}</h3>
                <p className="mt-1 text-body leading-[1.55] text-ink-muted">
                  <Adaptatif texte={e.texte} court={e.court} />
                </p>
                {e.livraison === "a-venir" && (
                  <p className="mt-2">
                    <EnPreparation livraison={e.livraison} />
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Questions() {
  const q = landing.questions;
  return (
    <section id="questions" className={`${CONTENEUR} flex flex-col gap-4 py-12 md:py-22 lg:flex-row lg:gap-16`}>
      <div className="lg:flex-[0.7]">
        <Surtitre>{q.surtitre}</Surtitre>
        <TitreSection className="mt-2">{q.titre}</TitreSection>
      </div>
      <div className="flex flex-col lg:flex-[1.3]">
        {q.elements.map((el) => (
          <details key={el.question} className="group border-b border-border py-3 md:py-5">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-[1.0625rem] font-semibold md:text-lg [&::-webkit-details-marker]:hidden">
              <span aria-hidden className="text-body-sm transition-transform group-open:rotate-90">
                ▸
              </span>
              <Adaptatif texte={el.question} court={"questionCourte" in el ? el.questionCourte : undefined} />
            </summary>
            <p className="mt-2.5 text-body leading-[1.6] text-ink-muted">{el.reponse}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
