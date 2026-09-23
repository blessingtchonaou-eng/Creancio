# Créancio

Relances WhatsApp et paiements Mobile Money (Flooz, Mixx by Yas) pour les PME togolaises.

## Démarrer

```bash
npm install
cp .env.example .env      # renseigner DATABASE_URL, puis les clés PayGate et WhatsApp plus tard
npm run dev               # http://localhost:3000
```

L'application s'ouvre sur le tableau de bord, alimenté par la base de données (`npm run db:seed` crée l'entreprise de démonstration).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Prisma 7 (PostgreSQL) · lucide-react.
Polices : Fraunces (titres, montants) et Instrument Sans (interface), chargées par `next/font`.

## Structure

```
src/
  app/
    globals.css              design system Baobab : tokens Tailwind, mode sombre (.dark)
    layout.tsx               polices, métadonnées
    (app)/layout.tsx         en-tête + navigation mobile en bas
    (app)/tableau-de-bord/   écran principal (KPI réels : encours, en retard, encaissé du mois, délai moyen)
    (app)/factures/          liste (filtres, recherche, tri, pagination), import, saisie rapide
    (app)/clients/           liste, fiche, création, modification
    (app)/relances|paiements/   écrans à construire
  components/
    ui/                      Button, StatusBadge, Field, SearchInput, RechercheUrl, FilterChips, FiltresLiens,
                             KpiCard, Sparkline, Card, Toast, EmptyState, ErrorState, Skeleton
    layout/                  AppHeader, BottomNav, Logo
    dashboard/               FacturesASuivre, BlocRelancesAVenir ; a-venir/ : mises en forme gardées pour les relances
  lib/                       types, formatage FCFA et dates, statuts (statutAffiche), tableau-de-bord.ts, factures-liste.ts
prisma/schema.prisma         modèle de données du cahier des charges
```

## Authentification

Better Auth : e-mail + mot de passe (haché en scrypt), sessions en base, cookie httpOnly. Pages `/inscription` et `/connexion`.

- `src/proxy.ts` : contrôle rapide (cookie présent) pour les visiteurs anonymes.
- `src/lib/session.ts` : le vrai contrôle. `requireEntreprise()` renvoie `entrepriseId` et le rôle depuis la session ;
  **toute page et toute action qui lit ou écrit des données doit l'appeler et filtrer par cet `entrepriseId`**.
  Un `entrepriseId` ne vient jamais du navigateur.
- Sans entreprise, tout écran `(app)` redirige vers `/bienvenue`. Celui qui crée l'entreprise en devient ADMIN.
- Comptes de démonstration (seed, développement uniquement) : `demo@creancio.tg` (ADMIN), `collaboratrice@creancio.tg`
  (COLLABORATEUR), `autre@creancio.tg` (ADMIN d'une autre entreprise, pour les tests d'isolation).
  Mot de passe : variable `DEMO_PASSWORD`, sinon la valeur par défaut de `prisma/seed.ts`.

### Mot de passe oublié et confirmation d'adresse

- Pages `/mot-de-passe-oublie` (demande) et `/nouveau-mot-de-passe` (lien reçu par e-mail). La demande répond toujours « Si un compte existe avec cette adresse… ».
- Lien à usage unique, valable 1 heure ; le mot de passe changé, **toutes les sessions sont fermées** et un e-mail de notification part.
  Le lien du mail ne fait que vérifier le jeton : seul l'envoi du formulaire le consomme (un aperçu de messagerie ne le brûle pas).
- Limites : 3 demandes par minute et par IP (routeur Better Auth) ET **3 liens par heure et par adresse**, appliquée dans le rappel `sendResetPassword`
  (`src/lib/auth-courriels.ts`), donc aussi pour un appel direct de `/api/auth/request-password-reset`. Au-delà, le jeton est retiré et rien n'est envoyé.
- Les actions serveur passent par `appelerRoute` (`src/lib/auth-route.ts`) pour que la limite par IP s'applique aussi à elles.
- Confirmation d'adresse : e-mail à l'inscription, bandeau dans l'application tant qu'elle n'est pas confirmée (accès non bloqué).
  **Limite de débit** (`LimiteDebit`, en base, empreintes HMAC : jamais d'IP ni d'e-mail en clair) : échecs de connexion et d'inscription limités par IP (20 / 15 min), par couple IP + adresse (10 / 15 min) et par adresse toutes IP confondues (50 / heure) ; message unique, compte connu ou non. L'IP du visiteur est lue selon `CLIENT_IP_HEADER` et `TRUSTED_PROXY_COUNT` (obligatoires en production, voir `.env.example`).
  Seule exception : l'administration de la plateforme exige une adresse listée dans `ADMIN_PLATEFORME_EMAILS` **et** confirmée (`requireAdminPlateforme()`).
- **E-mails** (`src/lib/email/`) : `EMAIL_DRIVER` = `console` (défaut : l'e-mail et son lien s'affichent dans le terminal du serveur) ou `mailpit`
  (`docker compose up -d mailpit`, boîte sur http://localhost:8025). **Hors production, aucun e-mail ne part pour de vrai**, même avec une clé Resend ou Brevo.
  En production : `resend` (ou `brevo`), avec sa clé et `EMAIL_FROM` ; sans eux, le processus s'arrête avec le code 1 et un message clair (`src/instrumentation.ts`), donc le déploiement échoue au lieu de servir des pages en erreur. En développement, l'erreur s'affiche dans le navigateur et le serveur reste en vie.
  Pour essayer un build de production en local, il faut donc définir ces variables (ou lancer `npm run dev`).

### Inscription pendant le pilote (lien d'invitation)

- `INSCRIPTIONS_OUVERTES` (`.env.example`, `false` par défaut) : tant qu'elle n'est pas `"true"`, `/inscription` n'accepte
  qu'un lien d'invitation à usage unique, valable 7 jours (`src/lib/invitation-pilote.ts`, table `InvitationPilote`).
  Sans jeton valide, ni la page ni la Server Action `inscription()` ne créent de compte.
- Le lien se crée depuis `/admin/pilote` (bouton « Créer un lien d'inscription » sur une demande), à copier ou à envoyer
  directement par WhatsApp (`wa.me`, message prérempli). Créer un nouveau lien invalide l'ancien s'il n'a pas servi :
  un seul lien actif par demande. À l'inscription, la demande passe automatiquement au statut INSCRITE.
- Le jeton en clair n'est jamais stocké (seule son empreinte HMAC) ni mis dans une redirection : il n'apparaît que dans
  le résultat affiché une fois à l'administrateur, et dans l'adresse `/inscription?invitation=...` envoyée au contact.
  Cette page pose `Referrer-Policy: no-referrer` (`next.config.ts`) ; `Cache-Control: no-store` y est aussi déclaré mais
  pas obtenu tel quel sur le fil, voir TODO-PRODUCTION.md.
- **Fermeture de la route Better Auth elle-même** : `auth.api.signUpEmail` contourne le routeur (comme pour la limite
  de débit ci-dessus). Un `hooks.before` (`src/lib/auth.ts`) refuse tout appel HTTP direct à `/api/auth/sign-up/email`
  quand `INSCRIPTIONS_OUVERTES` n'est pas `"true"`, en le distinguant de l'appel interne de `inscription()` (qui a déjà
  vérifié le jeton) par la présence de `ctx.request` — absent pour un appel direct à `auth.api.*`, présent pour un
  appel passé par le routeur HTTP. **`ctx.request` est un détail interne de `better-call`** (la bibliothèque de routage
  de Better Auth), pas une option documentée : après toute mise à jour de `better-auth` (ou de `better-call`), relancez
  `npx vitest run --config vitest.http.config.mts tests/http/inscription-fermee.test.ts` pour vérifier que la fermeture
  tient toujours. **TODO si une connexion sociale (Google, etc.) est ajoutée un jour** : sa création de compte devra
  aussi respecter `INSCRIPTIONS_OUVERTES` (le hook actuel ne couvre que `/sign-up/email`).
- **Créer un compte administrateur de la plateforme sans rouvrir les inscriptions publiques** (`scripts/creer-admin-plateforme.ts`).
  **En production**, sur le serveur, dans le dossier de l'application, après le build (qui génère `src/generated/prisma`) :
  ```bash
  NODE_ENV=production npm run admin:creer -- --email admin@creancio.tg --nom "Prénom Nom"
  ```
  - Fonctionne après `npm ci --omit=dev` : `tsx` (exécution du TypeScript) et `@next/env` (lecture des `.env*`) sont dans
    `dependencies`. Le script lit les mêmes fichiers `.env*` que `next start`, sans écraser les variables posées par l'hébergeur.
  - **`NODE_ENV=production` est obligatoire** : sans lui, les e-mails restent en mode `console` et la confirmation ne part pas.
    Le script affiche l'environnement et le pilote d'e-mail avant toute question, et refuse de créer le compte si la
    configuration de démarrage est invalide (mêmes contrôles que `src/instrumentation.ts`).
  - Le mot de passe se saisit au terminal, sans écho (jamais en argument, jamais dans l'historique du shell).
  - Le script appelle `auth.api.signUpEmail` directement (pas de requête HTTP) : `ctx.request` est absent et le hook de
    fermeture ne s'applique pas — inutile de toucher `INSCRIPTIONS_OUVERTES`. L'e-mail de confirmation part normalement ;
    le lien mène à `/admin/pilote`.
  - Listez ensuite l'adresse dans `ADMIN_PLATEFORME_EMAILS` et redémarrez l'application. `requireAdminPlateforme()` n'exige
    qu'une adresse listée et confirmée, jamais d'entreprise (`entrepriseId` reste `null`, le rôle COLLABORATEUR par défaut
    n'a ici aucun effet).
  - En développement : `npm run admin:creer -- --email ... --nom "..."` (l'e-mail s'affiche dans le terminal).
- **Administrateur de la plateforme sans entreprise** : après connexion, il arrive sur `/admin/pilote` (`requireEntreprise()`
  et le layout d'onboarding l'y renvoient), jamais sur l'onboarding. Un utilisateur sans entreprise qui n'est pas
  administrateur de la plateforme va toujours sur `/bienvenue`.
  **Ne pas utiliser le compte admin plateforme pour créer une entreprise ; utiliser un compte séparé pour tester l'application.**

Tests : `npm test` (Vitest). `npm run test:http` vérifie, sur un serveur qui tourne (`npm run dev`), les codes HTTP et l'isolation entre entreprises. Les tests d'intégration utilisent la base `creancio_dev` : lancez `docker compose up -d` avant. Lancez les suites HTTP une par une (`npx vitest run --config vitest.http.config.mts tests/http/<suite>.test.ts`) : la connexion est limitée à 5 par minute et par IP. Un préchauffage (`tests/http/prechauffage.ts`, une connexion) visite chaque page avant la suite pour que la compilation à froid du serveur de développement ne fasse pas dépasser les délais.
La suite `admin-plateforme-redirection` demande un serveur qui connaît son compte de test comme administrateur de la plateforme :
`ADMIN_PLATEFORME_EMAILS="admin-plateforme-test@example.com" npm run dev` (ajoutez vos adresses après une virgule). Sans cela, elle échoue et son message donne la commande à lancer.

## Sécurité

**`npm audit` : 4 alertes « high » acceptées.** Elles viennent de la CLI `prisma` (`@prisma/config` → `deepmerge-ts`
et le pilote MySQL `mysql2`). C'est une dépendance de développement : elle n'est jamais exécutée en production et
l'application utilise PostgreSQL, pas MySQL. `npm audit fix --force` installerait Prisma 6 (changement de version
majeure) et des `overrides` risqueraient de casser la CLI : rien n'est appliqué.
**À réexaminer** dès qu'un correctif Prisma 7.x est publié : relancer `npm audit`, puis `npm update prisma`.

**`exceljs`** (lecture des fichiers .xlsx de l'import) : 2 alertes « moderate » sur `uuid` (dépassement de tampon de `uuid` v3/v5/v6
appelé avec un tampon). exceljs n'appelle que `uuid.v4()` sans tampon : la faille n'est pas atteignable. `npm audit fix --force`
installerait exceljs 3.4.0 (changement de version majeure, plus ancien) : rien n'est appliqué. À réexaminer à chaque mise à jour d'exceljs.

Les reports avant mise en production sont listés dans [TODO-PRODUCTION.md](TODO-PRODUCTION.md).

## Import de factures (/factures/import)

Fichier Excel (.xlsx) ou CSV, 2 Mo et 1 000 lignes au maximum. Modèle téléchargeable sur la page.
Le code est dans `src/lib/import/` : `lecture.ts` (fichier → lignes), `montant.ts` et `date.ts` (formats), `analyse.ts`
(règles, sans base de données) et `serveur.ts` (contexte de l'entreprise et écriture).

- Les titres de colonnes sont reconnus quels que soient l'ordre, les accents et la casse ; ils peuvent se trouver après quelques lignes de titre.
- Une valeur illisible est une **erreur visible** (jamais devinée) et une ligne en erreur n'est **jamais importée**.
- L'import est rejouable : un numéro de facture déjà enregistré pour l'entreprise est ignoré (« déjà importée »).
- Un client est reconnu par son numéro **et** son nom ; en cas de doute (numéro partagé, nom connu avec un autre numéro, numéro d'un client de nom différent), la ligne est « à choisir ». On ne rapproche jamais un client sur le seul numéro : le risque est de relancer la mauvaise personne.
- Le fichier de test `tests/fixtures/creancio-import-test-sale.xlsx` fait foi : sa feuille « Résultat attendu » décrit le comportement réel (corrigée après l'étape 6) et `src/lib/import/fixture-sale.test.ts` la vérifie ligne par ligne.
- La colonne « Date de facture » (ou « Date d'émission ») est facultative : si elle manque, la date du jour est utilisée et l'aperçu le signale. Elle sert au délai moyen de paiement.
- Une facture importée est « Échue » si son échéance est passée, « À venir » sinon.

## Saisie rapide (/factures/nouvelle)

Pensée pour le téléphone : client cherché ou créé sur place, montant avec espaces automatiques, numéro FA-AAAA-NNNN proposé (modifiable),
date de facture pré-remplie à aujourd’hui, bouton « Enregistrer et en ajouter une autre ». Les règles sont dans `src/lib/factures-saisie.ts`
(partagées avec le serveur), l’écriture dans `src/lib/factures.ts`.

Mode hors connexion allégé : sans réseau, la facture est gardée sur le téléphone (`src/lib/file-attente.ts`, localStorage) puis envoyée
au retour de la connexion. Envoyer deux fois la même facture ne crée aucun doublon. Le service worker complet est dans TODO-PRODUCTION.md.

## Tableau de bord et liste des factures

Aucun chiffre n'est inventé. Ce qui dépend des relances (relances du jour, efficacité, scénario) affiche « Disponible dès les premières relances ».
Les chiffres sont calculés dans `src/lib/tableau-de-bord.ts`, la liste dans `src/lib/factures-liste.ts` ; les deux filtrent par `entrepriseId`.

- **Encours** : factures non payées (À venir, Échue, En relance, Partielle, Suspendue), montant moins paiements partiels.
- **En retard** : la part de l'encours dont l'échéance est passée.
- **Encaissé ce mois** : somme des paiements dont la date est dans le mois courant. La comparaison au mois dernier n'apparaît que s'il y a eu des paiements.
- **Délai moyen de paiement** : pour chaque facture payée, dernier paiement moins date de facture ; moyenne des factures dont la date de facture est connue.
  Une facture importée sans date de facture (`dateFactureEstimee`) n'est pas comptée, et la carte le dit.
- **Statut affiché** : le statut est écrit à la création et aucun planificateur ne le met à jour. `statutAffiche()` (`src/lib/status.ts`) affiche « Échue »
  une facture « À venir » dont l'échéance est passée ; les filtres SQL appliquent la même règle.
- **« Aujourd'hui »** est le jour UTC : juste pour le Togo (UTC+0 toute l'année, pas d'heure d'été).
- **/factures** : filtre « À encaisser » par défaut, puces de statut (liens, sans JavaScript), tri par échéance, 25 par page.
  **Une recherche (numéro ou client) porte sur toutes les factures**, quel que soit le filtre, et l'écran le dit.
- Toute la carte (ou la ligne) d'une facture ouvre sa fiche ; le nom du client ouvre la fiche du client.

## Fiche d'une facture (/factures/[id])

Détail (total, déjà payé, reste à payer, dates, jours de retard), historique des paiements, bloc « Relances » (état vide jusqu'aux relances).
Le code est dans `src/lib/facture-regles.ts` (règles sans base de données : reste dû, validation d'un paiement, statut après chaque changement)
et `src/lib/factures-fiche.ts` (lecture et écritures). Les actions serveur sont dans `src/app/(app)/factures/[id]/actions.ts`.

- **Actions ouvertes à tout utilisateur** : modifier la facture, enregistrer un paiement reçu à la main (Flooz, Mixx, espèces, virement), suspendre et reprendre les relances.
- **Réservées aux ADMIN** : annuler une facture, annuler un paiement. Le bouton n'apparaît pas pour un COLLABORATEUR **et** le serveur refuse l'action (le rôle vient de la session, jamais du formulaire).
- **On n'efface jamais.** Une facture s'annule, un paiement s'annule (motif de 3 à 200 caractères) ; l'un et l'autre restent visibles avec la trace (qui, quand, pourquoi).
  Une facture ne s'annule que si tous ses paiements sont annulés. Seuls les paiements saisis à la main s'annulent ici ; un paiement PayGate demande un remboursement.
- **Un paiement ne dépasse jamais le reste à payer**, et sa date n'est ni future ni avant la date de facture (simple avertissement si cette date est estimée).
  Le statut passe seul à « Partiellement payée » puis « Payée » ; une facture suspendue le reste tant qu'elle n'est pas soldée.
- **Invariant** : pour toute facture, `montantPaye` = somme des paiements non annulés (0 quand elle n'a aucun paiement). Chaque écriture se fait sous verrou de ligne
  (`SELECT … FOR UPDATE`) et modifie `montantPaye` par un delta ; deux paiements simultanés ne peuvent pas dépasser le reste dû, un double clic ne crée qu'un paiement.
  Les paiements annulés sont exclus partout : encaissé du mois, délai moyen, reste dû.
  Requête de contrôle : `SELECT COUNT(*) FROM "Facture" f WHERE f."montantPaye" <> (SELECT COALESCE(SUM(p.montant), 0) FROM "Paiement" p WHERE p."factureId" = f.id AND p."annuleLe" IS NULL);` (attendu : 0).

## Conventions

- Montants en FCFA stockés en entiers ; affichage avec `formatFCFA()` / `formatAmount()`.
- Dates stockées en ISO, affichées en JJ/MM/AAAA avec `formatDate()`.
- Un statut de facture s'affiche toujours avec `<StatusBadge>` : symbole + texte + couleur.
- Couleurs uniquement via les tokens (`bg-primary`, `text-ink-muted`, `bg-st-overdue-bg`…), jamais en dur.
- Zones tactiles de 44 px minimum ; champs de saisie à 16 px.

## Base de données

```bash
npm run db:generate   # génère le client Prisma dans src/generated/prisma
npm run db:migrate    # crée les tables dans PostgreSQL
```

> **Après chaque migration, relancez `npm run dev`.** Le serveur de développement garde l'ancien client Prisma
> en mémoire : sans redémarrage, les pages qui utilisent les nouveaux champs renvoient une erreur 500.

Les contraintes `@@unique` du schéma protègent contre les doublons : numéro de facture par entreprise,
référence de transaction PayGate (paiement traité une seule fois), relance par facture et par étape.

## État d'avancement

Bilan de fin de périmètre (ce que l'application sait et ne sait pas faire, décisions prises) : [BILAN-S3-S4.md](BILAN-S3-S4.md). Point de retour git : tag `s3-s4-complete`.

**S3–S4 (comptes, entreprise, clients, factures) : étapes 1 à 7 faites.**

| Étape | Contenu | État |
|---|---|---|
| 1 | Base de données PostgreSQL (Docker), schéma Prisma, seed | fait |
| 2 | Authentification (Better Auth), session, isolation par entreprise | fait |
| 3 | Onboarding en 3 étapes (entreprise, premier client, premières factures) | fait |
| 4 | Clients : liste, recherche, création, modification, fiche ; numéro partagé confirmé | fait |
| 5 | Import Excel/CSV : aperçu, erreurs visibles, rejouable, clients « à choisir », date de facture | fait |
| 6 | Saisie rapide `/factures/nouvelle` avec file d'attente hors connexion | fait |
| 7 | Tableau de bord et `/factures` branchés sur Prisma (fin de `mock-data.ts`), KPI vides « Disponible dès les premières relances », délai moyen de paiement | fait |

Hors périmètre pour l'instant : PayGate (liens de paiement, webhook), WhatsApp (BSP), planificateur de relances, export Excel.
Ce qui est reporté volontairement est dans [TODO-PRODUCTION.md](TODO-PRODUCTION.md).

Suite du planning du cahier des charges : S5–S6 PayGate Global (liens de paiement, webhook, passage à « Payée »),
S7–S8 WhatsApp Cloud API via un BSP + planificateur de relances + repli SMS, S9–S10 export Excel.

### Base locale (Docker)

```bash
docker compose up -d      # PostgreSQL 16 sur le port 5432
npm run db:migrate        # crée les tables
npm run db:seed           # entreprise de démonstration
```

Le serveur PostgreSQL contient deux bases :

| Base | Rôle |
|---|---|
| `creancio` | **Ancien jeu de démonstration** (60 clients, 250 factures, 200 paiements, 180 relances) issu de la première version. **À ne pas modifier ni migrer.** Il servira à tester l'import sur un volume réaliste et à un futur seed de démo plus riche. |
| `creancio_dev` | **Développement** : c'est la base visée par `DATABASE_URL` (rôle `creancio_dev`). Migrations et seed s'appliquent ici uniquement. |

Si votre volume Docker `creancio-data` existe déjà, créez la base de développement une fois :

```bash
docker compose exec db psql -U creancio -d postgres -c "CREATE ROLE creancio_dev LOGIN PASSWORD 'motdepasse' CREATEDB" -c "CREATE DATABASE creancio_dev OWNER creancio_dev"
```
