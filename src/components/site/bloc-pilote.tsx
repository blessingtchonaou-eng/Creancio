import { landing } from "@/content/landing";
import { CHAMP_PIEGE, creerJetonFormulaire, SUCCES_PILOTE } from "@/lib/pilote";
import { Adaptatif } from "./commun";
import { FormulairePilote } from "./formulaire-pilote";

export function BlocPilote() {
  const p = landing.pilote;
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 md:px-16">
      <section
        id="pilote"
        className="relative flex scroll-mt-4 flex-col gap-6 rounded-[24px] bg-primary px-5 py-8 text-on-primary md:rounded-[28px] md:p-16 lg:flex-row lg:items-center lg:gap-12"
      >
        <div className="lg:flex-1">
          <h2 className="font-display text-[2rem] leading-[1.08] font-medium md:text-[2.875rem] md:tracking-[-0.8px]">{p.titre}</h2>
          <p className="mt-4 text-[1.0625rem] leading-[1.6] text-on-primary/85">
            <Adaptatif texte={p.texte} court={p.court} />
          </p>
        </div>
        <div className="w-full shrink-0 rounded-[20px] bg-surface p-5 text-ink md:p-6 lg:w-[420px]">
          <FormulairePilote jeton={creerJetonFormulaire()} champPiege={CHAMP_PIEGE} succes={SUCCES_PILOTE} />
        </div>
      </section>
    </div>
  );
}
