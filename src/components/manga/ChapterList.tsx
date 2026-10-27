import React, { useState, useMemo, useEffect } from 'react';

interface ChapterItem {
  id: string;
  chapterNumber: string;
  title: string | null;
  slug: string;
  publishedAt: string | Date;
}

interface ChapterListProps {
  chapters: ChapterItem[];
  mangaSlug: string;
}

export default function ChapterList({ chapters, mangaSlug }: ChapterListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [lastReadChapter, setLastReadChapter] = useState<string | null>(null);

  // Leer historial guardado localmente
  useEffect(() => {
    try {
      const historyStr = localStorage.getItem(`blk_read_${mangaSlug}`);
      if (historyStr) {
        const hist = JSON.parse(historyStr);
        if (hist.chapterNumber) {
          setLastReadChapter(String(hist.chapterNumber));
        }
      }
    } catch {
      // ignore
    }
  }, [mangaSlug]);

  const filteredAndSorted = useMemo(() => {
    let result = [...chapters];

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.chapterNumber.includes(term) ||
          (c.title && c.title.toLowerCase().includes(term))
      );
    }

    result.sort((a, b) => {
      const numA = parseFloat(a.chapterNumber) || 0;
      const numB = parseFloat(b.chapterNumber) || 0;
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });

    return result;
  }, [chapters, searchTerm, sortOrder]);

  const firstChapter = useMemo(() => {
    if (!chapters.length) return null;
    const sorted = [...chapters].sort(
      (a, b) => (parseFloat(a.chapterNumber) || 0) - (parseFloat(b.chapterNumber) || 0)
    );
    return sorted[0];
  }, [chapters]);

  if (chapters.length === 0) {
    return (
      <div className="p-12 text-center bg-bl-card/70 rounded-2xl border border-bl-cardBorder text-bl-muted space-y-3">
        <div className="w-14 h-14 mx-auto rounded-full bg-bl-surface border border-bl-cardBorder flex items-center justify-center text-bl-primary">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-white font-heading">No hay capítulos publicados todavía</h3>
        <p className="text-xs text-bl-muted max-w-md mx-auto leading-relaxed">
          El manga oficial <strong>Blue Lock</strong> está configurado y listo. Los nuevos capítulos estarán disponibles aquí en cuanto se publiquen desde el panel administrativo.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* BOTONES RÁPIDOS DE LECTURA */}
      <div className="flex flex-wrap gap-3">
        {firstChapter && (
          <a
            href={`/leer/${mangaSlug}/${firstChapter.chapterNumber}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-bl-primary text-black hover:bg-cyan-300 transition-colors shadow-neon-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Leer primer capítulo (Cap. {firstChapter.chapterNumber})</span>
          </a>
        )}

        {lastReadChapter && (
          <a
            href={`/leer/${mangaSlug}/${lastReadChapter}`}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-bl-surface hover:bg-bl-surfaceHover text-bl-primary border border-bl-primary/40 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Continuar leyendo (Cap. {lastReadChapter})</span>
          </a>
        )}
      </div>

      {/* BARRA DE HERRAMIENTAS: BÚSQUEDA Y ORDEN */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-bl-card rounded-xl border border-bl-cardBorder">
        {/* Buscador de capítulo */}
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por número o título..."
            className="w-full bg-bl-dark border border-bl-cardBorder rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-bl-muted focus:outline-none focus:border-bl-primary transition-all"
          />
          <svg className="w-4 h-4 text-bl-muted absolute left-3 top-2.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2 text-xs text-bl-muted hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Ordenador Asc / Desc */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-bl-muted">Ordenar:</span>
          <button
            type="button"
            onClick={() => setSortOrder('desc')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              sortOrder === 'desc'
                ? 'bg-bl-primary text-black font-bold'
                : 'bg-bl-surface text-gray-300 hover:text-white'
            }`}
          >
            Mayor a menor
          </button>
          <button
            type="button"
            onClick={() => setSortOrder('asc')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              sortOrder === 'asc'
                ? 'bg-bl-primary text-black font-bold'
                : 'bg-bl-surface text-gray-300 hover:text-white'
            }`}
          >
            Menor a mayor
          </button>
        </div>
      </div>

      {/* LISTADO DE CAPÍTULOS */}
      {filteredAndSorted.length === 0 ? (
        <div className="p-8 text-center bg-bl-card rounded-xl border border-bl-cardBorder text-bl-muted text-sm">
          No se encontraron capítulos con el criterio especificado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredAndSorted.map((chapter) => {
            const isLastRead = lastReadChapter === String(chapter.chapterNumber);
            const pubDate = new Date(chapter.publishedAt).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <a
                key={chapter.id}
                href={`/leer/${mangaSlug}/${chapter.chapterNumber}`}
                className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${
                  isLastRead
                    ? 'bg-bl-surface border-bl-primary/60 shadow-neon-sm'
                    : 'bg-bl-card/80 hover:bg-bl-surface border-bl-cardBorder hover:border-bl-primary/40'
                }`}
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white group-hover:text-bl-primary transition-colors">
                      Capítulo {chapter.chapterNumber}
                    </span>
                    {isLastRead && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-bl-primary/20 text-bl-primary border border-bl-primary/40">
                        Visto
                      </span>
                    )}
                  </div>
                  {chapter.title && (
                    <p className="text-xs text-bl-muted truncate mt-0.5">
                      {chapter.title}
                    </p>
                  )}
                  <span className="text-[11px] text-bl-subtle mt-1 block">
                    {pubDate}
                  </span>
                </div>

                <div className="shrink-0">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-bl-surface group-hover:bg-bl-primary group-hover:text-black text-bl-primary transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
