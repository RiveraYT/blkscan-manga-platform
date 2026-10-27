import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth';
import { getDb } from '../../../db';
import { chapters, chapterPages, mangas } from '../../../db/schema';
import { storage } from '../../../lib/storage';
import { AdminService } from '../../../lib/services/admin.service';
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
      const mangaSlug = 'blue-lock';
      console.log(`[Dev Fallback] Subiendo ${pageFiles.length} páginas para capítulo ${chapterNumber}...`);
      for (let i = 0; i < pageFiles.length; i++) {
        const file = pageFiles[i];
        const buffer = Buffer.from(await file.arrayBuffer());
        const storageKey = `mangas/${mangaSlug}/ch${chapterNumber}/p${i + 1}_${file.name}`;
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

export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    requireAdmin(cookies);
    const formData = await request.formData();

    const chapterId = String(formData.get('chapterId') || '').trim();
    const chapterNumber = String(formData.get('chapterNumber') || '').trim();
    const title = String(formData.get('title') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const status = String(formData.get('status') || 'published') as 'draft' | 'published';
    const publishedAtStr = String(formData.get('publishedAt') || '');
    const publishedAt = publishedAtStr ? new Date(publishedAtStr) : new Date();
    const mangaSlug = String(formData.get('mangaSlug') || 'blue-lock').trim();

    if (!chapterId || !chapterNumber) {
      return new Response(JSON.stringify({ error: 'Datos de capítulo incompletos.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pagesOrderJson = String(formData.get('pagesOrder') || '[]');
    const pagesToKeep: { id: string; pageNumber: number }[] = JSON.parse(pagesOrderJson);

    const pagesToDeleteJson = String(formData.get('pagesToDelete') || '[]');
    const pagesToDelete: string[] = JSON.parse(pagesToDeleteJson);

    const newPageFiles = formData.getAll('newPages') as File[];
    const newPageNumbersJson = String(formData.get('newPageNumbers') || '[]');
    const newPageNumbers: number[] = JSON.parse(newPageNumbersJson);

    const newPages = [];
    for (let i = 0; i < newPageFiles.length; i++) {
      const file = newPageFiles[i];
      const buffer = Buffer.from(await file.arrayBuffer());
      newPages.push({
        buffer,
        name: file.name,
        contentType: file.type || 'image/webp',
        pageNumber: newPageNumbers[i] || (pagesToKeep.length + i + 1),
      });
    }

    await AdminService.updateChapter({
      chapterId,
      chapterNumber,
      title,
      description,
      status,
      publishedAt,
      pagesToKeep,
      pagesToDelete,
      newPages,
      mangaSlug,
    });

    return new Response(JSON.stringify({ success: true, message: 'Capítulo y páginas actualizados correctamente.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error al actualizar capítulo:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error al actualizar el capítulo.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    requireAdmin(cookies);
    const body = await request.json().catch(() => ({}));
    const url = new URL(request.url);
    const id = body.id || url.searchParams.get('id');
    const mangaSlug = body.mangaSlug || url.searchParams.get('mangaSlug') || 'blue-lock';
    const chapterNumber = body.chapterNumber || url.searchParams.get('chapterNumber');

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID de capítulo no especificado.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await AdminService.deleteChapter(id, mangaSlug, chapterNumber);

    return new Response(JSON.stringify({ success: true, message: 'Capítulo eliminado correctamente.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error al eliminar capítulo:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error en el servidor al eliminar el capítulo.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
