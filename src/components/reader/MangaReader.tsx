import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Settings,
  Eye,
  EyeOff,
  BookOpen,
  ArrowLeft,
  RotateCcw,
  Columns,
  FileText,
  AlignVerticalJustifyCenter,
  MoveHorizontal,
  CheckCircle2,
} from 'lucide-react';

export type ReadingMode = 'single' | 'double' | 'vertical' | 'fit';
export type ImageFit = 'width' | 'height' | 'original';

export interface PageItem {
  id: string;
  pageNumber: number;
  imageUrl: string;
  width?: number | null;
  height?: number | null;
}

export interface ChapterNav {
  id: string;
  chapterNumber: string;
  title: string | null;
}

interface MangaReaderProps {
  manga: {
    slug: string;
    title: string;
  };
  chapter: {
    id: string;
    chapterNumber: string;
    title: string | null;
  };
  pages: PageItem[];
  prevChapter: ChapterNav | null;
  nextChapter: ChapterNav | null;
  allChapters: ChapterNav[];
}

export default function MangaReader({
  manga,
  chapter,
  pages,
  prevChapter,
  nextChapter,
  allChapters,
}: MangaReaderProps) {
  // Preferencias con persistencia en localStorage
  const [readingMode, setReadingMode] = useState<ReadingMode>('single');
  const [imageFit, setImageFit] = useState<ImageFit>('height');
  const [backgroundColor, setBackgroundColor] = useState<string>('#070a12');

  // Estado del lector (Navegación siempre de Izquierda a Derecha)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showEndOfChapterModal, setShowEndOfChapterModal] = useState<boolean>(false);
  const [showStartOfChapterModal, setShowStartOfChapterModal] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [failedPages, setFailedPages] = useState<Record<number, boolean>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const totalPages = pages.length;

  // Cargar preferencias e historial previo al montar
  useEffect(() => {
    try {
      localStorage.removeItem('blk_pref_dir');

      const savedMode = localStorage.getItem('blk_pref_mode') as ReadingMode;
      const savedFit = localStorage.getItem('blk_pref_fit') as ImageFit;
      const savedBg = localStorage.getItem('blk_pref_bg');

      if (savedMode) setReadingMode(savedMode);
      if (savedFit) setImageFit(savedFit);
      if (savedBg) setBackgroundColor(savedBg);

      // Cargar última página leída si coincide con el capítulo actual
      const historyKey = `blk_read_${manga.slug}`;
      const savedHist = localStorage.getItem(historyKey);
      if (savedHist) {
        const parsed = JSON.parse(savedHist);
        if (parsed.chapterNumber === chapter.chapterNumber && parsed.page) {
          const p = parseInt(parsed.page, 10);
          if (p >= 1 && p <= totalPages) {
            setCurrentPage(p);
          }
        }
      }
    } catch {
      // Ignorar errores de localStorage
    }
  }, [manga.slug, chapter.chapterNumber, totalPages]);

  // Guardar historial al cambiar de página
  useEffect(() => {
    try {
      localStorage.setItem(
        `blk_read_${manga.slug}`,
        JSON.stringify({
          chapterNumber: chapter.chapterNumber,
          page: currentPage,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch {
      // Ignorar
    }
  }, [currentPage, manga.slug, chapter.chapterNumber]);

  // Guardar preferencias al cambiar
  const updateMode = (m: ReadingMode) => {
    setReadingMode(m);
    localStorage.setItem('blk_pref_mode', m);
  };

  const updateFit = (f: ImageFit) => {
    setImageFit(f);
    localStorage.setItem('blk_pref_fit', f);
  };

  const updateBg = (bg: string) => {
    setBackgroundColor(bg);
    localStorage.setItem('blk_pref_bg', bg);
  };

  // Navegación secuencial de Izquierda a Derecha SIN saltos automáticos no deseados
  const goToNext = useCallback(() => {
    if (readingMode === 'double') {
      if (currentPage + 2 <= totalPages) {
        setCurrentPage((p) => p + 2);
      } else if (currentPage + 1 <= totalPages) {
        setCurrentPage((p) => p + 1);
      } else {
        // En la última página: NO salta automáticamente, muestra el menú de fin de capítulo
        setShowEndOfChapterModal(true);
      }
    } else {
      if (currentPage < totalPages) {
        setCurrentPage((p) => p + 1);
      } else {
        // En la última página: NO salta automáticamente, muestra el menú de fin de capítulo
        setShowEndOfChapterModal(true);
      }
    }
  }, [currentPage, totalPages, readingMode]);

  const goToPrev = useCallback(() => {
    if (readingMode === 'double') {
      if (currentPage - 2 >= 1) {
        setCurrentPage((p) => p - 2);
      } else if (currentPage - 1 >= 1) {
        setCurrentPage(1);
      } else if (prevChapter) {
        setShowStartOfChapterModal(true);
      }
    } else {
      if (currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else if (prevChapter) {
        setShowStartOfChapterModal(true);
      }
    }
  }, [currentPage, readingMode, prevChapter]);

  // Navegación con teclado: Izquierda = Anterior, Derecha = Siguiente
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'h' || e.key === 'H') {
        setShowControls((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowEndOfChapterModal(false);
        setShowStartOfChapterModal(false);
        setShowSettingsModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  // Precargar las siguientes páginas
  useEffect(() => {
    if (readingMode === 'vertical') return;
    const preloadIndexes = [currentPage, currentPage + 1, currentPage + 2];
    preloadIndexes.forEach((idx) => {
      if (idx <= totalPages && pages[idx - 1]) {
        const img = new Image();
        img.src = pages[idx - 1].imageUrl;
      }
    });
  }, [currentPage, totalPages, pages, readingMode]);

  // Pantalla completa
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Reintentar carga de imagen
  const retryImage = (pageNumber: number) => {
    setFailedPages((prev) => ({ ...prev, [pageNumber]: false }));
  };

  // Clases de ajuste de imagen según modo
  const getImageFitClass = () => {
    if (readingMode === 'fit') {
      return 'max-h-[88vh] max-w-[95vw] w-auto h-auto object-contain mx-auto shadow-2xl rounded-sm';
    }
    if (imageFit === 'width') return 'w-full h-auto max-w-5xl mx-auto shadow-2xl';
    if (imageFit === 'height') return 'h-[86vh] w-auto max-w-full object-contain mx-auto shadow-2xl';
    return 'max-w-none mx-auto'; // Original
  };

  const isAtLastPage = (readingMode === 'double' && currentPage + 1 >= totalPages) || currentPage >= totalPages;

  return (
    <div
      ref={containerRef}
      style={{ backgroundColor }}
      className="relative min-h-screen w-full flex flex-col select-none overflow-x-hidden transition-colors duration-300"
    >
      {/* ========================================================
          BARRA DE CONTROLES SUPERIOR (STICKY / TOGGLEABLE)
         ======================================================== */}
      <div
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          showControls ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-bl-dark/95 backdrop-blur-md border-b border-bl-cardBorder px-4 py-2.5 flex items-center justify-between gap-3 shadow-xl">
          {/* Lado izquierdo: Volver a manga y título */}
          <div className="flex items-center gap-3 min-w-0">
            <a
              href={`/mangas/${manga.slug}`}
              className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-bl-surface transition-colors shrink-0"
              title="Volver a la ficha del manga"
            >
              <ArrowLeft className="w-5 h-5 text-bl-primary" />
            </a>
            <div className="truncate">
              <span className="font-bold text-sm text-white truncate block">
                {manga.title}
              </span>
              <span className="text-xs text-bl-muted truncate block">
                Capítulo {chapter.chapterNumber} {chapter.title ? `- ${chapter.title}` : ''}
              </span>
            </div>
          </div>

          {/* Navegación rápida y selector de capítulos en la parte superior */}
          <div className="hidden sm:flex items-center gap-1.5">
            {prevChapter && (
              <a
                href={`/leer/${manga.slug}/${prevChapter.chapterNumber}`}
                className="px-2.5 py-1.5 rounded-lg bg-bl-card border border-bl-cardBorder text-xs font-semibold text-gray-300 hover:text-white hover:border-bl-primary/40 transition-colors flex items-center gap-1"
                title={`Ir al capítulo anterior (${prevChapter.chapterNumber})`}
              >
                <ChevronLeft className="w-3.5 h-3.5 text-bl-primary" />
                <span className="hidden md:inline">Cap. {prevChapter.chapterNumber}</span>
              </a>
            )}

            <select
              value={chapter.chapterNumber}
              onChange={(e) => {
                window.location.href = `/leer/${manga.slug}/${e.target.value}`;
              }}
              className="bg-bl-card border border-bl-cardBorder text-xs text-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-bl-primary"
            >
              {allChapters.map((c) => (
                <option key={c.id} value={c.chapterNumber}>
                  Cap. {c.chapterNumber} {c.title ? `- ${c.title}` : ''}
                </option>
              ))}
            </select>

            {nextChapter && (
              <a
                href={`/leer/${manga.slug}/${nextChapter.chapterNumber}`}
                className="px-2.5 py-1.5 rounded-lg bg-bl-card border border-bl-cardBorder text-xs font-semibold text-gray-300 hover:text-white hover:border-bl-primary/40 transition-colors flex items-center gap-1"
                title={`Ir al capítulo siguiente (${nextChapter.chapterNumber})`}
              >
                <span className="hidden md:inline">Cap. {nextChapter.chapterNumber}</span>
                <ChevronRight className="w-3.5 h-3.5 text-bl-primary" />
              </a>
            )}
          </div>

          {/* Lado derecho: Acciones y configuración */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Indicador de modo actual */}
            <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-bl-surface border border-bl-cardBorder text-bl-muted">
              {readingMode === 'single' && 'Individual'}
              {readingMode === 'double' && 'Doble Página'}
              {readingMode === 'vertical' && 'Cascada'}
              {readingMode === 'fit' && 'Ajuste Pantalla'}
            </span>

            {/* Ocultar interfaz */}
            <button
              onClick={() => setShowControls(false)}
              className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-bl-surface text-xs flex items-center gap-1 transition-colors"
              title="Ocultar interfaz (tecla H)"
            >
              <EyeOff className="w-4 h-4 text-bl-muted" />
              <span className="hidden md:inline">Ocultar</span>
            </button>

            {/* Configuración rápida */}
            <button
              onClick={() => setShowSettingsModal((prev) => !prev)}
              className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-bl-surface transition-colors"
              title="Preferencias de lectura"
            >
              <Settings className="w-4 h-4 text-bl-primary" />
            </button>

            {/* Pantalla completa */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg text-gray-300 hover:text-white hover:bg-bl-surface transition-colors"
              title="Pantalla completa (tecla F)"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-white" />
              ) : (
                <Maximize2 className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* BOTÓN FLOTANTE PARA RESTAURAR CONTROLES */}
      {!showControls && (
        <button
          onClick={() => setShowControls(true)}
          className="fixed top-4 right-4 z-50 p-2.5 rounded-full bg-bl-dark/80 backdrop-blur-md border border-bl-cardBorder text-bl-primary hover:bg-bl-primary hover:text-black transition-all shadow-neon"
          title="Mostrar controles"
        >
          <Eye className="w-5 h-5" />
        </button>
      )}

      {/* ========================================================
          MODAL: FIN DE CAPÍTULO (SOLO SE ABRE CUANDO EL USUARIO
          LLEGA AL FINAL Y PREGUNTA ANTES DE PASAR AL SIGUIENTE)
         ======================================================== */}
      {showEndOfChapterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-bl-card border border-bl-cardBorder rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl text-center relative">
            <button
              onClick={() => setShowEndOfChapterModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-sm p-1 rounded-lg hover:bg-bl-surface transition-colors"
              title="Cerrar y seguir viendo la página actual"
            >
              ✕
            </button>

            <div className="w-14 h-14 rounded-2xl bg-bl-primary/10 border border-bl-primary/30 flex items-center justify-center mx-auto text-bl-primary shadow-neon-sm">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white font-heading">
                ¡Fin del Capítulo {chapter.chapterNumber}!
              </h3>
              {chapter.title && (
                <p className="text-xs text-bl-muted">"{chapter.title}"</p>
              )}
              <p className="text-xs text-gray-300 mt-2">
                Has llegado a la última página de este capítulo. ¿Qué deseas hacer ahora?
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              {nextChapter ? (
                <a
                  href={`/leer/${manga.slug}/${nextChapter.chapterNumber}`}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-bl-primary to-cyan-400 text-black font-extrabold text-xs shadow-neon hover:opacity-95 transition-all flex items-center justify-center gap-2"
                >
                  <span>Pasar al Capítulo {nextChapter.chapterNumber}</span>
                  <ChevronRight className="w-4 h-4" />
                </a>
              ) : (
                <div className="p-3 rounded-xl bg-bl-dark border border-bl-cardBorder text-xs text-bl-muted">
                  ¡Estás al día! No hay más capítulos publicados por ahora.
                </div>
              )}

              <button
                onClick={() => {
                  setCurrentPage(1);
                  setShowEndOfChapterModal(false);
                }}
                className="w-full py-2.5 rounded-xl bg-bl-surface hover:bg-bl-surfaceHover text-gray-300 hover:text-white text-xs font-semibold border border-bl-cardBorder transition-colors"
              >
                Volver a leer desde la Página 1
              </button>

              <button
                onClick={() => setShowEndOfChapterModal(false)}
                className="w-full py-2 rounded-xl bg-transparent hover:bg-bl-surface/50 text-bl-muted hover:text-white text-xs transition-colors"
              >
                Permanecer en la última página
              </button>

              <a
                href={`/mangas/${manga.slug}`}
                className="w-full py-2 text-center text-xs text-bl-primary hover:underline"
              >
                Volver a la ficha de {manga.title}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: INICIO DE CAPÍTULO (SI DA CLIC EN ANTERIOR EN PÁG 1)
         ======================================================== */}
      {showStartOfChapterModal && prevChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-bl-card border border-bl-cardBorder rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-center relative">
            <button
              onClick={() => setShowStartOfChapterModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-sm p-1 rounded-lg hover:bg-bl-surface transition-colors"
            >
              ✕
            </button>

            <div className="w-12 h-12 rounded-xl bg-bl-surface border border-bl-cardBorder flex items-center justify-center mx-auto text-bl-primary">
              <BookOpen className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white font-heading">
                Inicio del Capítulo {chapter.chapterNumber}
              </h3>
              <p className="text-xs text-gray-300">
                Estás en la primera página de este capítulo. ¿Deseas regresar al capítulo anterior?
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <a
                href={`/leer/${manga.slug}/${prevChapter.chapterNumber}`}
                className="w-full py-2.5 rounded-xl bg-bl-primary text-black font-bold text-xs shadow-neon-sm hover:bg-cyan-300 transition-all flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Ir al Capítulo Anterior ({prevChapter.chapterNumber})</span>
              </a>

              <button
                onClick={() => setShowStartOfChapterModal(false)}
                className="w-full py-2 rounded-xl bg-bl-surface text-gray-300 hover:text-white text-xs font-semibold"
              >
                Permanecer en esta página
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PANEL MODAL DE CONFIGURACIÓN Y PREFERENCIAS
         ======================================================== */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-bl-card border border-bl-cardBorder rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-bl-cardBorder pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Settings className="w-5 h-5 text-bl-primary" />
                Preferencias del Lector
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* MODO DE VISUALIZACIÓN */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-bl-muted block">
                Modo de Visualización
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateMode('single')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    readingMode === 'single'
                      ? 'border-bl-primary bg-bl-primary/10 text-bl-primary font-bold'
                      : 'border-bl-cardBorder bg-bl-dark text-gray-300 hover:bg-bl-surface'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Página Individual</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateMode('double')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    readingMode === 'double'
                      ? 'border-bl-primary bg-bl-primary/10 text-bl-primary font-bold'
                      : 'border-bl-cardBorder bg-bl-dark text-gray-300 hover:bg-bl-surface'
                  }`}
                >
                  <Columns className="w-4 h-4" />
                  <span>Páginas Dobles</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateMode('fit')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    readingMode === 'fit'
                      ? 'border-bl-primary bg-bl-primary/10 text-bl-primary font-bold'
                      : 'border-bl-cardBorder bg-bl-dark text-gray-300 hover:bg-bl-surface'
                  }`}
                >
                  <MoveHorizontal className="w-4 h-4" />
                  <span>Ajuste Pantalla</span>
                </button>

                <button
                  type="button"
                  onClick={() => updateMode('vertical')}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    readingMode === 'vertical'
                      ? 'border-bl-primary bg-bl-primary/10 text-bl-primary font-bold'
                      : 'border-bl-cardBorder bg-bl-dark text-gray-300 hover:bg-bl-surface'
                  }`}
                >
                  <AlignVerticalJustifyCenter className="w-4 h-4" />
                  <span>Cascada Vertical</span>
                </button>
              </div>
            </div>

            {/* AJUSTE DE IMAGEN (Para modos manuales) */}
            {readingMode !== 'fit' && readingMode !== 'vertical' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-bl-muted block">
                  Ajuste de Escala
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => updateFit('height')}
                    className={`p-2 rounded-lg border text-xs text-center transition-all ${
                      imageFit === 'height'
                        ? 'border-bl-primary bg-bl-primary/10 text-bl-primary font-bold'
                        : 'border-bl-cardBorder bg-bl-dark text-gray-300 hover:bg-bl-surface'
                    }`}
                  >
                    Ajustar a Alto
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFit('width')}
                    className={`p-2 rounded-lg border text-xs text-center transition-all ${
                      imageFit === 'width'
                        ? 'border-bl-primary bg-bl-primary/10 text-bl-primary font-bold'
                        : 'border-bl-cardBorder bg-bl-dark text-gray-300 hover:bg-bl-surface'
                    }`}
                  >
                    Ajustar a Ancho
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFit('original')}
                    className={`p-2 rounded-lg border text-xs text-center transition-all ${
                      imageFit === 'original'
                        ? 'border-bl-primary bg-bl-primary/10 text-bl-primary font-bold'
                        : 'border-bl-cardBorder bg-bl-dark text-gray-300 hover:bg-bl-surface'
                    }`}
                  >
                    Original
                  </button>
                </div>
              </div>
            )}

            {/* COLOR DE FONDO */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-bl-muted block">
                Color de Fondo
              </label>
              <div className="flex gap-2">
                {[
                  { label: 'Negro Azulado', value: '#070a12' },
                  { label: 'Negro Puro', value: '#000000' },
                  { label: 'Gris Oscuro', value: '#18181b' },
                ].map((bg) => (
                  <button
                    key={bg.value}
                    type="button"
                    onClick={() => updateBg(bg.value)}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all ${
                      backgroundColor === bg.value
                        ? 'border-bl-primary bg-bl-primary/15 text-bl-primary font-bold'
                        : 'border-bl-cardBorder bg-bl-dark text-gray-300'
                    }`}
                  >
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-2.5 rounded-xl bg-bl-primary text-black font-bold text-xs hover:bg-cyan-300 transition-colors shadow-neon-sm"
            >
              Aplicar y Continuar Lectura
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          ZONA DE LECTURA PRINCIPAL
         ======================================================== */}
      <main className="flex-1 flex flex-col justify-center items-center py-16 px-2 min-h-screen relative">
        {pages.length === 0 ? (
          <div className="text-center p-8 bg-bl-card rounded-2xl border border-bl-cardBorder max-w-md">
            <BookOpen className="w-12 h-12 text-bl-muted mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">Capítulo sin páginas</h3>
            <p className="text-xs text-bl-muted mt-1">
              Este capítulo aún no tiene páginas procesadas o disponibles.
            </p>
            <a
              href={`/mangas/${manga.slug}`}
              className="mt-4 inline-block px-4 py-2 rounded-lg bg-bl-primary text-black text-xs font-bold"
            >
              Volver a la ficha
            </a>
          </div>
        ) : readingMode === 'vertical' ? (
          /* ========================================
             MODO 3: LECTURA VERTICAL CONTINUA
             ======================================== */
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center space-y-2">
            {pages.map((p) => {
              const hasError = failedPages[p.pageNumber];
              return (
                <div key={p.id} className="relative w-full text-center">
                  {hasError ? (
                    <div className="h-80 flex flex-col items-center justify-center bg-bl-card border border-red-500/30 rounded-lg p-4 text-center">
                      <p className="text-xs text-red-400 mb-2">Error al cargar la página {p.pageNumber}</p>
                      <button
                        onClick={() => retryImage(p.pageNumber)}
                        className="px-3 py-1.5 rounded-lg bg-bl-surface border border-bl-cardBorder text-xs text-white hover:text-bl-primary flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Reintentar
                      </button>
                    </div>
                  ) : (
                    <img
                      src={p.imageUrl}
                      alt={`Página ${p.pageNumber}`}
                      loading="lazy"
                      className="w-full h-auto mx-auto shadow-md"
                      onError={() => setFailedPages((prev) => ({ ...prev, [p.pageNumber]: true }))}
                    />
                  )}
                </div>
              );
            })}

            {/* Navegación al final de la cascada con opciones claras */}
            <div className="py-12 flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              {prevChapter && (
                <a
                  href={`/leer/${manga.slug}/${prevChapter.chapterNumber}`}
                  className="px-5 py-2.5 rounded-xl bg-bl-card border border-bl-cardBorder text-xs font-bold text-white hover:border-bl-primary transition-colors"
                >
                  ← Capítulo Anterior ({prevChapter.chapterNumber})
                </a>
              )}
              {nextChapter ? (
                <a
                  href={`/leer/${manga.slug}/${nextChapter.chapterNumber}`}
                  className="px-6 py-2.5 rounded-xl bg-bl-primary text-black text-xs font-bold hover:bg-cyan-300 transition-colors shadow-neon-sm flex items-center gap-2"
                >
                  <span>Siguiente Capítulo ({nextChapter.chapterNumber})</span>
                  <ChevronRight className="w-4 h-4" />
                </a>
              ) : (
                <a
                  href={`/mangas/${manga.slug}`}
                  className="px-5 py-2.5 rounded-xl bg-bl-surface border border-bl-cardBorder text-xs font-bold text-gray-300 hover:text-white transition-colors"
                >
                  Volver a la ficha de {manga.title}
                </a>
              )}
            </div>
          </div>
        ) : readingMode === 'double' ? (
          /* ========================================
             MODO 2: PÁGINAS DOBLES (Izquierda a Derecha)
             ======================================== */
          <div className="relative w-full flex items-center justify-center">
            {/* Zonas de click: Izquierda = Anterior, Centro = Controles, Derecha = Siguiente */}
            <div
              onClick={goToPrev}
              className="absolute left-0 inset-y-0 w-1/4 cursor-w-resize z-20"
              title="Página anterior (←)"
            />
            <div
              onClick={() => setShowControls((p) => !p)}
              className="absolute inset-x-1/4 inset-y-0 cursor-pointer z-10"
              title="Mostrar / ocultar controles"
            />
            <div
              onClick={goToNext}
              className="absolute right-0 inset-y-0 w-1/4 cursor-e-resize z-20"
              title="Página siguiente (→)"
            />

            {/* Páginas mostradas de Izquierda a Derecha */}
            {(() => {
              const leftPage = pages[currentPage - 1];
              const rightPage = currentPage < totalPages ? pages[currentPage] : null;

              return (
                <div className="flex flex-col md:flex-row items-center justify-center gap-2 max-w-full">
                  {leftPage && (
                    <div className="relative flex flex-col items-center justify-center">
                      <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded text-[10px] font-bold bg-bl-dark/85 text-bl-primary border border-bl-primary/40 backdrop-blur-md">
                        Pág. {leftPage.pageNumber}
                      </span>
                      <img
                        src={leftPage.imageUrl}
                        alt={`Página ${leftPage.pageNumber}`}
                        className={getImageFitClass()}
                      />
                    </div>
                  )}

                  {rightPage && (
                    <div className="relative hidden md:flex flex-col items-center justify-center">
                      <span className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded text-[10px] font-bold bg-bl-dark/85 text-bl-primary border border-bl-primary/40 backdrop-blur-md">
                        Pág. {rightPage.pageNumber}
                      </span>
                      <img
                        src={rightPage.imageUrl}
                        alt={`Página ${rightPage.pageNumber}`}
                        className={getImageFitClass()}
                      />
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          /* ========================================
             MODO 1 (INDIVIDUAL) Y MODO 4 (AJUSTE PANTALLA)
             ======================================== */
          <div className="relative w-full flex items-center justify-center">
            {/* Zonas de click: Izquierda = Anterior, Centro = Controles, Derecha = Siguiente */}
            <div
              onClick={goToPrev}
              className="absolute left-0 inset-y-0 w-1/3 cursor-w-resize z-20"
              title="Página anterior (←)"
            />
            <div
              onClick={() => setShowControls((p) => !p)}
              className="absolute inset-x-1/3 inset-y-0 cursor-pointer z-10"
              title="Alternar controles"
            />
            <div
              onClick={goToNext}
              className="absolute right-0 inset-y-0 w-1/3 cursor-e-resize z-20"
              title="Página siguiente (→)"
            />

            {pages[currentPage - 1] && (
              <div className="relative flex flex-col items-center justify-center">
                <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded text-[10px] font-bold bg-bl-dark/85 text-bl-primary border border-bl-primary/40 backdrop-blur-md">
                  Página {currentPage} de {totalPages}
                </span>

                {failedPages[currentPage] ? (
                  <div className="h-96 w-72 flex flex-col items-center justify-center bg-bl-card border border-red-500/30 rounded-xl p-4 text-center">
                    <p className="text-xs text-red-400 mb-2">Error al cargar la página {currentPage}</p>
                    <button
                      onClick={() => retryImage(currentPage)}
                      className="px-3 py-1.5 rounded-lg bg-bl-surface border border-bl-cardBorder text-xs text-white hover:text-bl-primary flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reintentar
                    </button>
                  </div>
                ) : (
                  <img
                    src={pages[currentPage - 1].imageUrl}
                    alt={`Página ${currentPage}`}
                    className={getImageFitClass()}
                    onError={() => setFailedPages((prev) => ({ ...prev, [currentPage]: true }))}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* AVISO DISCRETO EN LA ÚLTIMA PÁGINA */}
      {isAtLastPage && readingMode !== 'vertical' && !showEndOfChapterModal && (
        <div className="fixed bottom-16 inset-x-0 z-40 flex justify-center pointer-events-none px-4">
          <div className="pointer-events-auto bg-bl-card/90 backdrop-blur-md border border-bl-cardBorder px-4 py-2 rounded-xl shadow-xl flex items-center gap-3 text-xs">
            <span className="text-bl-muted">Has llegado al final de este capítulo.</span>
            {nextChapter && (
              <button
                onClick={() => setShowEndOfChapterModal(true)}
                className="px-3 py-1 rounded-lg bg-bl-primary text-black font-bold text-xs hover:bg-cyan-300 transition-colors shadow-neon-sm"
              >
                Pasar a Cap. {nextChapter.chapterNumber} →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          BARRA DE NAVEGACIÓN INFERIOR (PAGINADOR)
         ======================================================== */}
      {readingMode !== 'vertical' && (
        <div
          className={`fixed bottom-0 inset-x-0 z-50 transition-all duration-300 ${
            showControls ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
          }`}
        >
          <div className="bg-bl-dark/95 backdrop-blur-md border-t border-bl-cardBorder px-4 py-2.5 flex items-center justify-between gap-3 max-w-4xl mx-auto rounded-t-2xl shadow-2xl">
            {/* Botón Anterior */}
            {currentPage <= 1 && prevChapter ? (
              <button
                onClick={() => setShowStartOfChapterModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bl-card border border-bl-cardBorder text-xs font-semibold text-gray-300 hover:text-white hover:bg-bl-surface transition-all"
                title="Ver opciones para ir al capítulo anterior"
              >
                <ChevronLeft className="w-4 h-4 text-bl-primary" />
                <span className="hidden sm:inline">Cap. {prevChapter.chapterNumber}</span>
              </button>
            ) : (
              <button
                onClick={goToPrev}
                disabled={currentPage <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bl-card border border-bl-cardBorder text-xs font-semibold text-white hover:bg-bl-surface disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4 text-bl-primary" />
                <span className="hidden sm:inline">Anterior</span>
              </button>
            )}

            {/* Paginador con slider y número */}
            <div className="flex items-center gap-3 flex-1 justify-center max-w-xs">
              <input
                type="range"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => setCurrentPage(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-bl-cardBorder rounded-lg"
              />
              <span className="text-xs font-mono font-bold text-white shrink-0">
                {readingMode === 'double' && currentPage < totalPages
                  ? `${currentPage}-${currentPage + 1} / ${totalPages}`
                  : `${currentPage} / ${totalPages}`}
              </span>
            </div>

            {/* Botón Siguiente: si está en la última página, permite elegir pasar al siguiente capítulo sin saltar solo */}
            {isAtLastPage && nextChapter ? (
              <button
                onClick={() => setShowEndOfChapterModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-bl-primary to-cyan-400 text-xs font-extrabold text-black hover:opacity-95 shadow-neon-sm transition-all"
                title="Fin del capítulo. Clic para ver opciones o pasar al siguiente"
              >
                <span className="hidden sm:inline">Pasar a</span>
                <span>Cap. {nextChapter.chapterNumber}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={goToNext}
                disabled={currentPage >= totalPages && !nextChapter}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-bl-primary text-xs font-bold text-black hover:bg-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-neon-sm"
                title="Página siguiente"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
