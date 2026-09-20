"use client";

import { useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchInput } from "@/components/ui/search-input";

/**
 * Recherche d'une liste : l'écran se met à jour pendant la frappe (paramètre `q` de l'adresse).
 * Les autres paramètres (filtre, tri) sont gardés, la page revient à la première. Sans JavaScript, la touche Entrée envoie le formulaire.
 */
export function RechercheUrl({ defaultValue, placeholder }: { defaultValue: string; placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const parametres = useSearchParams();
  const minuteur = useRef<ReturnType<typeof setTimeout>>(undefined);

  function chercher(valeur: string) {
    clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => {
      const suivants = new URLSearchParams(parametres);
      suivants.delete("page");
      const q = valeur.trim();
      if (q) suivants.set("q", q);
      else suivants.delete("q");
      const texte = suivants.toString();
      router.replace(texte ? `${pathname}?${texte}` : pathname);
    }, 300);
  }

  const autres = [...parametres.entries()].filter(([cle]) => cle !== "q" && cle !== "page");

  return (
    <form role="search" action={pathname}>
      {autres.map(([cle, valeur]) => (
        <input key={cle} type="hidden" name={cle} value={valeur} />
      ))}
      <SearchInput name="q" defaultValue={defaultValue} placeholder={placeholder} autoComplete="off" onChange={(e) => chercher(e.target.value)} />
    </form>
  );
}
