/**
 * Textes de la page d'accueil publique (/) et des pages légales provisoires. Les composants n'en contiennent aucun :
 * modifier une phrase ici suffit.
 *
 * Légende des commentaires, promesse par promesse (état vérifié dans le code le 2026-09-23) :
 *   LIVRÉ        l'application le fait aujourd'hui → texte au présent.
 *   PAS LIVRÉ    pas encore construit → texte au futur, et `livraison: "a-venir"` affiche l'étiquette « En préparation ».
 *   PARTIEL      une partie existe : la phrase sépare ce qui marche (présent) de ce qui viendra (futur).
 *   À CONFIRMER  engagement que vous seul pouvez prendre. Tant qu'il vaut `null`, il n'est pas affiché.
 * Règles : aucun chiffre présenté comme un résultat, aucune statistique, aucun témoignage, aucune mention de la loi 2019-014
 * tant que la déclaration IPDCP n'est pas faite.
 * `court` : variante de la maquette mobile, affichée sous 768 px. Sans `court`, le même texte partout.
 */

export type Livraison = "livre" | "a-venir";

/**
 * Consentement du formulaire pilote. La version enregistrée sur chaque demande permet de prouver à quelle phrase la
 * personne a consenti. NE JAMAIS modifier le texte d'une version existante : ajouter une nouvelle version et changer
 * CONSENTEMENT_ACTUEL. Les anciennes versions restent ici pour toujours.
 */
export const CONSENTEMENTS = {
  "v1-2026-09-23": "J'accepte d'être contacté sur ce numéro au sujet du pilote Créancio.",
} as const;
export type VersionConsentement = keyof typeof CONSENTEMENTS;
export const CONSENTEMENT_ACTUEL: VersionConsentement = "v1-2026-09-23";

export const landing = {
  meta: {
    titre: "Créancio · Faites-vous payer, sans courir après vos clients",
    // PARTIEL : le suivi des factures est livré ; relances et paiement ne le sont pas (futur).
    description:
      "Suivez vos factures à crédit, importées depuis Excel ou saisies sur téléphone. Relances WhatsApp et paiement Flooz ou Mixx by Yas en préparation : rejoignez le pilote à Lomé.",
  },

  entete: {
    liens: [
      { ancre: "comment-ca-marche", libelle: "Comment ça marche" },
      { ancre: "fonctionnalites", libelle: "Fonctionnalités" },
      { ancre: "securite", libelle: "Sécurité" },
      { ancre: "questions", libelle: "Questions" },
    ],
    seConnecter: "Se connecter",
    monEspace: "Mon espace", // à la place de « Se connecter » quand le visiteur est connecté
    rejoindre: "Rejoindre le pilote",
  },

  /** Étiquette posée sur tout ce qui porte `livraison: "a-venir"`. */
  enPreparation: "En préparation",

  accroche: {
    surtitre: "Pour les PME du Togo qui vendent à crédit",
    // Slogan demandé tel quel dans votre cahier des charges. C'est la promesse d'ensemble : elle suppose les relances,
    // PAS LIVRÉES. À relire.
    titre: "Faites-vous payer,",
    titreSuite: "sans courir après vos clients.",
    // PARTIEL. LIVRÉ : factures rassemblées, qui doit quoi, retards, encaissé. PAS LIVRÉ : rappels WhatsApp, paiement Flooz/Mixx,
    // arrêt automatique des relances. Maquette : « Créancio envoie vos rappels… Votre client paie en un clic… ».
    texte:
      "Créancio rassemble vos factures à crédit et vous montre qui doit quoi, qui est en retard et ce qui est rentré. Ensuite, il enverra vos rappels de paiement sur WhatsApp, au bon moment et avec le bon ton, et votre client paiera en un clic par Flooz ou Mixx by Yas.",
    court:
      "Créancio rassemble vos factures à crédit et vous montre qui doit quoi. Ensuite, il enverra vos rappels sur WhatsApp et votre client paiera par Flooz ou Mixx by Yas.",
    // CONFIRMÉ (2026-09-23) : le pilote est gratuit.
    boutonPrincipal: "Rejoindre le pilote gratuit",
    boutonSecondaire: "Voir comment ça marche",
    // LIVRÉ tous les trois : import .xlsx/.csv, écrans pensés pour le téléphone, interface en français.
    atouts: ["Import depuis Excel", "Pensé pour le téléphone", "En français"],
  },

  /**
   * Aperçu du produit dessiné en HTML/CSS à côté de l'accroche.
   * Données d'exemple (montants, délai) gardées, avec la légende qui dit qu'elles sont fictives (arbitrage du 2026-09-23).
   * Noms de commerce manifestement fictifs (« … Exemple ») : aucun ne doit pouvoir désigner un vrai commerce de Lomé.
   * La bulle WhatsApp et la notification Flooz montrent des fonctions PAS LIVRÉES : la légende le dit.
   */
  apercu: {
    etiquette: "Exemple",
    legende: "Exemple fictif. Les relances WhatsApp et le paiement Mobile Money sont en préparation.",
    salutation: "Bonjour Afi",
    attendu: { libelle: "Vous attendez", montant: 7_050_000 },
    retard: { libelle: "En retard", montant: 4_315_000, detail: "7 factures" },
    delai: { libelle: "Délai moyen", valeur: "25 jours", detail: "sur 5 factures" },
    factures: [
      { client: "Pharmacie Exemple", statut: "ECHUE" },
      { client: "Hôtel Exemple", statut: "PARTIELLEMENT_PAYEE" },
      { client: "Garage Exemple", statut: "PAYEE" },
    ],
    whatsapp: {
      expediteur: "Quincaillerie Exemple",
      message: "Bonjour M. Mensah, petit rappel : la facture FA-2026-0142 de 1 250 000 FCFA arrive à échéance vendredi. Merci !",
      heure: "09:02",
      bouton: "Payer maintenant",
    },
    notification: { titre: "Paiement reçu par Flooz", texte: "1 250 000 FCFA de M. Mensah. Relances arrêtées.", court: "Relances arrêtées." },
  },

  probleme: {
    titre: "Vendre à crédit fait vivre votre commerce.",
    titreSuite: "Relancer à la main l’épuise.",
    points: [
      {
        titre: "Des heures perdues au téléphone",
        texte: "Retrouver qui doit quoi, rappeler un par un, noter qui a promis de payer : c’est du temps pris à votre vrai métier.",
        court: "Retrouver qui doit quoi, rappeler un par un, noter qui a promis de payer.",
      },
      {
        titre: "La relance qui froisse",
        texte: "Relancer un client qui a déjà payé, ou trop sèchement, abîme une relation construite pendant des années.",
        court: "Relancer un client qui a déjà payé, ou trop sèchement, abîme la relation.",
      },
      {
        titre: "Le retard qui devient impayé",
        // « deux semaines » (maquette bureau) retiré : c'est un chiffre. Texte de la maquette mobile partout.
        texte: "Sans suivi régulier, une facture en retard devient une facture qu’on n’ose plus réclamer.",
      },
    ],
  },

  commentCaMarche: {
    surtitre: "Comment ça marche",
    // Décrit le fonctionnement complet, dont trois étapes PAS LIVRÉES (étiquetées « En préparation »).
    titre: "Quatre étapes, dont une seule pour vous.",
    etapes: [
      {
        // LIVRÉ : import Excel/CSV et saisie rapide sur téléphone. « en 30 secondes » (maquette) retiré : chiffre non mesuré.
        livraison: "livre",
        titre: "Importez vos factures",
        texte: "Déposez votre fichier Excel tel qu’il est, ou saisissez une facture depuis votre téléphone.",
        badge: "Vous, une seule fois",
      },
      {
        // PAS LIVRÉ : aucun envoi WhatsApp aujourd'hui.
        livraison: "a-venir",
        titre: "Créancio relancera",
        texte: "Des rappels WhatsApp courtois partiront aux bonnes dates, avec le montant et le numéro de facture.",
        court: "Des rappels WhatsApp courtois partiront aux bonnes dates.",
        badge: "Automatique",
      },
      {
        // PAS LIVRÉ : paiement PayGate (Flooz, Mixx by Yas) non branché.
        livraison: "a-venir",
        titre: "Votre client paiera",
        texte: "Un bouton dans le message ouvrira le paiement par Flooz ou Mixx by Yas, sans compte à créer.",
        court: "Un bouton ouvrira le paiement par Flooz ou Mixx by Yas.",
        badge: "Votre client, en un clic",
      },
      {
        // PAS LIVRÉ : mise à jour automatique à réception d'un paiement, arrêt des relances, notification.
        // (LIVRÉ aujourd'hui : un paiement saisi à la main fait passer la facture « Payée » une fois soldée.)
        livraison: "a-venir",
        titre: "Tout se mettra à jour",
        texte: "La facture passera « Payée », les relances s’arrêteront, et vous recevrez une notification.",
        court: "La facture passera « Payée » et les relances s’arrêteront.",
        badge: "Automatique",
      },
    ],
    // PAS LIVRÉ : aucun scénario de relance n'existe. J-3 / J / J+7 / J+15 sont les dates du calendrier proposé, pas des résultats.
    calendrier: {
      livraison: "a-venir",
      titre: "Calendrier de relance type",
      etapes: [
        { jour: "J-3", libelle: "Rappel amical" },
        { jour: "J", libelle: "Jour d’échéance" },
        { jour: "J+7", libelle: "Relance courtoise" },
        { jour: "J+15", libelle: "Relance formelle" },
      ],
      note: "Vous pourrez le modifier",
    },
  },

  fonctionnalites: {
    surtitre: "Fonctionnalités",
    titre: "Tout ce qu’il faut pour être payé, rien de plus.",
    elements: [
      {
        // LIVRÉ : tableau de bord (encours, en retard, encaissé du mois, délai moyen).
        livraison: "livre",
        icone: "tableau",
        titre: "Tableau de bord clair",
        texte: "Ce que vous attendez, ce qui est en retard, ce qui est rentré ce mois et votre délai moyen de paiement.",
        court: "Ce que vous attendez, les retards, l’encaissé du mois et votre délai moyen.",
      },
      {
        // LIVRÉ : reconnaissance des colonnes, montants et dates, erreurs affichées ligne par ligne.
        // « de mille façons » (maquette) remplacé : chiffre.
        livraison: "livre",
        icone: "import",
        titre: "Import Excel qui comprend vos fichiers",
        titreCourt: "Import Excel",
        texte: "Montants, dates et numéros écrits de bien des façons : Créancio les reconnaît et vous montre ce qu’il faut corriger.",
        court: "Vos fichiers tels qu’ils sont : Créancio montre ce qu’il faut corriger.",
      },
      {
        // PAS LIVRÉ : WhatsApp. PAS LIVRÉ : repli par SMS.
        livraison: "a-venir",
        icone: "whatsapp",
        titre: "Relances WhatsApp",
        texte: "Le canal que vos clients lisent vraiment, avec un ton qui montera doucement et un repli par SMS.",
        court: "Le canal que vos clients lisent, avec un repli par SMS.",
      },
      {
        // PAS LIVRÉ : PayGate (lien de paiement, versement sur le compte de la PME, mise à jour automatique).
        livraison: "a-venir",
        icone: "paiement",
        titre: "Paiement Flooz et Mixx by Yas",
        titreCourt: "Flooz et Mixx by Yas",
        texte: "Chaque rappel contiendra un lien de paiement. L’argent arrivera sur votre compte, et la facture se mettra à jour seule.",
        court: "Un lien de paiement dans chaque rappel, l’argent arrivera chez vous.",
      },
      {
        // LIVRÉ : paiements saisis à la main (espèces, virement, Flooz, Mixx reçus en direct), annulation avec motif et trace.
        // « en deux gestes » (maquette) retiré : chiffre.
        livraison: "livre",
        icone: "manuel",
        titre: "Paiements reçus à la main",
        titreCourt: "Paiements à la main",
        texte: "Espèces ou virement : enregistrez-les depuis la facture. Une erreur ? Elle s’annule avec une trace.",
        court: "Espèces ou virement depuis la facture, erreurs annulables avec une trace.",
      },
      {
        // PARTIEL. LIVRÉ : rôles administrateur / collaborateur, annulations réservées aux administrateurs.
        // PAS LIVRÉ : inviter un collaborateur (aucun écran pour l'ajouter aujourd'hui).
        livraison: "a-venir",
        icone: "equipe",
        titre: "Votre équipe, vos règles",
        texte: "Vous pourrez inviter vos collaborateurs pour qu’ils saisissent et suivent les factures. Les annulations restent réservées aux administrateurs.",
        court: "Les annulations restent réservées aux administrateurs.",
      },
    ],
  },

  confiance: {
    surtitre: "Confiance",
    titre: "Votre argent et vos clients restent les vôtres.",
    texte: "Relancer un client, c’est engager votre réputation. Créancio est conçu pour ne jamais vous mettre en porte-à-faux.",
    engagements: [
      {
        // PAS LIVRÉ : PayGate. Engagement validé : chaque PME a son propre compte marchand, Créancio n'encaisse jamais pour
        // autrui (exigence notée dans TODO-PRODUCTION.md).
        livraison: "a-venir",
        titre: "L’argent ira directement chez vous",
        texte: "Les paiements Mobile Money arriveront sur votre propre compte. Créancio ne détiendra jamais vos fonds.",
        court: "Créancio ne détiendra jamais vos fonds.",
      },
      {
        // PAS LIVRÉ : il n'y a pas encore de relances à arrêter.
        livraison: "a-venir",
        titre: "Jamais de relance après paiement",
        texte: "Dès qu’un paiement sera confirmé, toutes les relances de la facture s’arrêteront.",
        court: "Un paiement confirmé arrêtera toutes les relances de la facture.",
      },
      {
        // LIVRÉ : chaque requête filtre par entreprise, vérifié par des tests d'isolation.
        livraison: "livre",
        titre: "Vos données restent cloisonnées",
        texte: "Chaque entreprise ne voit que ses propres clients et factures, jamais celles d’une autre.",
        court: "Chaque entreprise ne voit que ses propres clients et factures.",
      },
      {
        // PARTIEL. PAS LIVRÉ : les messages de relance. LIVRÉ : suspendre les relances — mais d'une FACTURE, pas d'un client
        // (la maquette dit « d'un client », corrigé).
        livraison: "a-venir",
        titre: "Un ton toujours courtois",
        texte: "Les messages rappelleront, ils ne menaceront pas. Vous pouvez déjà suspendre les relances d’une facture à tout moment.",
        court: "Les messages rappelleront, ils ne menaceront pas.",
      },
    ],
  },

  questions: {
    surtitre: "Questions",
    titre: "Ce qu’on nous demande souvent.",
    elements: [
      {
        // PAS LIVRÉ : messages WhatsApp et paiement.
        question: "Mes clients doivent-ils installer quelque chose ?",
        reponse: "Non. Ils recevront un message WhatsApp classique et paieront avec le compte Flooz ou Mixx by Yas qu’ils ont déjà.",
      },
      {
        // LIVRÉ : saisie rapide ; la facture saisie sans réseau est gardée sur le téléphone et envoyée au retour de la connexion
        // (à condition que la page de saisie soit déjà ouverte). « moins d'une minute » (maquette) retiré : chiffre non mesuré.
        question: "Je tiens mes factures dans un cahier, puis-je quand même l’utiliser ?",
        questionCourte: "Je tiens mes factures dans un cahier. Et alors ?",
        reponse:
          "Oui. La saisie rapide est pensée pour le téléphone. Si la connexion coupe pendant la saisie, la facture est gardée sur le téléphone et envoyée dès le retour du réseau.",
      },
      {
        // LIVRÉ : paiement saisi à la main, facture « Payée » une fois soldée. Les relances (PAS LIVRÉES) ne sont pas citées.
        question: "Et si un client paie en espèces ?",
        reponse: "Vous enregistrez le paiement à la main depuis la facture : une fois tout réglé, elle passe « Payée ».",
      },
      {
        // PARTIEL. LIVRÉ : cloisonnement entre entreprises. PAS LIVRÉ : inviter des collaborateurs (« que vous invitez » retiré).
        question: "Qui voit mes données ?",
        reponse: "Vous, et plus tard les collaborateurs que vous ajouterez. Aucune autre entreprise n’y a accès.",
      },
      {
        // CONFIRMÉ (2026-09-23) : pilote gratuit. Aucun tarif, aucun montant, aucune fourchette affichés.
        question: "Combien ça coûte ?",
        reponse: "Pendant le pilote, l’accès est offert aux entreprises participantes.",
      },
    ],
  },

  pilote: {
    titre: "Rejoignez les premières PME de Lomé.",
    // « réglage de vos relances » : activité du pilote, les relances elles-mêmes sont PAS LIVRÉES. À relire.
    texte:
      "Nous accompagnons un petit groupe d’entreprises pendant le pilote : import de vos factures avec vous, réglage de vos relances, et vos retours pour construire la suite.",
    court: "Import de vos factures avec vous, réglage de vos relances, et vos retours pour construire la suite.",
    formulaire: {
      nomEntreprise: "Nom de votre entreprise",
      nomEntrepriseExemple: "Ex. : votre boutique",
      whatsapp: "Numéro WhatsApp",
      indicatif: "+228",
      facturesParMois: {
        libelle: "Combien de factures émettez-vous par mois ?",
        aide: "Facultatif",
        vide: "Je préfère ne pas répondre",
        options: [
          { valeur: "MOINS_DE_20", libelle: "Moins de 20" },
          { valeur: "DE_20_A_100", libelle: "De 20 à 100" },
          { valeur: "PLUS_DE_100", libelle: "Plus de 100" },
        ],
      },
      // Le texte de la case est CONSENTEMENTS[CONSENTEMENT_ACTUEL], en haut du fichier.
      bouton: "Je veux participer au pilote",
      envoiEnCours: "Envoi en cours…",
      // CONFIRMÉ (2026-09-23) : « sous 48 h ouvrées ».
      rappel: "Nous vous rappelons sous 48 h ouvrées.",
      sansEngagement: "Aucun engagement.",
      donnees: "Votre numéro sert uniquement à vous contacter au sujet du pilote.",
      lienDonnees: "Confidentialité",
    },
    succes: { titre: "Merci !", texte: "Nous vous contactons sur WhatsApp très vite." },
    erreurs: {
      nomEntrepriseVide: "Saisissez le nom de votre entreprise.",
      nomEntrepriseLong: "Ce nom est trop long : 120 caractères au plus.",
      whatsapp: "Saisissez un numéro togolais valide, par exemple 90 12 34 56.",
      facturesParMois: "Choisissez une réponse dans la liste.",
      consentement: "Cochez la case pour que nous puissions vous contacter.",
      expire: "Le formulaire a expiré. Envoyez-le à nouveau.",
      generale: "La demande n’a pas pu être envoyée. Réessayez dans un instant.",
    },
  },

  piedDePage: {
    lieu: "Lomé, Togo",
    // À CONFIRMER : e-mail (en attente du domaine). null = non affiché.
    email: null as string | null,
    // CONFIRMÉ (2026-09-23) : numéro WhatsApp de contact.
    telephone: "+228 71 45 39 42" as string | null,
    // Message prérempli quand le visiteur touche le numéro (lien WhatsApp).
    messageWhatsApp: "Bonjour, je vous contacte au sujet de Créancio",
    liens: [
      { href: "/confidentialite", libelle: "Confidentialité" },
      { href: "/conditions", libelle: "Conditions" },
    ],
  },

  /** Pages légales PROVISOIRES : descriptives, sans aucune affirmation juridique. À compléter avant la mise en ligne. */
  legal: {
    bandeau: "À compléter avant la mise en ligne. Ce texte est provisoire.",
    confidentialite: {
      titre: "Confidentialité",
      paragraphes: [
        "Quand vous demandez à participer au pilote, nous enregistrons le nom de votre entreprise, votre numéro WhatsApp, votre réponse sur le nombre de factures si vous la donnez, la date de la demande et la version de la phrase de consentement que vous avez cochée.",
        // « Seule l'équipe y a accès » évité : l'hébergeur de la base y a techniquement accès. À préciser avec l'hébergeur choisi.
        "Ces informations servent uniquement à vous contacter au sujet du pilote. Elles sont consultées par l’équipe Créancio.",
        "Pour limiter les envois abusifs, votre adresse IP est utilisée sous forme d’empreinte, jamais enregistrée en clair.",
        // Le numéro du pied de page est renseigné ; l'e-mail le sera quand le domaine existera.
        "Pour toute question sur vos données, contactez-nous avec les coordonnées indiquées en bas de page.",
      ],
    },
    conditions: {
      titre: "Conditions",
      paragraphes: [
        "Les conditions d’utilisation de Créancio seront publiées avant l’ouverture du service.",
        "Pendant le pilote, l’accès se fait sur invitation de l’équipe Créancio.",
      ],
    },
  },
} as const;
