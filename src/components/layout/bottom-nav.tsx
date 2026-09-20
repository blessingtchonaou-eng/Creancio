"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_ITEMS } from "./nav-items";

/** Navigation mobile, fixée en bas pour être atteinte au pouce. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium", active ? "text-primary" : "text-ink-muted")}
          >
            <Icon className="size-5" aria-hidden />
            {label === "Tableau de bord" ? "Accueil" : label}
          </Link>
        );
      })}
    </nav>
  );
}
