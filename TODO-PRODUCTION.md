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
- [ ] Confirmer le format officiel du NIF auprès de l'OTR et resserrer la règle dans `src/lib/validation/nif.ts`
      (règle provisoire : 7 à 13 chiffres).
- [ ] Vérifier le NIF auprès de l'OTR (aujourd'hui : format seulement).

## Sécurité
- [ ] Réexaminer `npm audit` quand un correctif Prisma 7.x sort (voir README, section « Sécurité »).
