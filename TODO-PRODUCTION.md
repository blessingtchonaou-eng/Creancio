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

## Étape 6 (saisie rapide)
- [ ] Mode hors connexion allégé : la file d'attente ne marche que si la page est déjà ouverte quand le réseau tombe.
      Ouvrir `/factures/nouvelle` sans connexion demande le service worker PWA (voir « Application »).
- [ ] La file d'attente est gardée dans le navigateur (localStorage, une file par entreprise). La vider à la déconnexion
      (téléphone partagé) et ne pas y garder de données sensibles au-delà du nom et du numéro du client.
- [ ] La saisie charge au plus 1 000 clients pour chercher sans connexion. Au-delà, ajouter une recherche côté serveur.
- [ ] Une facture gardée hors connexion pour un nouveau client ne peut pas encore réutiliser ce client dans la facture suivante
      sans le retaper (le serveur le reconnaît ensuite : même nom, même numéro).

## Étape 7 (à prévoir)
- [ ] Délai moyen de paiement : `Paiement.payeLe` moins `Facture.dateFacture`. Les factures importées sans colonne « Date de facture »
      ont la date d'import comme date de facture : leur délai est faussé. À signaler sur le tableau de bord ou à corriger à la main.
- [ ] Tableau de bord : remplacer `src/lib/mock-data.ts` par des requêtes Prisma filtrées par `entrepriseId`.

## Données de test
- [ ] Ancienne base `creancio` (60 clients, 250 factures, 200 paiements, 180 relances) : lecture seule. Prévoir un seed de démo plus riche à partir d'elle.
