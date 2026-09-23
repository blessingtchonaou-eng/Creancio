import { landing } from "@/content/landing";

/** Page légale provisoire : bandeau « à compléter » et paragraphes de landing.ts, sans aucune affirmation juridique. */
export function PageLegale({ titre, paragraphes }: { titre: string; paragraphes: readonly string[] }) {
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 py-8 md:px-16 md:py-12">
      <h1 className="font-display text-h1 font-medium">{titre}</h1>
      <p role="note" className="rounded-md bg-st-reminding-bg px-4 py-3 text-body-sm font-semibold text-st-reminding-fg">
        {landing.legal.bandeau}
      </p>
      {paragraphes.map((p) => (
        <p key={p} className="text-body leading-[1.6] text-ink">
          {p}
        </p>
      ))}
    </article>
  );
}
