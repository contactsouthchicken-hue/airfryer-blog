// @ts-check
import { defineConfig } from 'astro/config';

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Domaine du site (à acheter chez un registrar : Gandi, OVH, Namecheap...).
// Utilisée pour générer le sitemap.xml, les balises canonical et les URLs Open Graph.
const SITE_URL = 'https://guide-airfryer.fr';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  integrations: [mdx(), sitemap()],

  vite: {
    plugins: [tailwindcss()]
  }
});