# Créancio — bilan de fin de périmètre S3–S4

État de l'application au tag git `s3-s4-complete` (étapes 1 à 7). Ce document dit ce que Créancio sait faire aujourd'hui,
ce qu'il ne sait pas encore, et pourquoi certains choix ont été faits. Il ne promet rien qui ne soit pas dans le code.

## En une phrase

Créancio permet aujourd'hui à une PME togolaise de **rassembler ses factures clients au même endroit et de voir en un coup d'œil
combien on lui doit et qui est en retard**. Les relances automatiques et le paiement Mobile Money sont les prochaines étapes : ils ne sont pas encore là.

## Ce que l'application sait faire aujourd'hui

**Ouvrir un compte et une entreprise**
- Inscription et connexion par e-mail et mot de passe.
- Mise en route en 3 étapes : l'entreprise (nom, NIF facultatif, téléphone), un premier client, les premières factures.
- Chaque entreprise ne voit que ses propres données (voir « Décisions »).

**Gérer ses clients**
- Liste avec recherche par nom ou par numéro, création, modification, fiche client avec ses factures et le total qu'il doit.
- Numéro WhatsApp au format international (+228…). Si un numéro est déjà utilisé par un autre client, l'application prévient et demande confirmation.

**Enregistrer ses factures, de deux façons**
- **Import Excel ou CSV** (jusqu'à 1 000 lignes, 2 Mo) : un modèle est téléchargeable, les colonnes sont reconnues même dans un autre ordre ou avec d'autres accents.
  Avant d'importer, un aperçu montre chaque ligne : prête, en erreur, déjà importée, ou client « à choisir ». Une ligne en erreur n'est jamais importée.
  On peut rejouer le même fichier sans créer de doublons.
- **Saisie rapide** depuis le téléphone : client cherché ou créé sur place, montant avec espaces automatiques, numéro de facture proposé, bouton « Enregistrer et en ajouter une autre ».
  Sans réseau, la facture est gardée sur le téléphone puis envoyée au retour de la connexion, sans doublon.

**Suivre ce qu'on vous doit**
- Tableau de bord : montant attendu, montant en retard (et nombre de factures), encaissé ce mois, délai moyen de paiement, et les factures à suivre en premier.
- Liste des factures : filtres par statut (« À encaisser » d'abord), recherche par numéro de facture ou nom du client, tri par échéance, pagination.
- Les statuts sont toujours affichés avec un symbole, un texte et une couleur.

**Pensé pour le terrain**
- Interface 100 % en français, boutons qui disent ce qu'ils font, erreurs qui disent quoi corriger.
- Mobile d'abord : navigation en bas, zones tactiles de 44 px, champs à 16 px, écrans de chargement et d'erreur sur chaque page.
- Mode sombre prévu dans le design.

## Ce que l'application ne sait pas encore faire

| Manque | Conséquence aujourd'hui | Prévu |
|---|---|---|
| Relances WhatsApp et SMS | Aucun message n'est envoyé. Les cartes « Relances » et « Efficacité » du tableau de bord affichent « Disponible dès les premières relances ». | S7–S8 |
| Paiement Mobile Money (Flooz, Mixx by Yas) via PayGate | Pas de lien de paiement ; aucun paiement ne s'enregistre tout seul. Les chiffres « Encaissé » et « Délai moyen » restent à zéro tant qu'il n'y a pas de paiement. | S5–S6 |
| ~~Marquer une facture payée à la main~~ | Au tag `s3-s4-complete`, impossible. **Fait après le tag** : paiement saisi à la main (Flooz, Mixx, espèces, virement), annulable par un administrateur avec un motif. | fait |
| ~~Fiche d'une facture~~ | Au tag `s3-s4-complete`, il n'y avait pas de page par facture. **Faite après le tag** : `/factures/[id]` (détail, historique des paiements, modification, suspension, annulation). | fait |
| Passage automatique « À venir » → « Échue » en base | Corrigé à l'affichage, pas encore écrit en base (viendra avec le planificateur de relances). | S7–S8 |
| Export Excel | Absent. | S9–S10 |
| Vérification d'e-mail, mot de passe oublié | Absents : un compte ne peut pas récupérer son mot de passe. | avant la mise en production |
| Inviter des collaborateurs | Les rôles (administrateur, collaborateur) existent mais un collaborateur ne peut être créé que par les données de démonstration. | avant la mise en production |
| Application installable et vraiment hors connexion (PWA) | La saisie hors connexion ne marche que si la page était déjà ouverte au moment où le réseau tombe. | avant la mise en production |
| Déclaration IPDCP, politique de confidentialité | Non faites. | avant la mise en production |
| Import de plus de 1 000 lignes, colonnes « Statut » et « Montant payé » | Non prévus dans l'import actuel. « Montant payé » est bloquant avant le pilote (voir TODO). | à planifier |

La liste complète et à jour est dans [TODO-PRODUCTION.md](TODO-PRODUCTION.md).

## Décisions structurantes prises pendant S3–S4

1. **Une entreprise ne voit jamais les données d'une autre.** L'identifiant de l'entreprise vient de la session, jamais du navigateur, et chaque requête le filtre.
   Ce n'est pas seulement écrit : chaque écran de données a des tests d'isolation, en base et par requêtes HTTP (une autre entreprise reçoit un vrai « 404 » sans fuite).
2. **Aucun chiffre inventé.** Ce qui ne peut pas être calculé s'affiche comme indisponible, avec le moment où il le sera. Le tableau de bord de démonstration de départ, avec ses chiffres factices, a été supprimé.
3. **Les erreurs sont visibles, jamais devinées.** À l'import, une date ou un montant illisible est signalé ligne par ligne et la ligne n'est pas importée. On ne « corrige » pas en silence.
4. **On ne rapproche jamais un client sur le seul numéro de téléphone.** Un même numéro peut servir à plusieurs clients (boutique et gérant, famille) : le risque est de relancer la mauvaise personne.
   En cas de doute, l'application demande de choisir ; l'import ne décide pas à la place de l'utilisateur.
5. **Le statut d'une facture vieillit, donc l'écran le recalcule.** Une facture « À venir » dont l'échéance est passée s'affiche « Échue », et les filtres appliquent la même règle.
6. **Le délai moyen de paiement n'utilise que des dates fiables.** Une facture importée sans date d'émission est marquée « date estimée » et exclue du calcul ; la carte indique combien de factures sont comptées.
7. **Une recherche cherche partout.** Une recherche de facture porte sur toutes les factures, même quand le filtre « À encaisser » est actif, et l'écran le dit : on retrouve une facture payée par son numéro.
8. **Montants en entiers.** Les montants sont stockés en FCFA entiers (pas de décimales) ; les dates s'affichent JJ/MM/AAAA ; le numéro de facture est unique par entreprise (exigence OTR).
9. **Le « jour » est le jour UTC.** Juste pour le Togo (UTC+0 toute l'année, pas d'heure d'été). À revoir si le produit s'ouvre à un pays d'un autre fuseau.
10. **Hors connexion, version allégée d'abord.** Une file d'attente locale suffit pour ne pas perdre une saisie ; l'application installable complète est repoussée à la mise en production.
11. **Un design system unique (Baobab)** : couleurs uniquement par jetons, composants réutilisés, statuts toujours lisibles sans la couleur seule.

## Qualité et sécurité

- 255 tests automatiques (règles d'import, saisie, calculs du tableau de bord, isolation entre entreprises) et des tests HTTP sur un serveur en marche.
- Mots de passe hachés (jamais stockés en clair), sessions en base, cookie protégé, limite de tentatives de connexion.
- Alertes `npm audit` acceptées et documentées dans le [README](README.md#sécurité) : elles concernent des outils de développement, pas l'application en production.

## Pour la suite

1. S5–S6 : PayGate Global (liens de paiement, notification de paiement, passage à « Payée »). C'est ce qui donnera vie à « Encaissé » et au délai moyen.
2. S7–S8 : WhatsApp (via un prestataire agréé), planificateur de relances, repli SMS.
3. S9–S10 : export Excel.
4. Avant la mise en production : reprendre la liste de [TODO-PRODUCTION.md](TODO-PRODUCTION.md) (comptes, hors connexion, conformité).
