# À faire avant la mise en production

Points volontairement reportés. Ajouter ici ce qui est repoussé à chaque étape.

## Bloquant avant mise en ligne
- [x] ~~Limiteur de débit en base~~ : fait (table `LimiteDebit`, `customStorage` de Better Auth dans `src/lib/auth.ts`).
- [x] ~~Actions de connexion et d'inscription hors limite~~ : fait. Limites sur les ÉCHECS (`src/lib/limites-auth.ts`) : 20 par IP / 15 min, 10 par couple IP + adresse / 15 min, 50 par adresse / heure.
- [ ] **Inscription : seuls les échecs sont limités.** Créer des comptes avec des adresses toutes valides n'est pas freiné par les actions (seule la route `/api/auth/sign-up/email`
      garde sa limite de 5 par minute et par IP). À trancher avant la landing : limite sur les créations réussies (par IP, par heure) et confirmation d'adresse avant tout envoi de relance.
- [ ] **Envoi réel d'e-mails.** Domaine à acheter, SPF, DKIM et DMARC à publier chez Resend (ou Brevo), clé `RESEND_API_KEY` et `EMAIL_FROM` dans les variables
      d'environnement. Sans elles, le démarrage en production échoue (`src/instrumentation.ts` : message clair, le processus s'arrête avec le code 1). Un essai réel de bout en bout reste à faire.
- [ ] **Envoi d'e-mail en arrière-plan.** L'envoi n'est pas attendu (pour que la durée de la réponse ne trahisse pas l'existence du compte).
      Sur un hébergement sans processus durable (serverless), le brancher sur `advanced.backgroundTasks` (`waitUntil`), sinon des e-mails peuvent se perdre.
- [ ] **Configurer l'adresse IP selon l'hébergeur.** `CLIENT_IP_HEADER` et `TRUSTED_PROXY_COUNT` sont obligatoires en production (contrôle au démarrage). À vérifier sur l'installation réelle
      (VPS : nginx/Caddy avec `X-Forwarded-For $proxy_add_x_forwarded_for`, 1 proxy ; Vercel : 1 proxy ; Cloudflare devant nginx : 2), en envoyant un `x-forwarded-for` falsifié
      et en contrôlant l'adresse retenue. Sans en-tête lisible, tous les visiteurs partagent un même compteur (« ip-inconnue » ; côté Better Auth : « no-trusted-ip »).
- [ ] **Import de « Montant payé »** (voir « Étape 5 »).
- [ ] **Administration de la plateforme (`/admin/pilote`, export).** Chaque page, action et route d'export doit appeler `requireAdminPlateforme()` (`src/lib/session.ts`) :
      adresse dans `ADMIN_PLATEFORME_EMAILS` ET confirmée, sinon 404. Le refus est testé en unitaire ; ajouter les tests HTTP « non vérifié → 404 » quand ces pages existent.

## Authentification
- [ ] Rendre la vérification d'e-mail **bloquante** avant le pilote (aujourd'hui : bandeau seulement, l'accès reste ouvert).
- [ ] **Fuite connue.** L'inscription répond « Un compte existe déjà avec cet e-mail » : on peut savoir si une adresse a un compte. Choix fait pour la clarté (gérants peu habitués aux logiciels) ;
      la réinitialisation, elle, répond toujours pareil.
- [ ] Jeton de réinitialisation stocké non haché dans la table `Verification` (Better Auth sait le hacher : `verification.storeIdentifier`). Si activé, `autoriserLien`
      (`src/lib/reinitialisation.ts`) ne pourra plus compter par préfixe d'identifiant : prévoir un autre moyen de compter.
- [ ] Journal d'audit (qui a débloqué, annulé, modifié quoi), aujourd'hui inexistant.
- [ ] **Invitation de collaborateurs** et page `/equipe`, reportées ensemble. Elles apporteront l'action « Envoyer un lien de réinitialisation à un membre »
      (ADMIN seulement, membre cherché par `entrepriseId` de la session, lien envoyé à l'adresse du membre, jamais montré à l'ADMIN). Aujourd'hui un COLLABORATEUR
      n'existe que par le seed ; il peut utiliser « Mot de passe oublié ? » comme tout le monde.
- [ ] Limite « 3 e-mails de confirmation par heure » : registre tenu dans la table `Verification` (`limite-verification:…`), à purger régulièrement.

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
      **BLOQUANT AVANT LE PILOTE** pour « Montant payé » : une PME qui migre ses factures a des factures déjà partiellement payées.
      **À l'import de « Montant payé », il faudra créer les paiements correspondants (`Paiement`, `manuel`) plutôt que poser `montantPaye` directement** :
      l'invariant « `montantPaye` = somme des paiements non annulés » doit rester vrai (voir « Fiche facture »).
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

## Étape 7 (tableau de bord et liste des factures)
- [x] Délai moyen de paiement : les factures importées sans date de facture sont marquées `dateFactureEstimee` et exclues du calcul (la carte le signale).
- [x] Tableau de bord : `src/lib/mock-data.ts` remplacé par des requêtes Prisma filtrées par `entrepriseId`.
- [ ] Les factures importées AVANT la migration `date_facture_estimee` ne sont pas marquées (base de développement seulement) : leur délai reste faussé.
- [ ] Le statut « À venir » → « Échue » n'est pas écrit en base : `statutAffiche()` le corrige à l'affichage. À faire écrire par le planificateur de relances (S7–S8).
- [ ] « Aujourd'hui » est calculé en UTC (`aujourdhuiIso`, `src/lib/status.ts`), juste parce que le Togo est à UTC+0 toute l'année.
      À revoir si le produit s'ouvre à un pays d'un autre fuseau.
- [ ] Index `(entrepriseId, echeance)` sur `Facture` si les volumes grossissent (tri par échéance de la liste).
- [ ] Tableau de bord : mises en forme « Efficacité des relances » et « Scénario actif » gardées dans `src/components/dashboard/a-venir/`, à brancher avec les relances.
- [ ] Tableau de bord : pas de sélecteur de période (le chiffre « encaissé » est celui du mois courant).

## Fiche facture (paiements saisis à la main)
- [ ] Remboursement d'un paiement reçu par PayGate : aucun bouton d'annulation pour eux (seuls les paiements `manuel` s'annulent depuis l'interface).
- [ ] Rapprochement d'un paiement saisi à la main avec un paiement PayGate reçu plus tard pour la même facture : risque de compter deux fois la même somme.
- [ ] Corriger le montant ou la date d'un paiement : aujourd'hui, on l'annule (motif obligatoire) et on en saisit un nouveau.
- [ ] Un collaborateur qui se trompe de montant doit demander à un administrateur d'annuler le paiement (règle voulue : annuler une facture ou un paiement est réservé aux ADMIN).
      Une entreprise sans administrateur ne pourrait plus rien annuler : à vérifier quand l'invitation de collaborateurs existera.
- [ ] « Reprendre les relances » redonne « À venir » / « Échue » / « Partiellement payée » d'après l'échéance et les paiements : « En relance » sera rétabli avec les relances.
- [ ] Les actions de confirmation (suspendre, annuler) demandent JavaScript ; les formulaires (paiement, modification) fonctionnent sans.

## Données de test
- [ ] Ancienne base `creancio` (60 clients, 250 factures, 200 paiements, 180 relances) : lecture seule. Prévoir un seed de démo plus riche à partir d'elle.
