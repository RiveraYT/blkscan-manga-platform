import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth';
import { getDb } from '../../../db';
import { mangas } from '../../../db/schema';
import { storage } from '../../../lib/storage';
import { slugify } from '../../../lib/utils';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    requireAdmin(cookies);
    const formData = await request.formData();

    const title = String(formData.get('title') || '').trim();
    const slug = slugify(String(formData.get('slug') || title));
    const alternativeTitles = String(formData.get('alternativeTitles') || '').trim();
    const synopsis = String(formData.get('synopsis') || '').trim();
    const author = String(formData.get('author') || '').trim();
    const artist = String(formData.get('artist') || '').trim();
    const genres = String(formData.get('genres') || '').trim();
    const status = String(formData.get('status') || 'publishing');
    const featured = formData.get('featured') === 'true';

    let coverImageUrl = String(formData.get('coverUrl') || '').trim();
    let coverImageKey = `mangas/${slug}/cover.webp`;

    const coverFile = formData.get('coverFile') as File | null;
    if (coverFile && coverFile.size > 0) {
      const buffer = Buffer.from(await coverFile.arrayBuffer());
      const ext = coverFile.name.split('.').pop() || 'webp';
      coverImageKey = `mangas/${slug}/cover-${Date.now()}.${ext}`;
      const uploadRes = await storage.upload(buffer, coverImageKey, coverFile.type || 'image/webp');
      coverImageUrl = uploadRes.url;
    }

    if (!coverImageUrl) {
      coverImageUrl = 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop';
    }

    if (process.env.DATABASE_URL) {
      const db = getDb();
      await db.insert(mangas).values({
        title,
        slug,
        alternativeTitles,
        synopsis,
        author,
        artist,
        genres,
        status,
        featured,
        coverImageKey,
        coverImageUrl,
      });
    }

    return redirect('/admin/mangas');
  } catch (error) {
    console.error('Error al guardar manga:', error);
    return new Response(JSON.stringify({ error: 'Error al registrar el manga' }), { status: 500 });
  }
};
