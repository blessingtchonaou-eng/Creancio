"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { enregistrerFactures } from "@/app/(app)/factures/nouvelle/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Toast } from "@/components/ui/feedback";
import { aEnvoyer, ajouterALaFile, ecrireFile, lireFile, marquerErreur, retirerDeLaFile, type FactureEnAttente, type Stockage } from "@/lib/file-attente";
import { formaterSaisieMontant, numeroSuivant, validerSaisie, MAX_FACTURES_PAR_ENVOI, type ChampSaisie, type SaisieFacture } from "@/lib/factures-saisie";
import { formatTogoPhone, nationalTogoPhone } from "@/lib/phone";
import { ChoixClient, type ClientChoisi, type ClientPropose } from "./choix-client";
import { FileAttente } from "./file-attente";

interface Props {
  entrepriseId: string;
  clients: ClientPropose[];
  numeroSuggere: string;
  /** AAAA-MM-JJ : date de facture pré-remplie. */
  aujourdhui: string;
}

type Intention = "enregistrer" | "ajouter";
type Erreurs = Partial<Record<ChampSaisie, string>>;
interface Doublon {
  whatsapp: string;
  clients: { id: string; nom: string }[];
}
interface Message {
  tone: "success" | "info" | "danger";
  titre: string;
  texte?: string;
}

function stockageLocal(): Stockage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // stockage bloqué (navigation privée, réglages du navigateur)
  }
}

const abonnerConnexion = (rappel: () => void) => {
  window.addEventListener("online", rappel);
  window.addEventListener("offline", rappel);
  return () => {
    window.removeEventListener("online", rappel);
    window.removeEventListener("offline", rappel);
  };
};

const enumerer = (noms: string[]) => {
  const q = noms.map((n) => `« ${n} »`);
  return q.length <= 1 ? (q[0] ?? "") : `${q.slice(0, -1).join(", ")} et ${q.at(-1)}`;
};

const memeNom = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Saisie rapide d'une facture : pensée pour le téléphone, utilisable sans connexion (les factures partent quand le réseau revient). */
export function SaisieRapide({ entrepriseId, clients: clientsInitiaux, numeroSuggere, aujourdhui }: Props) {
  const router = useRouter();
  const enLigne = useSyncExternalStore(abonnerConnexion, () => navigator.onLine, () => true);

  const [clients, setClients] = useState(clientsInitiaux);
  const [numero, setNumero] = useState(numeroSuggere);
  const [montant, setMontant] = useState("");
  const [dateFacture, setDateFacture] = useState(aujourdhui);
  const [echeance, setEcheance] = useState("");
  const [client, setClient] = useState<ClientChoisi>(clientsInitiaux.length === 0 ? { mode: "nouveau", nom: "", whatsapp: "" } : { mode: "cherche" });
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [doublon, setDoublon] = useState<Doublon | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const [file, setFile] = useState<FactureEnAttente[]>([]);
  const fileRef = useRef<FactureEnAttente[]>([]);
  const envoiFile = useRef(false);
  const [envoiFileEnCours, setEnvoiFileEnCours] = useState(false);
  const intentionEnAttente = useRef<Intention>("enregistrer");

  const changerFile = useCallback(
    (nouvelle: FactureEnAttente[]) => {
      fileRef.current = nouvelle;
      setFile(nouvelle);
      return ecrireFile(stockageLocal(), entrepriseId, nouvelle);
    },
    [entrepriseId],
  );

  /** Envoie les factures gardées sur le téléphone. Celles que le serveur refuse restent dans la file, marquées à corriger. */
  const envoyerFile = useCallback(async () => {
    if (envoiFile.current || !navigator.onLine) return;
    const lot = aEnvoyer(fileRef.current).slice(0, MAX_FACTURES_PAR_ENVOI);
    if (lot.length === 0) return;
    envoiFile.current = true;
    setEnvoiFileEnCours(true);
    try {
      const r = await enregistrerFactures(lot.map((f) => f.saisie));
      if ("error" in r) return; // on réessaiera au prochain retour de connexion
      let nouvelle = fileRef.current;
      let envoyees = 0;
      for (const { cle, resultat } of r.resultats) {
        if (resultat.ok) {
          nouvelle = retirerDeLaFile(nouvelle, cle);
          envoyees++;
        } else if ("erreurs" in resultat) {
          nouvelle = marquerErreur(nouvelle, cle, Object.values(resultat.erreurs)[0] ?? "Cette facture a été refusée.");
        } else {
          nouvelle = marquerErreur(
            nouvelle,
            cle,
            `Le numéro ${formatTogoPhone(resultat.doublon.whatsapp)} est déjà celui de ${enumerer(resultat.doublon.clients.map((c) => c.nom))}. Corrigez la facture pour choisir ce client ou confirmer.`,
          );
        }
      }
      changerFile(nouvelle);
      if (envoyees > 0) setMessage({ tone: "success", titre: envoyees > 1 ? `${envoyees} factures envoyées` : "1 facture envoyée", texte: "Elles étaient gardées sur ce téléphone." });
    } catch {
      // Pas de réseau : la file reste intacte, elle repartira plus tard.
    } finally {
      envoiFile.current = false;
      setEnvoiFileEnCours(false);
    }
  }, [changerFile]);

  // Au chargement : on reprend la file gardée sur ce téléphone, et on l'envoie si la connexion est là.
  useEffect(() => {
    const gardee = lireFile(stockageLocal(), entrepriseId);
    fileRef.current = gardee;
    setFile(gardee);
    void envoyerFile();
    window.addEventListener("online", envoyerFile);
    return () => window.removeEventListener("online", envoyerFile);
  }, [entrepriseId, envoyerFile]);

  const focaliser = (e: Erreurs) => {
    const ordre: ChampSaisie[] = ["numero", "client", "nom", "whatsapp", "montant", "dateFacture", "echeance"];
    const premier = ordre.find((c) => e[c]);
    if (premier) document.getElementById(`saisie-${premier}`)?.focus();
  };

  /** Prépare la facture suivante : numéro incrémenté, client et montant vides, date de facture gardée. */
  function preparerSuivante(dernierNumero: string) {
    setNumero(numeroSuivant(dernierNumero) ?? "");
    setMontant("");
    setEcheance("");
    setClient({ mode: "cherche" });
    setErreurs({});
    setDoublon(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function gardeSurLeTelephone(saisie: SaisieFacture, resume: string) {
    const ok = changerFile(ajouterALaFile(fileRef.current, { saisie, resume }));
    if (!ok) {
      changerFile(retirerDeLaFile(fileRef.current, saisie.cle));
      setMessage({ tone: "danger", titre: "Cette facture n'a pas pu être gardée sur ce téléphone", texte: "Rien n'est enregistré. Reconnectez-vous, puis réessayez." });
      return;
    }
    setMessage({ tone: "info", titre: `Facture ${saisie.numero} gardée sur ce téléphone`, texte: "Elle sera envoyée dès que la connexion revient." });
    preparerSuivante(saisie.numero);
  }

  async function soumettre(intention: Intention, confirmation?: string) {
    if (envoi) return;
    const saisie: SaisieFacture = {
      cle: crypto.randomUUID(),
      numero,
      montant,
      dateFacture,
      echeance,
      client:
        client.mode === "choisi"
          ? { type: "existant", id: client.client.id }
          : client.mode === "nouveau"
            ? { type: "nouveau", nom: client.nom, whatsapp: client.whatsapp }
            : { type: "existant", id: "" },
      confirmerNumero: confirmation,
    };
    setMessage(null);
    const v = validerSaisie(saisie);
    if (!v.ok) {
      setErreurs(v.erreurs);
      setDoublon(null);
      focaliser(v.erreurs);
      return;
    }
    setErreurs({});

    const c = v.valeur.client;
    const nomClient = c.type === "nouveau" ? c.nom : client.mode === "choisi" ? client.client.nom : "";
    const resume = `${v.valeur.numero} · ${nomClient}`;

    // Numéro déjà connu (les clients sont chargés dans la page, donc ça marche sans connexion) : on demande avant de créer un second client.
    if (c.type === "nouveau" && confirmation !== c.whatsapp) {
      const memes = clients.filter((x) => x.whatsapp === c.whatsapp);
      if (memes.length > 0 && !memes.some((x) => memeNom(x.nom, c.nom))) {
        intentionEnAttente.current = intention;
        setDoublon({ whatsapp: c.whatsapp, clients: memes.map(({ id, nom }) => ({ id, nom })) });
        return;
      }
    }
    setDoublon(null);

    if (!navigator.onLine) {
      gardeSurLeTelephone(saisie, resume);
      return;
    }

    setEnvoi(true);
    try {
      const r = await enregistrerFactures([saisie]);
      if ("error" in r) {
        setMessage({ tone: "danger", titre: r.error });
        return;
      }
      const resultat = r.resultats[0].resultat;
      if (resultat.ok) {
        if (c.type === "nouveau" && !clients.some((x) => x.id === resultat.clientId)) {
          setClients((liste) => [...liste, { id: resultat.clientId, nom: c.nom, whatsapp: c.whatsapp }]);
        }
        if (intention === "enregistrer") {
          router.push("/factures");
          return;
        }
        setMessage({ tone: "success", titre: `Facture ${resultat.numero} enregistrée`, texte: "Vous pouvez saisir la suivante." });
        preparerSuivante(resultat.numero);
      } else if ("erreurs" in resultat) {
        setErreurs(resultat.erreurs);
        focaliser(resultat.erreurs);
      } else {
        intentionEnAttente.current = intention;
        setDoublon(resultat.doublon);
      }
    } catch {
      // Connexion perdue pendant l'envoi : la facture est gardée sur le téléphone, rien n'est perdu.
      gardeSurLeTelephone(saisie, resume);
    } finally {
      setEnvoi(false);
    }
  }

  function corriger(cle: string) {
    const element = fileRef.current.find((f) => f.saisie.cle === cle);
    if (!element) return;
    const { saisie } = element;
    changerFile(retirerDeLaFile(fileRef.current, cle));
    setNumero(saisie.numero);
    setMontant(formaterSaisieMontant(saisie.montant));
    setDateFacture(saisie.dateFacture);
    setEcheance(saisie.echeance);
    if (saisie.client.type === "nouveau") {
      setClient({ mode: "nouveau", nom: saisie.client.nom, whatsapp: saisie.client.whatsapp });
    } else {
      const id = saisie.client.id;
      const connu = clients.find((c) => c.id === id);
      setClient(connu ? { mode: "choisi", client: connu } : { mode: "cherche" });
    }
    setErreurs({});
    setDoublon(null);
    setMessage({ tone: "info", titre: "Corrigez cette facture, puis enregistrez-la", texte: element.erreur });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const nouveauClientNom = client.mode === "nouveau" ? client.nom.trim() : "";

  return (
    <div className="flex flex-col gap-4">
      {!enLigne && (
        <Toast tone="info" title="Pas de connexion">
          Vous pouvez continuer : les factures sont gardées sur ce téléphone et partiront dès que la connexion revient.
        </Toast>
      )}
      {message && (
        <Toast tone={message.tone} title={message.titre}>
          {message.texte}
        </Toast>
      )}

      <FileAttente
        file={file}
        enLigne={enLigne}
        envoiEnCours={envoiFileEnCours}
        onEnvoyer={() => void envoyerFile()}
        onCorriger={corriger}
        onSupprimer={(cle) => changerFile(retirerDeLaFile(fileRef.current, cle))}
      />

      <Card>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void soumettre("enregistrer");
          }}
          className="flex flex-col gap-4"
        >
          <Field
            id="saisie-numero"
            label="Numéro de facture"
            autoComplete="off"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            error={erreurs.numero}
            help="Numéro proposé : vous pouvez le modifier."
          />

          <ChoixClient
            clients={clients}
            valeur={client}
            onChange={(v) => {
              setClient(v);
              setDoublon(null);
            }}
            erreurs={erreurs}
          />

          {doublon && (
            <div role="alert" className="flex flex-col gap-3 rounded-lg bg-st-partial-bg p-4 text-st-partial-fg">
              <p className="font-semibold">
                Le numéro {formatTogoPhone(doublon.whatsapp)} est déjà celui de {enumerer(doublon.clients.map((c) => c.nom))}. Créer quand même un second client ?
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                {doublon.clients.map((d) => {
                  const connu = clients.find((c) => c.id === d.id);
                  return connu ? (
                    <Button
                      key={d.id}
                      variant="secondary"
                      onClick={() => {
                        setClient({ mode: "choisi", client: connu });
                        setDoublon(null);
                      }}
                    >
                      Choisir {d.nom}
                    </Button>
                  ) : null;
                })}
                <Button onClick={() => void soumettre(intentionEnAttente.current, doublon.whatsapp)} loading={envoi}>
                  {nouveauClientNom ? `Créer quand même « ${nouveauClientNom} »` : "Créer quand même"}
                </Button>
              </div>
            </div>
          )}

          <Field
            id="saisie-montant"
            label="Montant"
            inputMode="numeric"
            autoComplete="off"
            suffix="FCFA"
            placeholder="150 000"
            value={montant}
            onChange={(e) => setMontant(formaterSaisieMontant(e.target.value))}
            error={erreurs.montant}
            className="[&_input]:tabular [&_input]:text-lg [&_input]:font-semibold"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="saisie-dateFacture" label="Date de la facture" type="date" value={dateFacture} onChange={(e) => setDateFacture(e.target.value)} error={erreurs.dateFacture} />
            <Field id="saisie-echeance" label="Échéance" type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} error={erreurs.echeance} />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button type="submit" size="lg" loading={envoi} className="sm:flex-1">
              Enregistrer la facture
            </Button>
            <Button type="button" size="lg" variant="secondary" disabled={envoi} onClick={() => void soumettre("ajouter")} className="sm:flex-1">
              Enregistrer et en ajouter une autre
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
