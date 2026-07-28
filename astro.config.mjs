// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// IMPORTANT : remplace cette URL par ton vrai nom de domaine une fois acheté.
// Elle est utilisée pour générer le sitemap.xml, les balises canonical et les URLs Open Graph.
const SITE_URL = 'https://exemple-airfryer-guide.fr';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [mdx(), sitemap()],

  vite: {
    plugins: [tailwindcss()]
  }
});