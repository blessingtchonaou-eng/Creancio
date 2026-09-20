@AGENTS.md
# Créancio — règles du projet

SaaS de relance des impayés pour PME togolaises : import de factures, relances
WhatsApp/SMS, paiement Mobile Money (Flooz, Mixx by Yas) via PayGate Global.
Utilisateurs : gérants de PME à Lomé, souvent sur Android milieu de gamme en 3G,
peu habitués aux logiciels. Interface 100 % en français.

## Stack
Next.js 16 (App Router, Server Actions) · React 19 · TypeScript strict ·
Tailwind CSS v4 · Prisma 7 + PostgreSQL · lucide-react · zod pour la validation.

## Design system (Baobab) — obligatoire
- Couleurs uniquement via les tokens de src/app/globals.css (bg-primary,
  text-ink-muted, bg-st-overdue-bg…). Jamais de couleur hexadécimale en dur.
- Réutiliser les composants de src/components/ui avant d'en créer un nouveau.
  Un nouveau composant générique va dans src/components/ui.
- Statut de facture : toujours <StatusBadge> (symbole + texte + couleur).
- Titres et grands montants en font-display (Fraunces), le reste en Instrument Sans.
- Mobile d'abord : zones tactiles ≥ 44 px, champs à 16 px, navigation en bas.
- Chaque écran prévoit ses états vide, chargement (Skeleton) et erreur.

## Données et formats
- Montants en FCFA stockés en entiers (Int). Affichage : formatFCFA / formatAmount.
- Dates stockées en ISO, affichées JJ/MM/AAAA avec formatDate.
- Numéros WhatsApp stockés au format E.164 (+228XXXXXXXX).
- Numéro de facture unique par entreprise (exigence OTR).
- Toute requête filtre par entrepriseId : un utilisateur ne voit jamais
  les données d'une autre entreprise.

## Rédaction de l'interface
Phrases simples, voix active, pas de jargon technique. Les boutons disent ce
qu'ils font (« Importer 42 factures », pas « Valider »). Les erreurs disent
quoi corriger, sans s'excuser.

## Méthode
- Proposer un plan avant tout changement important et attendre mon accord.
- Après chaque étape : npm run typecheck et npm run build doivent passer.
- Ne pas ajouter de dépendance sans expliquer pourquoi.
- Données de démo : prisma/seed.ts.