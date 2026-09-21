import "dotenv/config";
import { BASE_URL, anonyme, seConnecter, serveurAccessible } from "./session";

// Préchauffage, lancé une fois avant les suites HTTP. Le serveur de développement compile chaque page à sa première visite
// (jusqu'à 30-60 s à froid) : sans cela, la première requête d'une suite dépasse le délai du test et l'échec n'a rien à voir avec
// ce qu'on teste. Ici on visite une fois chaque page ; les identifiants inexistants suffisent (un 404 compile quand même la page).
// Coût : une connexion, sur les 5 par minute autorisées. En cas d'échec, on continue sans préchauffage.
const PAGES_PUBLIQUES = ["/connexion", "/inscription", "/mot-de-passe-oublie", "/nouveau-mot-de-passe"];
const PAGES_CONNECTEES = [
  "/tableau-de-bord",
  "/clients",
  "/clients/nouveau",
  "/clients/prechauffage",
  "/clients/prechauffage/modifier",
  "/factures",
  "/factures/nouvelle",
  "/factures/import",
  "/factures/prechauffage",
  "/factures/prechauffage/modifier",
  "/factures/prechauffage/paiement",
  "/paiements",
  "/relances",
];

export default async function prechauffer() {
  await serveurAccessible();
  await Promise.all(PAGES_PUBLIQUES.map((p) => anonyme(p)));
  try {
    const session = await seConnecter("demo@creancio.tg");
    for (const page of PAGES_CONNECTEES) await session(page); // une à une : le serveur de développement compile en série
  } catch (e) {
    console.warn(`Préchauffage des pages connectées ignoré (${BASE_URL}) : ${e instanceof Error ? e.message : e}`);
  }
}
