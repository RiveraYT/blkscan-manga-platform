import type { APIRoute } from 'astro';
import { MangaService } from '../lib/services/manga.service';

export const GET: APIRoute = async ({ url }) => {
  const origin = url.origin;
  const catalog = await MangaService.getCatalog({ limit: 100 });

  let urls = [
    `${origin}/`,
    `${origin}/mangas`,
    `${origin}/biblioteca`,
  ];

  catalog.items.forEach((item) => {
    urls.push(`${origin}/mangas/${item.manga.slug}`);
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
