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
