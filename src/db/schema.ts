import { pgTable, uuid, varchar, text, numeric, integer, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// TABLA DE USUARIOS
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('reader').notNull(), // 'admin' | 'editor' | 'reader'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('users_email_idx').on(table.email),
]);

// TABLA DE MANGAS
export const mangas = pgTable('mangas', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  alternativeTitles: text('alternative_titles'),
  synopsis: text('synopsis').notNull(),
  author: varchar('author', { length: 255 }),
  artist: varchar('artist', { length: 255 }),
  genres: text('genres').notNull(), // Formato: "Acción, Deportes, Shonen, Drama"
  coverImageKey: text('cover_image_key').notNull(),
  coverImageUrl: text('cover_image_url').notNull(),
  status: varchar('status', { length: 50 }).default('publishing').notNull(), // 'publishing' | 'completed' | 'hiatus' | 'cancelled'
  featured: boolean('featured').default(false).notNull(),
  orderIndex: integer('order_index').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('mangas_slug_idx').on(table.slug),
  index('mangas_status_idx').on(table.status),
  index('mangas_featured_idx').on(table.featured),
]);

// TABLA DE CAPÍTULOS
export const chapters = pgTable('chapters', {
  id: uuid('id').defaultRandom().primaryKey(),
  mangaId: uuid('manga_id').references(() => mangas.id, { onDelete: 'cascade' }).notNull(),
  chapterNumber: numeric('chapter_number', { precision: 7, scale: 2 }).notNull(), // Admite 1, 1.5, 120, etc.
  title: varchar('title', { length: 255 }),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('draft').notNull(), // 'draft' | 'published' | 'scheduled'
  publishedAt: timestamp('published_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('chapters_manga_number_idx').on(table.mangaId, table.chapterNumber),
  index('chapters_manga_id_idx').on(table.mangaId),
  index('chapters_status_idx').on(table.status),
  index('chapters_published_at_idx').on(table.publishedAt),
]);

// TABLA DE PÁGINAS DEL CAPÍTULO
export const chapterPages = pgTable('chapter_pages', {
  id: uuid('id').defaultRandom().primaryKey(),
  chapterId: uuid('chapter_id').references(() => chapters.id, { onDelete: 'cascade' }).notNull(),
  pageNumber: integer('page_number').notNull(),
  storageKey: text('storage_key').notNull(),
  imageUrl: text('image_url').notNull(),
  width: integer('width'),
  height: integer('height'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('chapter_pages_order_idx').on(table.chapterId, table.pageNumber),
  index('chapter_pages_chapter_id_idx').on(table.chapterId),
]);

// HISTORIAL DE LECTURA (Usuario registrado o invitado con sesión)
export const readingHistory = pgTable('reading_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  anonymousSessionId: varchar('anonymous_session_id', { length: 255 }),
  mangaId: uuid('manga_id').references(() => mangas.id, { onDelete: 'cascade' }).notNull(),
  chapterId: uuid('chapter_id').references(() => chapters.id, { onDelete: 'cascade' }).notNull(),
  lastPage: integer('last_page').default(1).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('reading_history_user_idx').on(table.userId),
  index('reading_history_session_idx').on(table.anonymousSessionId),
  index('reading_history_manga_idx').on(table.mangaId),
]);

// PREFERENCIAS DE LECTURA
export const readingPreferences = pgTable('reading_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  anonymousSessionId: varchar('anonymous_session_id', { length: 255 }),
  readingMode: varchar('reading_mode', { length: 50 }).default('single').notNull(), // 'single' | 'double' | 'vertical' | 'fit'
  readingDirection: varchar('reading_direction', { length: 10 }).default('ltr').notNull(), // 'ltr' | 'rtl'
  imageFit: varchar('image_fit', { length: 20 }).default('width').notNull(), // 'width' | 'height' | 'original'
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// RELACIONES
export const usersRelations = relations(users, ({ many }) => ({
  readingHistories: many(readingHistory),
  readingPreferences: many(readingPreferences),
}));

export const mangasRelations = relations(mangas, ({ many }) => ({
  chapters: many(chapters),
  readingHistories: many(readingHistory),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  manga: one(mangas, {
    fields: [chapters.mangaId],
    references: [mangas.id],
  }),
  pages: many(chapterPages),
  readingHistories: many(readingHistory),
}));

export const chapterPagesRelations = relations(chapterPages, ({ one }) => ({
  chapter: one(chapters, {
    fields: [chapterPages.chapterId],
    references: [chapters.id],
  }),
}));

export const readingHistoryRelations = relations(readingHistory, ({ one }) => ({
  user: one(users, {
    fields: [readingHistory.userId],
    references: [users.id],
  }),
  manga: one(mangas, {
    fields: [readingHistory.mangaId],
    references: [mangas.id],
  }),
  chapter: one(chapters, {
    fields: [readingHistory.chapterId],
    references: [chapters.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Manga = typeof mangas.$inferSelect;
export type NewManga = typeof mangas.$inferInsert;
export type Chapter = typeof chapters.$inferSelect;
export type NewChapter = typeof chapters.$inferInsert;
export type ChapterPage = typeof chapterPages.$inferSelect;
export type NewChapterPage = typeof chapterPages.$inferInsert;
export type ReadingHistory = typeof readingHistory.$inferSelect;
export type ReadingPreference = typeof readingPreferences.$inferSelect;
