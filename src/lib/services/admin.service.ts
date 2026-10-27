import { eq, desc, asc, sql, count } from 'drizzle-orm';
import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '../../db';
import { mangas, chapters, chapterPages, users } from '../../db/schema';
import type { Manga, Chapter, ChapterPage } from '../../db/schema';
import { storage } from '../storage';
import { getAllDemoChapters } from './manga.service';

export class AdminService {
  private static hasDb(): boolean {
    const url = process.env.DATABASE_URL;
    return !!url && !url.includes('usuario:password') && !url.includes('ep-xyz');
  }

  /**
   * Obtiene estadísticas reales del dashboard administrativo.
   */
  static async getDashboardStats() {
    if (!this.hasDb()) {
      const all = getAllDemoChapters('blue-lock');
      const published = all.filter((c) => c.status === 'published');
      const drafts = all.filter((c) => c.status === 'draft');
      const sortedDesc = [...all].sort((a, b) => Number(b.chapterNumber) - Number(a.chapterNumber));

      return {
        totalMangas: 1,
        totalChapters: all.length,
        publishedChapters: published.length,
        draftChapters: drafts.length,
        recentMangas: [
          {
            id: 'm1',
            title: 'Blue Lock',
            slug: 'blue-lock',
            status: 'publishing',
            updatedAt: new Date(),
          },
        ],
        recentChapters: sortedDesc.slice(0, 5).map((ch) => ({
          id: ch.id,
          mangaTitle: 'Blue Lock',
          chapterNumber: String(ch.chapterNumber),
          title: ch.title,
          status: ch.status,
          publishedAt: ch.publishedAt,
        })),
      };
    }

    try {
      const db = getDb();

      const [mangaCountRes] = await db.select({ value: count() }).from(mangas);
      const [chapterCountRes] = await db.select({ value: count() }).from(chapters);
      const [publishedRes] = await db
        .select({ value: count() })
        .from(chapters)
        .where(eq(chapters.status, 'published'));
      const [draftRes] = await db
        .select({ value: count() })
        .from(chapters)
        .where(eq(chapters.status, 'draft'));

      const recentMangas = await db.query.mangas.findMany({
        orderBy: [desc(mangas.updatedAt)],
        limit: 5,
      });

      const recentChapters = await db
        .select({
          id: chapters.id,
          mangaTitle: mangas.title,
          chapterNumber: chapters.chapterNumber,
          title: chapters.title,
          status: chapters.status,
          publishedAt: chapters.publishedAt,
        })
        .from(chapters)
        .innerJoin(mangas, eq(chapters.mangaId, mangas.id))
        .orderBy(desc(chapters.createdAt))
        .limit(5);

      return {
        totalMangas: Number(mangaCountRes?.value || 0),
        totalChapters: Number(chapterCountRes?.value || 0),
        publishedChapters: Number(publishedRes?.value || 0),
        draftChapters: Number(draftRes?.value || 0),
        recentMangas,
        recentChapters,
      };
    } catch (e) {
      console.error('Error al consultar estadísticas del dashboard:', e);
      return {
        totalMangas: 0,
        totalChapters: 0,
        publishedChapters: 0,
        draftChapters: 0,
        recentMangas: [],
        recentChapters: [],
      };
    }
  }

  /**
   * Obtiene todos los mangas para la tabla de administración.
   */
  static async getAllMangas() {
    if (!this.hasDb()) {
      const all = getAllDemoChapters('blue-lock');
      return [
        {
          id: 'demo-1',
          title: 'Blue Lock',
          slug: 'blue-lock',
          genres: 'Deportes, Shonen, Psicológico',
          status: 'publishing',
          coverImageUrl: '/images/blue-lock-cover.jpg',
          chapterCount: all.length,
          updatedAt: new Date(),
        },
      ];
    }

    const db = getDb();
    const allMangas = await db.query.mangas.findMany({
      orderBy: [desc(mangas.updatedAt)],
    });

    return Promise.all(
      allMangas.map(async (m) => {
        const [cRes] = await db.select({ value: count() }).from(chapters).where(eq(chapters.mangaId, m.id));
        return {
          ...m,
          chapterCount: Number(cRes?.value || 0),
        };
      })
    );
  }

  /**
   * Obtiene todos los capítulos con opción de filtrar por mangaId.
   */
  static async getChapters(mangaId?: string) {
    if (!this.hasDb()) {
      const all = getAllDemoChapters('blue-lock');
      return all
        .sort((a, b) => Number(b.chapterNumber) - Number(a.chapterNumber))
        .map((c) => ({
          id: c.id,
          mangaId: 'demo-1',
          mangaTitle: 'Blue Lock',
          mangaSlug: 'blue-lock',
          chapterNumber: String(c.chapterNumber),
          title: c.title,
          status: c.status,
          publishedAt: c.publishedAt,
          pagesCount: (c.pages || []).length,
        }));
    }

    const db = getDb();
    const query = db
      .select({
        id: chapters.id,
        mangaId: chapters.mangaId,
        mangaTitle: mangas.title,
        mangaSlug: mangas.slug,
        chapterNumber: chapters.chapterNumber,
        title: chapters.title,
        status: chapters.status,
        publishedAt: chapters.publishedAt,
      })
      .from(chapters)
      .innerJoin(mangas, eq(chapters.mangaId, mangas.id))
      .orderBy(desc(chapters.chapterNumber));

    if (mangaId) {
      query.where(eq(chapters.mangaId, mangaId));
    }

    const results = await query;

    return Promise.all(
      results.map(async (c) => {
        const [pagesRes] = await db.select({ value: count() }).from(chapterPages).where(eq(chapterPages.chapterId, c.id));
        return {
          ...c,
          pagesCount: Number(pagesRes?.value || 0),
        };
      })
    );
  }

  /**
   * Elimina un manga y limpia sus imágenes en almacenamiento.
   */
  static async deleteManga(id: string) {
    if (!this.hasDb()) return true;
    const db = getDb();

    // Obtener páginas de todos los capítulos para limpiar storage
    const chaps = await db.query.chapters.findMany({ where: eq(chapters.mangaId, id) });
    for (const ch of chaps) {
      const pages = await db.query.chapterPages.findMany({ where: eq(chapterPages.chapterId, ch.id) });
      for (const p of pages) {
        if (p.storageKey) await storage.delete(p.storageKey);
      }
    }

    const manga = await db.query.mangas.findFirst({ where: eq(mangas.id, id) });
    if (manga?.coverImageKey) {
      await storage.delete(manga.coverImageKey);
    }

    await db.delete(mangas).where(eq(mangas.id, id));
    return true;
  }

  /**
   * Obtiene un capítulo por ID con todas sus páginas ordenadas para edición.
   */
  static async getChapterById(id: string) {
    if (!this.hasDb()) {
      const all = getAllDemoChapters('blue-lock');
      const cleanId = id.trim();
      const found = all.find(
        (c) => c.id === cleanId || String(c.chapterNumber) === cleanId || c.id === `local-ch-${cleanId}`
      );
      if (!found) return null;

      return {
        chapter: {
          id: found.id,
          mangaId: 'demo-1',
          mangaTitle: 'Blue Lock',
          mangaSlug: 'blue-lock',
          chapterNumber: String(found.chapterNumber),
          title: found.title,
          description: found.description,
          status: found.status,
          publishedAt: found.publishedAt,
        },
        pages: (found.pages || []).map((p, idx) => ({
          id: p.id,
          pageNumber: p.pageNumber || idx + 1,
          imageUrl: p.imageUrl,
          storageKey: p.storageKey,
        })),
      };
    }

    try {
      const db = getDb();
      let chapter = await db.query.chapters.findFirst({
        where: eq(chapters.id, id),
      });

      if (!chapter) {
        // Intentar buscar por número de capítulo
        chapter = await db.query.chapters.findFirst({
          where: eq(chapters.chapterNumber, id),
        });
      }

      if (!chapter) return null;

      const manga = await db.query.mangas.findFirst({
        where: eq(mangas.id, chapter.mangaId),
      });

      const pages = await db.query.chapterPages.findMany({
        where: eq(chapterPages.chapterId, chapter.id),
        orderBy: [asc(chapterPages.pageNumber)],
      });

      return {
        chapter: {
          id: chapter.id,
          mangaId: chapter.mangaId,
          mangaTitle: manga?.title || 'Manga',
          mangaSlug: manga?.slug || 'blue-lock',
          chapterNumber: String(chapter.chapterNumber),
          title: chapter.title,
          description: chapter.description,
          status: chapter.status,
          publishedAt: chapter.publishedAt,
        },
        pages: pages.map((p) => ({
          id: p.id,
          pageNumber: p.pageNumber,
          imageUrl: p.imageUrl,
          storageKey: p.storageKey,
        })),
      };
    } catch (e) {
      console.error('Error al obtener capítulo por ID:', e);
      return null;
    }
  }

  /**
   * Elimina un capítulo y sus imágenes asociadas tanto en almacenamiento como en BD.
   */
  static async deleteChapter(id: string, mangaSlug = 'blue-lock', chapterNumber?: string) {
    // 1. Limpieza en sistema de archivos local si existe la carpeta
    try {
      const chNum = chapterNumber || id.replace('local-ch-', '').replace('c', '');
      const localDir = path.resolve(process.cwd(), 'public/uploads/mangas', mangaSlug, `ch${chNum}`);
      if (fs.existsSync(localDir)) {
        fs.rmSync(localDir, { recursive: true, force: true });
        console.log(`[Admin] Carpeta local eliminada: ${localDir}`);
      }
    } catch (err) {
      console.warn('Advertencia limpiando carpeta local:', err);
    }

    if (!this.hasDb()) {
      return true;
    }

    try {
      const db = getDb();
      let chapter = await db.query.chapters.findFirst({ where: eq(chapters.id, id) });
      if (!chapter && chapterNumber) {
        chapter = await db.query.chapters.findFirst({ where: eq(chapters.chapterNumber, chapterNumber) });
      }
      const targetId = chapter ? chapter.id : id;

      const pages = await db.query.chapterPages.findMany({ where: eq(chapterPages.chapterId, targetId) });
      for (const p of pages) {
        if (p.storageKey) await storage.delete(p.storageKey).catch(() => {});
      }

      await db.delete(chapterPages).where(eq(chapterPages.chapterId, targetId));
      await db.delete(chapters).where(eq(chapters.id, targetId));
      return true;
    } catch (e) {
      console.error('Error al eliminar capítulo de la base de datos:', e);
      throw e;
    }
  }

  /**
   * Actualiza los datos de un capítulo, reordena páginas, elimina páginas y agrega nuevas páginas.
   */
  static async updateChapter(params: {
    chapterId: string;
    chapterNumber: string;
    title?: string;
    description?: string;
    status: 'draft' | 'published';
    publishedAt?: Date;
    pagesToKeep: { id: string; pageNumber: number }[];
    pagesToDelete: string[];
    newPages?: { buffer: Buffer; name: string; contentType: string; pageNumber: number }[];
    mangaSlug?: string;
  }) {
    const {
      chapterId,
      chapterNumber,
      title,
      description,
      status: chStatus,
      publishedAt = new Date(),
      pagesToKeep,
      pagesToDelete,
      newPages = [],
      mangaSlug = 'blue-lock',
    } = params;

    if (!this.hasDb()) {
      // Modo local: guardamos las nuevas páginas en public/uploads
      const localDir = path.resolve(process.cwd(), 'public/uploads/mangas', mangaSlug, `ch${chapterNumber}`);
      fs.mkdirSync(localDir, { recursive: true });

      // Eliminar páginas locales marcadas
      if (fs.existsSync(localDir)) {
        const files = fs.readdirSync(localDir);
        for (const item of pagesToDelete) {
          for (const f of files) {
            if (f === item || item.includes(f) || f.includes(item)) {
              try {
                fs.unlinkSync(path.join(localDir, f));
                console.log(`[Admin] Archivo local eliminado: ${f}`);
              } catch {}
            }
          }
        }
      }

      // Guardar páginas nuevas
      for (const np of newPages) {
        const dest = path.join(localDir, `p${String(np.pageNumber).padStart(3, '0')}_${Date.now()}_${np.name}`);
        fs.writeFileSync(dest, np.buffer);
      }

      return true;
    }

    const db = getDb();

    // 1. Actualizar metadatos del capítulo
    await db
      .update(chapters)
      .set({
        chapterNumber,
        title: title || null,
        description: description || null,
        status: chStatus,
        publishedAt,
        slug: `capitulo-${chapterNumber}`,
        updatedAt: new Date(),
      })
      .where(eq(chapters.id, chapterId));

    // 2. Eliminar páginas marcadas para borrar
    for (const pageIdOrKey of pagesToDelete) {
      if (pageIdOrKey.includes('/') || pageIdOrKey.includes('\\')) {
        await storage.delete(pageIdOrKey).catch(() => {});
      }
      const page = await db.query.chapterPages.findFirst({
        where: eq(chapterPages.id, pageIdOrKey),
      });
      if (page) {
        if (page.storageKey) {
          await storage.delete(page.storageKey).catch(() => {});
        }
        await db.delete(chapterPages).where(eq(chapterPages.id, pageIdOrKey));
      }
    }

    // 3. Reordenar páginas existentes que se conservan
    for (const item of pagesToKeep) {
      await db
        .update(chapterPages)
        .set({ pageNumber: item.pageNumber })
        .where(eq(chapterPages.id, item.id));
    }

    // 4. Subir y registrar nuevas páginas
    for (const np of newPages) {
      const ext = np.name.split('.').pop() || 'webp';
      const storageKey = `mangas/${mangaSlug}/ch${chapterNumber}/p${np.pageNumber}_${Date.now()}.${ext}`;
      const uploadRes = await storage.upload(np.buffer, storageKey, np.contentType);

      await db.insert(chapterPages).values({
        chapterId,
        pageNumber: np.pageNumber,
        storageKey: uploadRes.key,
        imageUrl: uploadRes.url,
      });
    }

    return true;
  }
}
