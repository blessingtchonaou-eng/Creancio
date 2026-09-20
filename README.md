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

`DATABASE_URL` pointe sur la base `creancio_dev`, avec son propre rôle. Si votre volume Docker `creancio-data`
existe déjà, créez-les une fois :

```bash
docker compose exec db psql -U creancio -d postgres -c "CREATE ROLE creancio_dev LOGIN PASSWORD 'motdepasse' CREATEDB" -c "CREATE DATABASE creancio_dev OWNER creancio_dev"
```
