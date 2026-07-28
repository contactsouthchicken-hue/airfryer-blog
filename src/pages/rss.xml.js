import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../data/site';

export async function GET(context) {
  const guides = await getCollection('guides', ({ data }) => !data.draft);
  return rss({
    title: SITE.name,
    description: SITE.description,
    site: context.site,
    items: guides
      .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
      .map((guide) => ({
        title: guide.data.title,
        description: guide.data.description,
        pubDate: guide.data.pubDate,
        link: `/guides/${guide.id}/`,
      })),
  });
}
