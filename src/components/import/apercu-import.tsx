"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { importer, reanalyser } from "@/app/(app)/factures/import/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState, Toast } from "@/components/ui/feedback";
import { FilterChips, type ChipOption } from "@/components/ui/filter-chips";
import { Pagination } from "@/components/ui/pagination";
import { resumerComptes, type Analyse } from "@/lib/import/analyse";
import type { Colonne } from "@/lib/import/colonnes";
import type { ResultatImport } from "@/lib/import/serveur";
import type { Lecture, LigneBrute } from "@/lib/import/types";
import { LigneImport } from "./ligne-import";

const PAR_PAGE = 25;
type Filtre = "toutes" | "a_corriger" | "pretes" | "deja";

const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

/** Lignes à corriger en haut, puis les prêtes, puis les déjà importées. Calculé au chargement, pas à chaque frappe : une ligne qu'on corrige ne saute pas. */
function calculerOrdre(analyse: Analyse): number[] {
  const rang = { erreur: 0, a_choisir: 0, prete: 1, deja_importee: 2 } as const;
  return [...analyse.lignes].sort((a, b) => rang[a.statut] - rang[b.statut] || a.ligne - b.ligne).map((l) => l.ligne);
}

function messageResultat(r: ResultatImport): string {
  const ajoutees = r.importees === 0 ? "Aucune facture ajoutée" : pluriel(r.importees, "facture ajoutée", "factures ajoutées");
  return r.aCorriger > 0 ? `${ajoutees}, ${pluriel(r.aCorriger, "ligne à corriger", "lignes à corriger")}` : ajoutees;
}

interface Props {
  nomFichier: string;
  lecture: Lecture;
  analyseInitiale: Analyse;
  onAutreFichier: () => void;
}

export function ApercuImport({ nomFichier, lecture, analyseInitiale, onAutreFichier }: Props) {
  const [lignes, setLignes] = useState<LigneBrute[]>(lecture.lignes);
  const [choix, setChoix] = useState<Record<string, string>>({});
  const [analyse, setAnalyse] = useState<Analyse>(analyseInitiale);
  const [ordre, setOrdre] = useState<number[]>(() => calculerOrdre(analyseInitiale));
  const [aJour, setAJour] = useState(true); // l'analyse correspond bien aux lignes affichées
  const [erreur, setErreur] = useState<string>();
  const [resultat, setResultat] = useState<ResultatImport>();
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [page, setPage] = useState(1);
  const [importEnCours, lancerImport] = useTransition();
  const requete = useRef(0);

  // Après une correction, les lignes sont revérifiées par le serveur (doublons, clients existants) une demi-seconde après la dernière frappe.
  useEffect(() => {
    if (aJour) return;
    const minuteur = setTimeout(async () => {
      const numero = ++requete.current;
      const r = await reanalyser(lignes, choix);
      if (numero !== requete.current) return; // une correction plus récente est passée entre-temps
      if ("error" in r) setErreur(r.error);
      else {
        setErreur(undefined);
        setAnalyse(r.analyse);
        setAJour(true);
      }
    }, 500);
    return () => clearTimeout(minuteur);
  }, [aJour, lignes, choix]);

  const invalider = () => {
    requete.current++;
    setAJour(false);
  };

  function modifier(ligne: number, champ: Colonne, valeur: string) {
    setLignes((l) => l.map((x) => (x.ligne === ligne ? { ...x, [champ]: valeur } : x)));
    invalider();
  }
  function retirer(ligne: number) {
    setLignes((l) => l.filter((x) => x.ligne !== ligne));
    invalider();
  }
  function choisir(cle: string, valeur: string) {
    setChoix((c) => ({ ...c, [cle]: valeur }));
    invalider();
  }

  const parLigne = useMemo(() => new Map(analyse.lignes.map((l) => [l.ligne, l])), [analyse]);
  const { comptes } = analyse;

  const options: ChipOption<Filtre>[] = [
    { value: "toutes", label: "Toutes", count: lignes.length },
    { value: "a_corriger", label: "À corriger", glyph: "!", count: comptes.aCorriger },
    { value: "pretes", label: "Prêtes", glyph: "✓", count: comptes.pretes },
    ...(comptes.dejaImportees > 0 ? [{ value: "deja" as const, label: "Déjà importées", glyph: "‖", count: comptes.dejaImportees }] : []),
  ];

  const visibles = useMemo(() => {
    const rang = new Map(ordre.map((n, i) => [n, i]));
    const garde = (ligne: number) => {
      const s = parLigne.get(ligne)?.statut;
      if (filtre === "a_corriger") return s === "erreur" || s === "a_choisir" || s === undefined;
      if (filtre === "pretes") return s === "prete";
      if (filtre === "deja") return s === "deja_importee";
      return true;
    };
    return lignes.filter((l) => garde(l.ligne)).sort((a, b) => (rang.get(a.ligne) ?? 1e9) - (rang.get(b.ligne) ?? 1e9));
  }, [lignes, ordre, parLigne, filtre]);

  const nbPages = Math.max(1, Math.ceil(visibles.length / PAR_PAGE));
  const pageCourante = Math.min(page, nbPages);
  const affichees = visibles.slice((pageCourante - 1) * PAR_PAGE, pageCourante * PAR_PAGE);

  function lancer() {
    lancerImport(async () => {
      const r = await importer(lignes, choix);
      if ("error" in r) {
        setErreur(r.error);
        return;
      }
      setErreur(undefined);
      setResultat(r.resultat);
      // Les lignes importées quittent l'aperçu ; il reste celles à corriger, pour les reprendre sans rechargement.
      const importees = new Set(analyse.lignes.filter((l) => l.statut === "prete").map((l) => l.ligne));
      const restantes = lignes.filter((l) => !importees.has(l.ligne));
      setLignes(restantes);
      setOrdre((o) => o.filter((n) => !importees.has(n)));
      if (restantes.length === 0) setAnalyse({ lignes: [], comptes: { pretes: 0, aCorriger: 0, dejaImportees: 0 } });
      else invalider();
      setFiltre("toutes");
      setPage(1);
    });
  }

  const peutImporter = aJour && !importEnCours && comptes.pretes > 0;
  const termine = lignes.length === 0;

  return (
    <div className="flex flex-col gap-4">
      {resultat && (
        <Toast tone="success" title={messageResultat(resultat)}>
          {[
            resultat.clientsCrees > 0 && pluriel(resultat.clientsCrees, "nouveau client créé", "nouveaux clients créés"),
            resultat.dejaImportees > 0 && `${pluriel(resultat.dejaImportees, "facture déjà importée ignorée", "factures déjà importées ignorées")}`,
          ]
            .filter(Boolean)
            .join(" · ") || undefined}
        </Toast>
      )}
      {erreur && <Toast tone="danger" title={erreur} />}

      {termine ? (
        <EmptyState
          title="Toutes vos factures sont importées"
          action={
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <ButtonLink href="/factures">Voir les factures</ButtonLink>
              <Button variant="secondary" onClick={onAutreFichier}>
                Importer un autre fichier
              </Button>
            </div>
          }
        >
          Vous pouvez maintenant suivre ce que vos clients vous doivent.
        </EmptyState>
      ) : (
        <>
          {/* Compteur permanent : reste visible pendant qu'on fait défiler les lignes. */}
          <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-3 border-b border-border bg-bg px-4 py-3 sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-lg sm:border sm:bg-surface sm:px-4">
            <div>
              <p className="tabular font-display text-h2" aria-live="polite">
                {resumerComptes(comptes)}
                {!aJour && <span className="ml-2 text-body-sm text-ink-muted">Vérification…</span>}
              </p>
              <p className="text-body-sm text-ink-muted">{nomFichier}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button size="lg" onClick={lancer} disabled={!peutImporter} loading={importEnCours}>
                {comptes.pretes > 0 ? `Importer ${pluriel(comptes.pretes, "facture", "factures")}` : "Aucune facture prête"}
              </Button>
              <Button size="lg" variant="secondary" onClick={onAutreFichier}>
                Choisir un autre fichier
              </Button>
            </div>
          </div>

          {lecture.colonnesIgnorees.length > 0 && (
            <Toast tone="info" title={`${pluriel(lecture.colonnesIgnorees.length, "colonne ignorée", "colonnes ignorées")} : ${lecture.colonnesIgnorees.join(", ")}`}>
              Ces colonnes ne sont pas importées.
            </Toast>
          )}
          {lecture.avertissements.map((a) => (
            <Toast key={a} tone="info" title={a} />
          ))}

          <FilterChips
            label="Filtrer les lignes"
            options={options}
            value={filtre}
            onChange={(f) => {
              setFiltre(f);
              setPage(1);
            }}
          />

          {visibles.length === 0 ? (
            <EmptyState title="Aucune ligne dans cette liste">Choisissez « Toutes » pour revoir l&apos;ensemble du fichier.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {affichees.map((brute) => (
                <LigneImport
                  key={brute.ligne}
                  brute={brute}
                  analyse={parLigne.get(brute.ligne)}
                  choix={parLigne.get(brute.ligne)?.cleClient ? choix[parLigne.get(brute.ligne)!.cleClient!] : undefined}
                  onModifier={(champ, valeur) => modifier(brute.ligne, champ, valeur)}
                  onChoisir={choisir}
                  onRetirer={() => retirer(brute.ligne)}
                />
              ))}
            </ul>
          )}
          <Pagination page={pageCourante} nbPages={nbPages} surChangement={setPage} />
        </>
      )}
    </div>
  );
}
