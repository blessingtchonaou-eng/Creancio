import type { Metadata } from "next";
import { DemandePiloteForm } from "@/components/admin/demande-pilote-form";
import { InvitationPilote } from "@/components/admin/invitation-pilote";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { FiltresLiens } from "@/components/ui/filtres-liens";
import { Pagination } from "@/components/ui/pagination";
import { compterDemandes, lireFiltre, listerDemandes, TAILLE_PAGE } from "@/lib/admin-pilote";
import { formatDate, toIsoDate } from "@/lib/format";
import { formatTogoPhone } from "@/lib/phone";
import { requireAdminPlateforme } from "@/lib/session";
import { LIBELLES_STATUT, LIBELLES_VOLUME, STATUTS_DEMANDE } from "@/lib/statuts-pilote";
import { lienWhatsApp } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Demandes de pilote", robots: { index: false, follow: false } };

const PLURIELS: Record<(typeof STATUTS_DEMANDE)[number], string> = {
  NOUVELLE: "Nouvelles",
  CONTACTEE: "Contactées",
  INSCRITE: "Inscrites",
  ABANDONNEE: "Abandonnées",
  SUSPECTE: "Suspectes",
};

// Tout texte venant d'un visiteur (entreprise, contact) ou de la note est rendu comme texte par React, donc échappé :
// aucune donnée de demande ne passe par dangerouslySetInnerHTML ni par un attribut href construit à partir de la saisie.
export default async function AdminPilotePage({ searchParams }: { searchParams: Promise<{ statut?: string; page?: string }> }) {
  await requireAdminPlateforme();
  const params = await searchParams;
  const statut = lireFiltre(params.statut);
  const { toutes, parStatut } = await compterDemandes();
  const total = statut ? parStatut[statut] : toutes;
  const nbPages = Math.max(1, Math.ceil(total / TAILLE_PAGE));
  const page = Math.min(Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1), nbPages);
  const demandes = await listerDemandes(statut, page);

  const adresse = (s: string | null, p = 1) => {
    const q = new URLSearchParams();
    if (s) q.set("statut", s);
    if (p > 1) q.set("page", String(p));
    const texte = q.toString();
    return texte ? `/admin/pilote?${texte}` : "/admin/pilote";
  };
  const filtres = [
    { href: adresse(null), label: "Toutes", count: toutes, active: statut === null },
    ...STATUTS_DEMANDE.map((s) => ({ href: adresse(s), label: PLURIELS[s], count: parStatut[s], active: statut === s })),
  ];
  const exportHref = statut ? `/admin/pilote/export?statut=${statut}` : "/admin/pilote/export";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-h1 font-medium">Demandes de pilote</h1>
        {/* Lien simple (pas de préchargement) : le fichier se télécharge. */}
        <a href={exportHref} className={buttonClasses("secondary", "md")}>
          Exporter {total} demande{total > 1 ? "s" : ""} (CSV)
        </a>
      </div>
      <FiltresLiens filtres={filtres} label="Filtrer les demandes par statut" />
      <p className="text-body-sm text-ink-muted">
        « Toutes » n&apos;inclut pas les demandes suspectes ({parStatut.SUSPECTE}) : envois en rafale ou trop rapides, à vérifier avant de
        répondre.
      </p>

      {demandes.length === 0 ? (
        <Card>
          <EmptyState title={statut ? `Aucune demande « ${LIBELLES_STATUT[statut]} »` : "Aucune demande de pilote pour l'instant"}>
            {statut ? "Choisissez un autre filtre pour voir les autres demandes." : "Les demandes envoyées depuis la page d'accueil apparaîtront ici."}
          </EmptyState>
        </Card>
      ) : (
        <ul className="flex flex-col gap-4">
          {demandes.map((d) => {
            const wa = lienWhatsApp(d.whatsapp);
            return (
              <li key={d.id}>
                <Card className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold break-words">{d.nomEntreprise}</p>
                    <span className="text-body-sm font-semibold text-ink-muted">{LIBELLES_STATUT[d.statut]}</span>
                  </div>
                  {d.nomContact && <p className="text-body-sm break-words">Contact : {d.nomContact}</p>}
                  <p className="text-body-sm text-ink-muted">
                    {formatTogoPhone(d.whatsapp)} · {d.ville}
                    {d.facturesParMois && ` · ${LIBELLES_VOLUME[d.facturesParMois]}`}
                  </p>
                  <p className="text-body-sm text-ink-muted">
                    Reçue le {formatDate(toIsoDate(d.createdAt))}
                    {d.consentementVersion &&
                      ` · consentement ${d.consentementVersion}${d.consentementLe ? ` le ${formatDate(toIsoDate(d.consentementLe))}` : ""}`}
                  </p>
                  {d.note && <p className="text-body-sm break-words whitespace-pre-line">{d.note}</p>}
                  <div className="flex flex-wrap items-center gap-3">
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClasses("secondary", "md")}>
                        Ouvrir dans WhatsApp
                      </a>
                    )}
                    {(d.statut === "NOUVELLE" || d.statut === "CONTACTEE") && <InvitationPilote demandePiloteId={d.id} whatsapp={d.whatsapp} />}
                  </div>
                  <DemandePiloteForm demandePiloteId={d.id} statut={d.statut} note={d.note} />
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} nbPages={nbPages} hrefPour={(p) => adresse(statut, p)} />
    </div>
  );
}
