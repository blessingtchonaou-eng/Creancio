# À faire avant la mise en production

Points volontairement reportés. Ajouter ici ce qui est repoussé à chaque étape.

## Authentification
- [ ] Vérification d'e-mail et réinitialisation du mot de passe. Choisir un service d'envoi (Resend ou Brevo).
- [ ] Rendre neutre le message d'inscription « Un compte existe déjà avec cet e-mail » (une fois l'envoi d'e-mails en place).
- [ ] Invitation de collaborateurs dans une entreprise (aujourd'hui, un COLLABORATEUR n'existe que par le seed).

## Application
- [ ] Service worker PWA complet (mode hors-ligne allégé en attendant : file d'attente locale).

## Conformité
- [ ] Déclaration IPDCP.
- [ ] Politique de confidentialité.

## Étape 3 (onboarding)
- [ ] Format du NIF à confirmer sur des factures réelles. Le format officiel de l'OTR n'est pas publié.
      La règle de `src/lib/validation/nif.ts` (7 à 13 chiffres) ne fait qu'afficher un avertissement :
      un NIF saisi n'est jamais refusé.

## Sécurité
- [ ] Réexaminer `npm audit` quand un correctif Prisma 7.x sort (voir README, section « Sécurité »).

## Étape 5 (import)
- [ ] Import : ajouter la colonne facultative « Statut » (facture déjà payée) et « Montant payé ».
- [ ] Import de gros volumes (au-delà de 1 000 lignes) : traitement en arrière-plan avec suivi de progression.
- [ ] Pas de correspondance approximative des noms de clients (« Agbo Kofi » et « Kofi Agbo » sont deux noms) : les cas ambigus passent par « à choisir ».
- [ ] Contrôle antivirus des fichiers déposés.
