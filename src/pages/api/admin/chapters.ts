import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth';
import { getDb } from '../../../db';
import { chapters, chapterPages, mangas } from '../../../db/schema';
import { storage } from '../../../lib/storage';
import { eq } from 'drizzle-orm';
import { slugify } from '../../../lib/utils';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    requireAdmin(cookies);
    const formData = await request.formData();

    const mangaId = String(formData.get('mangaId') || '').trim();
    const chapterNumber = String(formData.get('chapterNumber') || '').trim();
    const title = String(formData.get('title') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const status = String(formData.get('status') || 'published');
    const publishedAtStr = String(formData.get('publishedAt') || '');
    const publishedAt = publishedAtStr ? new Date(publishedAtStr) : new Date();

    if (!mangaId || !chapterNumber) {
      return new Response(JSON.stringify({ error: 'Manga y número de capítulo son obligatorios.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pageFiles = formData.getAll('pages') as File[];
    if (pageFiles.length === 0) {
      return new Response(JSON.stringify({ error: 'Debes incluir al menos una página de imagen.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const dbUrl = process.env.DATABASE_URL;
    const hasDb = !!dbUrl && !dbUrl.includes('usuario:password') && !dbUrl.includes('ep-xyz');

    // Si la base de datos está conectada, ejecutamos las operaciones en Neon PostgreSQL
    if (hasDb) {
      const db = getDb();

      // Obtener datos del manga para la estructura de carpetas
      const manga = await db.query.mangas.findFirst({
        where: eq(mangas.id, mangaId),
      });

      const mangaSlug = manga?.slug || 'manga';
      const chapterSlug = `capitulo-${chapterNumber}`;

      // Insertar o actualizar capítulo
      const [newChapter] = await db
        .insert(chapters)
        .values({
          mangaId,
          chapterNumber,
          title: title || null,
          slug: chapterSlug,
          description: description || null,
          status,
          publishedAt,
        })
        .onConflictDoUpdate({
          target: [chapters.mangaId, chapters.chapterNumber],
          set: {
            title: title || null,
            status,
            publishedAt,
            updatedAt: new Date(),
          },
        })
        .returning();

      // Subir páginas al almacenamiento y registrar en chapterPages
      for (let i = 0; i < pageFiles.length; i++) {
        const file = pageFiles[i];
        const buffer = Buffer.from(await file.arrayBuffer());
        const ext = file.name.split('.').pop() || 'webp';
        const pageNumber = i + 1;
        const storageKey = `mangas/${mangaSlug}/ch${chapterNumber}/p${pageNumber}_${Date.now()}.${ext}`;

        const uploadResult = await storage.upload(buffer, storageKey, file.type || 'image/webp');

        await db.insert(chapterPages).values({
          chapterId: newChapter.id,
          pageNumber,
          storageKey: uploadResult.key,
          imageUrl: uploadResult.url,
        });
      }
    } else {
      // Modo desarrollo local sin base de datos
      console.log(`[Dev Fallback] Subiendo ${pageFiles.length} páginas para capítulo ${chapterNumber}...`);
      for (let i = 0; i < pageFiles.length; i++) {
        const file = pageFiles[i];
        const buffer = Buffer.from(await file.arrayBuffer());
        const storageKey = `mangas/dev/ch${chapterNumber}/p${i + 1}_${file.name}`;
        await storage.upload(buffer, storageKey, file.type || 'image/webp');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Capítulo registrado exitosamente.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error procesando subida de capítulo:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error en el servidor al guardar el capítulo.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
