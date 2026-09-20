"use client";

import { useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { SearchInput } from "@/components/ui/search-input";

/** Recherche de clients : la liste se met à jour pendant la frappe. Sans JavaScript, la touche Entrée envoie le formulaire. */
export function ClientSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const minuteur = useRef<ReturnType<typeof setTimeout>>(undefined);

  function chercher(valeur: string) {
    clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => {
      const q = valeur.trim();
      router.replace(q ? `${pathname}?q=${encodeURIComponent(q)}` : pathname);
    }, 300);
  }

  return (
    <form role="search" action={pathname}>
      <SearchInput name="q" defaultValue={defaultValue} placeholder="Nom ou numéro du client" autoComplete="off" onChange={(e) => chercher(e.target.value)} />
    </form>
  );
}
