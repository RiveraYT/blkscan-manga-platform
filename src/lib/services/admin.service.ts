import { eq, desc, sql, count } from 'drizzle-orm';
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
   * Elimina un capítulo y sus imágenes asociadas.
   */
  static async deleteChapter(id: string) {
    if (!this.hasDb()) return true;
    const db = getDb();

    const pages = await db.query.chapterPages.findMany({ where: eq(chapterPages.chapterId, id) });
    for (const p of pages) {
      if (p.storageKey) await storage.delete(p.storageKey);
    }

    await db.delete(chapters).where(eq(chapters.id, id));
    return true;
  }
}
