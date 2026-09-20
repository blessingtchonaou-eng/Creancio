import { RechercheUrl } from "@/components/ui/recherche-url";

/** Recherche de clients : la liste se met à jour pendant la frappe. */
export function ClientSearch({ defaultValue }: { defaultValue: string }) {
  return <RechercheUrl defaultValue={defaultValue} placeholder="Nom ou numéro du client" />;
}
