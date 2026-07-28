#!/usr/bin/env node
// Génère un guide de ~2500 mots par jour, avec liens Amazon affiliés intégrés
// automatiquement, et l'écrit dans src/content/guides/ au format MDX.
//
// Usage : node scripts/generate-article.mjs
// Variable d'environnement requise : ANTHROPIC_API_KEY

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

import { pickTodaysTopic, saveUsedTopic } from './lib/topicPicker.mjs';
import { insertAffiliateLinks } from './lib/insertAffiliateLinks.mjs';
import { slugify } from './lib/slugify.mjs';

// Charge un .env local si présent (inutile en CI, où les secrets sont déjà en env).
try {
  const dotenv = await import('dotenv');
  dotenv.config();
} catch {
  // dotenv non installé : on ignore, ce n'est utile qu'en local.
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const GUIDES_DIR = path.join(ROOT, 'src', 'content', 'guides');
const PRODUCTS_PATH = path.join(ROOT, 'src', 'data', 'products.json');

const CATEGORY_LABELS = {
  comparatifs: 'Comparatif',
  'guides-complets': 'Guide complet',
  avis: 'Avis produit',
  astuces: 'Astuces & recettes',
};

const CATEGORY_IMAGES = {
  comparatifs: '/images/guides/comparatifs.svg',
  'guides-complets': '/images/guides/guides-complets.svg',
  avis: '/images/guides/avis.svg',
  astuces: '/images/guides/astuces.svg',
};

function loadProducts() {
  const data = JSON.parse(readFileSync(PRODUCTS_PATH, 'utf8'));
  return data.products;
}

function buildSystemPrompt() {
  return `Tu es rédacteur SEO senior spécialisé dans les friteuses à air chaud (air fryers),
pour un blog d'affiliation Amazon en français destiné au marché français.

Règles impératives :
- Rédige un contenu 100% original, précis et honnête. N'invente jamais de caractéristiques
  techniques précises (watts, litres exacts, prix) pour un produit réel non fourni : reste
  général ou renvoie le lecteur à la fiche produit Amazon pour les chiffres exacts.
- Structure obligatoire en Markdown : un titre H1 implicite (le champ "title" séparé, ne pas
  le remettre en H1 dans le corps), puis des sections avec des titres H2 ("## ..."), et des
  sous-sections H3 si utile.
- N'inclus JAMAIS une année spécifique (ex: "en 2024", "en 2025") dans le titre, la
  description ou le corps de l'article, sauf si l'année exacte t'est explicitement donnée
  dans le message utilisateur. Un article daté de façon incorrecte ou qui se périme vite nuit
  au SEO. Préfère des formulations intemporelles ("aujourd'hui", "actuellement", ou pas de
  référence temporelle du tout).
- Longueur cible : environ 2500 mots (accepte 2300 à 2800).
- Inclus une introduction qui accroche (problème du lecteur) et annonce ce que l'article va
  couvrir, plusieurs sections de développement, une section "Foire aux questions" avec 4 à 6
  questions/réponses (utile pour le featured snippet Google), et une conclusion avec un conseil
  d'action clair.
- Ton : expert mais accessible, orienté conseil pratique, jamais publicitaire à outrance.
  Présente toujours avantages ET limites, même pour les produits mis en avant.
- Pour insérer un produit affilié à un endroit pertinent du texte, écris EXACTEMENT un token
  sur sa propre ligne : [PRODUIT:cle-produit]. Pour un tableau comparatif entre plusieurs
  produits, écris [COMPARATIF:cle1|cle2|cle3]. N'utilise QUE les clés produits fournies dans
  le message utilisateur. Utilise entre 1 et 4 tokens produits au total, placés à des endroits
  naturels (jamais deux tokens consécutifs sans texte entre eux).
- N'écris jamais de lien Markdown vers Amazon toi-même : seuls les tokens ci-dessus doivent
  générer des liens, le reste du texte ne doit contenir aucune URL.
- Évite de répéter les titres d'articles déjà publiés récemment (fournis dans le message
  utilisateur) : trouve un angle distinct.
- N'emploie jamais de formulations dépréciées par Google (bourrage de mots-clés). Écris pour
  un humain d'abord.`;
}

function buildUserPrompt({ category, seed, recentTitles, products }) {
  const productsList = products
    .map((p) => `- clé="${p.key}" | ${p.name} | catégorie: ${p.category} | pitch: ${p.pitch}`)
    .join('\n');

  const recent = recentTitles.length
    ? recentTitles.map((t) => `- ${t}`).join('\n')
    : '(aucun article publié pour le moment)';

  return `Type d'article à produire aujourd'hui : ${CATEGORY_LABELS[category]} (catégorie technique: "${category}").
Angle imposé pour aujourd'hui : "${seed}".

Produits disponibles pour insertion de liens affiliés (utilise uniquement ces clés) :
${productsList}

Titres des articles publiés récemment (à ne pas reproduire à l'identique) :
${recent}

Rédige maintenant l'article complet en respectant toutes les règles du system prompt, puis
appelle l'outil "publier_guide" avec le résultat structuré.`;
}

const ARTICLE_TOOL = {
  name: 'publier_guide',
  description: "Publie un guide complet sur les air fryers avec ses métadonnées SEO.",
  input_schema: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Titre H1 accrocheur et optimisé SEO, 50 à 65 caractères idéalement.',
      },
      metaDescription: {
        type: 'string',
        description: 'Meta description SEO, 140 à 160 caractères, incitant au clic.',
      },
      keywords: {
        type: 'array',
        items: { type: 'string' },
        description: '5 à 8 mots-clés / expressions ciblés par cet article.',
      },
      featuredProducts: {
        type: 'array',
        items: { type: 'string' },
        description: 'Clés des produits réellement insérés dans le corps via les tokens [PRODUIT:] / [COMPARATIF:].',
      },
      body: {
        type: 'string',
        description: 'Corps complet en Markdown (sans le H1), avec les tokens [PRODUIT:] / [COMPARATIF:] inclus.',
      },
    },
    required: ['title', 'metaDescription', 'keywords', 'featuredProducts', 'body'],
  },
};

async function generateArticle({ category, seed, recentTitles, products }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY manquant dans les variables d\'environnement.');
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 8192,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: buildUserPrompt({ category, seed, recentTitles, products }) }],
    tools: [ARTICLE_TOOL],
    tool_choice: { type: 'tool', name: 'publier_guide' },
  });

  const toolUse = response.content.find((block) => block.type === 'tool_use');
  if (!toolUse) {
    throw new Error("La réponse de Claude ne contient pas d'appel à l'outil publier_guide.");
  }
  return toolUse.input;
}

function ensureUniqueSlug(baseSlug) {
  let slug = baseSlug;
  let counter = 2;
  while (existsSync(path.join(GUIDES_DIR, `${slug}.mdx`))) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
  return slug;
}

function buildFrontmatter({ title, metaDescription, category, keywords, featuredProducts, pubDate }) {
  const yamlKeywords = keywords.map((k) => `  - ${JSON.stringify(k)}`).join('\n');
  const yamlFeatured = featuredProducts.map((k) => `  - ${JSON.stringify(k)}`).join('\n');

  return `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(metaDescription)}
category: ${JSON.stringify(category)}
pubDate: ${pubDate}
keywords:
${yamlKeywords || '  []'}
featuredProducts:
${yamlFeatured || '  []'}
image: ${JSON.stringify(CATEGORY_IMAGES[category])}
generatedBy: "ai-daily"
---`;
}

async function main() {
  if (!existsSync(GUIDES_DIR)) mkdirSync(GUIDES_DIR, { recursive: true });

  const products = loadProducts();
  const { category, seed, recentTitles } = pickTodaysTopic();

  console.log(`→ Catégorie du jour : ${category}`);
  console.log(`→ Angle : ${seed}`);

  const article = await generateArticle({ category, seed, recentTitles, products });

  const wordCount = article.body.split(/\s+/).filter(Boolean).length;
  console.log(`→ Article généré : "${article.title}" (${wordCount} mots)`);
  if (wordCount < 2000) {
    console.warn('⚠️  L\'article généré est plus court que prévu (< 2000 mots).');
  }

  const validProductKeys = products.map((p) => p.key);
  const { body: bodyWithComponents, imports } = insertAffiliateLinks(article.body, validProductKeys);

  const today = new Date().toISOString().slice(0, 10);
  const baseSlug = `${today}-${slugify(article.title)}`;
  const slug = ensureUniqueSlug(baseSlug);

  const featuredProducts = (article.featuredProducts || []).filter((k) => validProductKeys.includes(k));

  const frontmatter = buildFrontmatter({
    title: article.title,
    metaDescription: article.metaDescription,
    category,
    keywords: article.keywords || [],
    featuredProducts,
    pubDate: today,
  });

  const fileContent = [
    frontmatter,
    '',
    ...(imports.length ? [imports.join('\n'), ''] : []),
    bodyWithComponents.trim(),
    '',
  ].join('\n');

  const filePath = path.join(GUIDES_DIR, `${slug}.mdx`);
  writeFileSync(filePath, fileContent);
  console.log(`→ Fichier écrit : ${path.relative(ROOT, filePath)}`);

  saveUsedTopic({ date: today, category, seed, title: article.title, slug });
  console.log('→ Historique des sujets mis à jour.');
}

main().catch((err) => {
  console.error('Échec de la génération de l\'article :', err);
  process.exit(1);
});
