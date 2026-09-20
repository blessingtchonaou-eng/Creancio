"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { NAV_ITEMS } from "./nav-items";

export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="flex items-center justify-between gap-4">
      <Link href="/tableau-de-bord" aria-label="Créancio, tableau de bord">
        <Logo />
      </Link>

      <nav aria-label="Navigation principale" className="hidden gap-1 rounded-full bg-surface-muted p-1 lg:flex">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full px-4.5 py-2.5 text-body-sm transition-colors",
                active ? "bg-inverse font-medium text-on-inverse" : "text-ink hover:bg-surface",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <Link
          href="/factures/import"
          className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-3.5 text-body-sm font-semibold text-on-primary hover:bg-primary-strong sm:px-4.5"
        >
          <Upload className="size-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">Importer des factures</span>
        </Link>
        <span className="flex size-10 items-center justify-center rounded-full bg-success text-body-sm font-semibold text-on-primary" aria-label="Compte de James">
          JA
        </span>
      </div>
    </header>
  );
}
