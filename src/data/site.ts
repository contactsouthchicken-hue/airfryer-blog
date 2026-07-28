// Configuration centrale du site. Modifie ces valeurs pour personnaliser le blog.

export const SITE = {
  name: 'Guide Air Fryer',
  tagline: 'Comparatifs, guides et avis sur les friteuses à air chaud',
  description:
    "Le guide indépendant des friteuses à air chaud : comparatifs, tests, guides d'achat et astuces pour bien choisir votre air fryer.",
  url: 'https://guide-airfryer.fr', // doit correspondre à `site` dans astro.config.mjs
  locale: 'fr-FR',
  twitter: '', // ex: '@monblog' (laisser vide si aucun compte)
  authorName: 'La Rédaction',
  // Colle ici le code de vérification fourni par Google Search Console
  // (méthode "balise HTML", juste le contenu du content="...", pas toute la balise).
  googleSiteVerification: '',
  // Idem pour Bing Webmaster Tools (optionnel).
  bingSiteVerification: '',
};

// Ton identifiant de suivi Amazon Associates (ex: "monsite-21" pour Amazon.fr).
// Laisse vide tant que ton compte n'est pas approuvé : les liens produits
// pointeront alors vers Amazon sans tag, mais le site restera fonctionnel.
export const AMAZON_TRACKING_ID = 'guide2026-21';

// Domaine Amazon à utiliser pour les liens (.fr, .de, .es, .it, .com...)
export const AMAZON_DOMAIN = 'amazon.fr';

export const CATEGORIES = [
  {
    slug: 'comparatifs',
    label: 'Comparatifs',
    description: 'Face-à-face détaillés entre modèles pour vous aider à trancher.',
  },
  {
    slug: 'guides-complets',
    label: 'Guides complets',
    description: "Tout savoir avant d'acheter : critères, usages, budgets.",
  },
  {
    slug: 'avis',
    label: 'Avis produits',
    description: 'Tests et avis détaillés sur des modèles précis.',
  },
  {
    slug: 'astuces',
    label: 'Astuces & recettes',
    description: "Conseils d'utilisation, entretien et recettes pour air fryer.",
  },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];
