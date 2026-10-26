import { eq, desc, asc, and, ilike, sql } from 'drizzle-orm';
import { getDb } from '../../db';
import { mangas, chapters, chapterPages, readingHistory, readingPreferences } from '../../db/schema';
import type { Manga, Chapter, ChapterPage } from '../../db/schema';

// Fallback demo dataset para desarrollo cuando DATABASE_URL no esté configurada aún en .env
const DEMO_MANGA: Manga = {
  id: 'a0000000-0000-0000-0000-000000000001',
  slug: 'blue-lock',
  title: 'Blue Lock',
  alternativeTitles: 'ブルーロック, Blue Lock: Egoist Striker',
  synopsis: 'Tras la eliminación de Japón en el Mundial de 2018, la Unión de Fútbol de Japón contrata al excéntrico y enigmático entrenador Ego Jinpachi con un único objetivo: ganar la Copa del Mundo. Para ello nace Blue Lock, una revolucionaria prisión de máxima seguridad donde 300 de los mejores delanteros de secundaria competirán a muerte. Solo aquel que despierte su egoísmo más puro se convertirá en el delantero definitivo.',
  author: 'Muneyuki Kaneshiro',
  artist: 'Yusuke Nomura',
  genres: 'Deportes, Shonen, Psicológico, Acción, Drama',
  coverImageKey: 'mangas/blue-lock/cover.webp',
  coverImageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=800&auto=format&fit=crop',
  status: 'publishing',
  featured: true,
  orderIndex: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const DEMO_CHAPTERS: (Chapter & { pages?: ChapterPage[] })[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    mangaId: DEMO_MANGA.id,
    chapterNumber: '1',
    title: 'Sueño',
    slug: 'capitulo-1',
    description: 'Yoichi Isagi duda sobre su filosofía de juego en equipo tras perder la final prefectural. Una extraña carta cambiará su destino.',
    status: 'published',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
    createdAt: new Date(),
    updatedAt: new Date(),
    pages: [
      { id: 'p1', chapterId: 'c1', pageNumber: 1, storageKey: 'p1', imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop', width: 1200, height: 1800, createdAt: new Date() },
      { id: 'p2', chapterId: 'c1', pageNumber: 2, storageKey: 'p2', imageUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200&auto=format&fit=crop', width: 1200, height: 1800, createdAt: new Date() },
      { id: 'p3', chapterId: 'c1', pageNumber: 3, storageKey: 'p3', imageUrl: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?q=80&w=1200&auto=format&fit=crop', width: 1200, height: 1800, createdAt: new Date() },
      { id: 'p4', chapterId: 'c1', pageNumber: 4, storageKey: 'p4', imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=1200&auto=format&fit=crop', width: 1200, height: 1800, createdAt: new Date() },
      { id: 'p5', chapterId: 'c1', pageNumber: 5, storageKey: 'p5', imageUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=1200&auto=format&fit=crop', width: 1200, height: 1800, createdAt: new Date() },
    ],
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    mangaId: DEMO_MANGA.id,
    chapterNumber: '2',
    title: 'Monstruo',
    slug: 'capitulo-2',
    description: 'La prueba de expulsión inicia dentro de la celda de la habitación Z: el juego de la mancha con balón.',
    status: 'published',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    createdAt: new Date(),
    updatedAt: new Date(),
    pages: [
      { id: 'p6', chapterId: 'c2', pageNumber: 1, storageKey: 'p6', imageUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=1200&auto=format&fit=crop', width: 1200, height: 1800, createdAt: new Date() },
      { id: 'p7', chapterId: 'c2', pageNumber: 2, storageKey: 'p7', imageUrl: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?q=80&w=1200&auto=format&fit=crop', width: 1200, height: 1800, createdAt: new Date() },
      { id: 'p8', chapterId: 'c2', pageNumber: 3, storageKey: 'p8', imageUrl: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?q=80&w=1200&auto=format&fit=crop', width: 1200, height: 1800, createdAt: new Date() },
      { id: 'p9', chapterId: 'c2', pageNumber: 4, storageKey: 'p9', imageUrl: 'https://images.unsplash.com/photo-1518091043644-c1d4457512c6?q=80&w=1200&auto=format&fit=crop', width: 1200, height: 1800, createdAt: new Date() },
    ],
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    mangaId: DEMO_MANGA.id,
    chapterNumber: '3',
    title: 'El Despertar del Ego',
    slug: 'capitulo-3',
    description: 'Capítulo en edición y revisión técnica.',
    status: 'draft',
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    pages: [],
  },
];

export class MangaService {
  private static hasDbConnection(): boolean {
    return !!process.env.DATABASE_URL;
  }

  /**
   * Obtiene el manga destacado para el Hero Banner de la portada (Blue Lock).
   */
  static async getFeaturedManga(): Promise<{ manga: Manga; totalChapters: number; firstChapterNumber?: string } | null> {
    if (!this.hasDbConnection()) {
      return {
        manga: DEMO_MANGA,
        totalChapters: DEMO_CHAPTERS.filter((c) => c.status === 'published').length,
        firstChapterNumber: '1',
      };
    }

    try {
      const db = getDb();
      const manga = await db.query.mangas.findFirst({
        where: eq(mangas.featured, true),
      }) || await db.query.mangas.findFirst();

      if (!manga) return null;

      const publishedChapters = await db.query.chapters.findMany({
        where: and(eq(chapters.mangaId, manga.id), eq(chapters.status, 'published')),
        orderBy: [asc(chapters.chapterNumber)],
      });

      return {
        manga,
        totalChapters: publishedChapters.length,
        firstChapterNumber: publishedChapters[0]?.chapterNumber || '1',
      };
    } catch (e) {
      console.error('Error en getFeaturedManga, usando fallback:', e);
      return {
        manga: DEMO_MANGA,
        totalChapters: DEMO_CHAPTERS.filter((c) => c.status === 'published').length,
        firstChapterNumber: '1',
      };
    }
  }

  /**
   * Obtiene los últimos capítulos publicados para la página de inicio.
   */
  static async getLatestChapters(limit = 12) {
    if (!this.hasDbConnection()) {
      return DEMO_CHAPTERS
        .filter((c) => c.status === 'published')
        .slice(0, limit)
        .map((c) => ({
          chapter: c,
          manga: DEMO_MANGA,
        }));
    }

    try {
      const db = getDb();
      const results = await db
        .select({
          chapter: chapters,
          manga: mangas,
        })
        .from(chapters)
        .innerJoin(mangas, eq(chapters.mangaId, mangas.id))
        .where(eq(chapters.status, 'published'))
        .orderBy(desc(chapters.publishedAt))
        .limit(limit);

      return results;
    } catch (e) {
      console.error('Error en getLatestChapters:', e);
      return [];
    }
  }

  /**
   * Catálogo con filtros de género, estado, búsqueda y paginación.
   */
  static async getCatalog(params: {
    search?: string;
    genre?: string;
    status?: string;
    sortBy?: 'updated' | 'title' | 'chapters';
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, params.limit || 12);
    const offset = (page - 1) * limit;

    if (!this.hasDbConnection()) {
      let list = [DEMO_MANGA];
      if (params.search) {
        const s = params.search.toLowerCase();
        list = list.filter((m) => m.title.toLowerCase().includes(s) || m.synopsis.toLowerCase().includes(s));
      }
      if (params.genre) {
        list = list.filter((m) => m.genres.toLowerCase().includes(params.genre!.toLowerCase()));
      }
      if (params.status && params.status !== 'all') {
        list = list.filter((m) => m.status === params.status);
      }
      return {
        items: list.map((m) => ({
          manga: m,
          chapterCount: DEMO_CHAPTERS.filter((c) => c.status === 'published').length,
          lastChapter: DEMO_CHAPTERS[1],
        })),
        total: list.length,
        page,
        totalPages: Math.ceil(list.length / limit),
      };
    }

    try {
      const db = getDb();
      const conditions = [];

      if (params.search) {
        conditions.push(ilike(mangas.title, `%${params.search}%`));
      }
      if (params.genre) {
        conditions.push(ilike(mangas.genres, `%${params.genre}%`));
      }
      if (params.status && params.status !== 'all') {
        conditions.push(eq(mangas.status, params.status));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const orderClause = params.sortBy === 'title' 
        ? [asc(mangas.title)] 
        : [desc(mangas.updatedAt)];

      const rawMangas = await db.query.mangas.findMany({
        where: whereClause,
        orderBy: orderClause,
        limit,
        offset,
      });

      const totalResult = await db.select({ count: sql<number>`count(*)` }).from(mangas).where(whereClause);
      const total = Number(totalResult[0]?.count || 0);

      const items = await Promise.all(
        rawMangas.map(async (m) => {
          const chaps = await db.query.chapters.findMany({
            where: and(eq(chapters.mangaId, m.id), eq(chapters.status, 'published')),
            orderBy: [desc(chapters.chapterNumber)],
            limit: 1,
          });
          const countRes = await db.select({ count: sql<number>`count(*)` }).from(chapters).where(
            and(eq(chapters.mangaId, m.id), eq(chapters.status, 'published'))
          );
          return {
            manga: m,
            chapterCount: Number(countRes[0]?.count || 0),
            lastChapter: chaps[0] || null,
          };
        })
      );

      return {
        items,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (e) {
      console.error('Error en getCatalog:', e);
      return { items: [], total: 0, page: 1, totalPages: 1 };
    }
  }

  /**
   * Obtiene la ficha completa de un manga por su slug, con sus capítulos.
   */
  static async getMangaBySlug(slug: string, includeDrafts = false) {
    if (!this.hasDbConnection()) {
      if (slug !== 'blue-lock') return null;
      const chaps = DEMO_CHAPTERS.filter((c) => includeDrafts || c.status === 'published');
      return {
        manga: DEMO_MANGA,
        chapters: chaps,
      };
    }

    try {
      const db = getDb();
      const manga = await db.query.mangas.findFirst({
        where: eq(mangas.slug, slug),
      });

      if (!manga) return null;

      const conditions = [eq(chapters.mangaId, manga.id)];
      if (!includeDrafts) {
        conditions.push(eq(chapters.status, 'published'));
      }

      const mangaChapters = await db.query.chapters.findMany({
        where: and(...conditions),
        orderBy: [desc(chapters.chapterNumber)],
      });

      return {
        manga,
        chapters: mangaChapters,
      };
    } catch (e) {
      console.error('Error en getMangaBySlug:', e);
      return null;
    }
  }

  /**
   * Obtiene los datos del capítulo y todas sus páginas ordenadas para el Lector de Manga.
   */
  static async getChapterForReader(mangaSlug: string, chapterNumber: string | number) {
    const numStr = String(chapterNumber);

    if (!this.hasDbConnection()) {
      if (mangaSlug !== 'blue-lock') return null;
      const chapter = DEMO_CHAPTERS.find((c) => String(c.chapterNumber) === numStr);
      if (!chapter) return null;

      const allChaps = DEMO_CHAPTERS.filter((c) => c.status === 'published').sort((a, b) => Number(a.chapterNumber) - Number(b.chapterNumber));
      const currentIndex = allChaps.findIndex((c) => c.id === chapter.id);

      return {
        manga: DEMO_MANGA,
        chapter,
        pages: chapter.pages || [],
        prevChapter: currentIndex > 0 ? allChaps[currentIndex - 1] : null,
        nextChapter: currentIndex < allChaps.length - 1 ? allChaps[currentIndex + 1] : null,
        allChapters: allChaps.map((c) => ({
          id: c.id,
          chapterNumber: String(c.chapterNumber),
          title: c.title,
        })),
      };
    }

    try {
      const db = getDb();
      const manga = await db.query.mangas.findFirst({
        where: eq(mangas.slug, mangaSlug),
      });
      if (!manga) return null;

      const chapter = await db.query.chapters.findFirst({
        where: and(eq(chapters.mangaId, manga.id), eq(chapters.chapterNumber, numStr)),
      });
      if (!chapter) return null;

      const pages = await db.query.chapterPages.findMany({
        where: eq(chapterPages.chapterId, chapter.id),
        orderBy: [asc(chapterPages.pageNumber)],
      });

      const allChaps = await db.query.chapters.findMany({
        where: and(eq(chapters.mangaId, manga.id), eq(chapters.status, 'published')),
        orderBy: [asc(chapters.chapterNumber)],
      });

      const currentIndex = allChaps.findIndex((c) => c.id === chapter.id);

      return {
        manga,
        chapter,
        pages,
        prevChapter: currentIndex > 0 ? allChaps[currentIndex - 1] : null,
        nextChapter: currentIndex < allChaps.length - 1 ? allChaps[currentIndex + 1] : null,
        allChapters: allChaps.map((c) => ({
          id: c.id,
          chapterNumber: String(c.chapterNumber),
          title: c.title,
        })),
      };
    } catch (e) {
      console.error('Error en getChapterForReader:', e);
      return null;
    }
  }
}
