import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site, url }) => {
  const sitemapUrl = new URL('/sitemap.xml', url.origin).href;
  const content = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: ${sitemapUrl}
`;

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
