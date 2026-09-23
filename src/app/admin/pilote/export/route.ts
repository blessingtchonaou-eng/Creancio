import { demandesAExporter, lireFiltre, versCsv } from "@/lib/admin-pilote";
import { toIsoDate } from "@/lib/format";
import { requireAdminPlateforme } from "@/lib/session";

/** Export CSV des demandes de pilote, filtre de statut respecté. Même contrôle d'accès que la page (anonyme → connexion, autre → 404). */
export async function GET(request: Request) {
  await requireAdminPlateforme();
  const statut = lireFiltre(new URL(request.url).searchParams.get("statut") ?? undefined);
  const csv = versCsv(await demandesAExporter(statut));
  const nom = `demandes-pilote-${statut ? `${statut.toLowerCase()}-` : ""}${toIsoDate(new Date())}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nom}"`,
      "Cache-Control": "no-store",
    },
  });
}
