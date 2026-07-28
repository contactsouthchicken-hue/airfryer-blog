import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const guides = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // Doit correspondre à un slug défini dans src/data/site.ts (CATEGORIES)
    category: z.enum(['comparatifs', 'guides-complets', 'avis', 'astuces']),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    // Mots-clés ciblés pour le SEO (utilisés dans les meta keywords et le maillage interne)
    keywords: z.array(z.string()).default([]),
    // Clés produits (voir src/data/products.json) mises en avant dans l'article
    featuredProducts: z.array(z.string()).default([]),
    image: z.string().default('/images/products/placeholder.svg'),
    draft: z.boolean().default(false),
    // Rempli automatiquement par le script de génération quotidien
    generatedBy: z.enum(['manual', 'ai-daily']).default('manual'),
  }),
});

export const collections = { guides };
