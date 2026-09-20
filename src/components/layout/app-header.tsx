"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Upload } from "lucide-react";
import { deconnexion } from "@/app/(auth)/actions";
import { cn } from "@/lib/cn";
import { Logo } from "./logo";
import { NAV_ITEMS } from "./nav-items";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
}

export function AppHeader({ userName, companyName }: { userName: string; companyName: string }) {
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
        <span
          className="flex size-10 items-center justify-center rounded-full bg-success text-body-sm font-semibold text-on-primary"
          title={`${userName} · ${companyName}`}
          aria-label={`Connecté : ${userName}, ${companyName}`}
        >
          {initials(userName)}
        </span>
        <form action={deconnexion}>
          <button
            type="submit"
            aria-label="Se déconnecter"
            title="Se déconnecter"
            className="flex size-11 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
          >
            <LogOut className="size-5" aria-hidden />
          </button>
        </form>
      </div>
    </header>
  );
}
