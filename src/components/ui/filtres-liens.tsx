import Link from "next/link";
import { cn } from "@/lib/cn";

export interface FiltreLien {
  href: string;
  label: string;
  glyph?: string;
  count?: number;
  active: boolean;
}

/**
 * Puces de filtre en liens : le serveur affiche la liste filtrée, sans JavaScript. La puce active est pleine.
 * Même aspect que <FilterChips>, qui filtre une liste déjà chargée dans le navigateur.
 */
export function FiltresLiens({ filtres, label }: { filtres: FiltreLien[]; label: string }) {
  return (
    <nav aria-label={label}>
      <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {filtres.map((f) => (
          <li key={f.label} className="shrink-0">
            <Link
              href={f.href}
              aria-current={f.active ? "true" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 text-body-sm font-medium transition-colors",
                f.active ? "border-inverse bg-inverse text-on-inverse" : "border-border-strong bg-surface text-ink hover:bg-surface-muted",
              )}
            >
              {f.glyph && <span aria-hidden>{f.glyph}&nbsp;</span>}
              {f.label}
              {f.count !== undefined && <span className="tabular">&nbsp;· {f.count}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
