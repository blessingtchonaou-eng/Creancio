# Créancio

Relances WhatsApp et paiements Mobile Money (Flooz, Mixx by Yas) pour les PME togolaises.

## Démarrer

```bash
npm install
cp .env.example .env      # renseigner DATABASE_URL, puis les clés PayGate et WhatsApp plus tard
npm run dev               # http://localhost:3000
```

L'application s'ouvre sur le tableau de bord, alimenté pour l'instant par des données de démonstration (`src/lib/mock-data.ts`).

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
    (app)/tableau-de-bord/   écran principal
    (app)/factures|clients|relances|paiements/   écrans à construire
  components/
    ui/                      Button, StatusBadge, Field, SearchInput, FilterChips,
                             KpiCard, Sparkline, Card, Toast, EmptyState, ErrorState, Skeleton
    layout/                  AppHeader, BottomNav, Logo
    dashboard/               PriorityInvoices, ReminderEfficiency, ActiveScenario
  lib/                       types, formatage FCFA et dates, statuts, données de démo
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

Tests : `npm test` (Vitest). `npm run test:http` vérifie, sur un serveur qui tourne (`npm run dev`), les codes HTTP et l'isolation entre entreprises. Les tests d'intégration utilisent la base `creancio_dev` : lancez `docker compose up -d` avant.

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
- Un client est reconnu par son numéro et son nom ; en cas de doute (numéro partagé, nom connu avec un autre numéro), la ligne est « à choisir ».
- La colonne « Date de facture » (ou « Date d'émission ») est facultative : si elle manque, la date du jour est utilisée et l'aperçu le signale. Elle sert au délai moyen de paiement.
- Une facture importée est « Échue » si son échéance est passée, « À venir » sinon.

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

## Prochaines étapes (planning du cahier des charges)

1. S3–S4 : authentification, profil entreprise, clients, import Excel et saisie rapide
2. S5–S6 : PayGate Global — liens de paiement, webhook, passage automatique à « Payée »
3. S7–S8 : WhatsApp Cloud API via un BSP, planificateur de relances, repli SMS
4. S9–S10 : brancher le tableau de bord sur les vraies données, export Excel

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
