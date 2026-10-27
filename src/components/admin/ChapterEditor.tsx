import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  Save,
  Trash2,
  ChevronUp,
  ChevronDown,
  Upload,
  Eye,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  RotateCcw,
} from 'lucide-react';

export interface ChapterDetails {
  id: string;
  mangaId: string;
  mangaTitle: string;
  mangaSlug: string;
  chapterNumber: string;
  title?: string | null;
  description?: string | null;
  status: 'draft' | 'published';
  publishedAt: string | Date;
}

export interface ChapterPageItem {
  id: string;
  pageNumber: number;
  imageUrl: string;
  storageKey?: string | null;
}

interface ChapterEditorProps {
  chapter: ChapterDetails;
  initialPages: ChapterPageItem[];
}

interface EditorPage {
  uid: string;
  isNew: boolean;
  originalId?: string;
  storageKey?: string;
  imageUrl: string;
  file?: File;
  name: string;
}

export default function ChapterEditor({ chapter, initialPages }: ChapterEditorProps) {
  // Metadatos del capítulo
  const [chapterNumber, setChapterNumber] = useState(chapter.chapterNumber);
  const [title, setTitle] = useState(chapter.title || '');
  const [description, setDescription] = useState(chapter.description || '');
  const [status, setStatus] = useState<'draft' | 'published'>(chapter.status);
  const [publishedAt, setPublishedAt] = useState(() => {
    try {
      const d = new Date(chapter.publishedAt);
      return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  });

  // Lista de páginas en orden
  const [pages, setPages] = useState<EditorPage[]>(() =>
    initialPages.map((p, idx) => ({
      uid: `orig-${p.id || idx}-${Math.random().toString(36).substring(2, 7)}`,
      isNew: false,
      originalId: p.id,
      storageKey: p.storageKey || undefined,
      imageUrl: p.imageUrl,
      name: `Pág. ${p.pageNumber || idx + 1}`,
    }))
  );

  // Páginas existentes que han sido eliminadas (para borrarlas del storage y BD al guardar)
  const [deletedItems, setDeletedItems] = useState<{ id: string; storageKey?: string; name: string }[]>([]);

  // Estados de carga y modal
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manejador para agregar nuevas páginas
  const handleAddNewFiles = (incomingFiles: FileList | File[]) => {
    setErrorMessage(null);
    const validFiles: EditorPage[] = [];
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

    Array.from(incomingFiles).forEach((file) => {
      if (!validTypes.includes(file.type)) {
        setErrorMessage(`"${file.name}" no es compatible. Solo JPEG, PNG o WebP.`);
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setErrorMessage(`"${file.name}" excede los 25MB permitidos.`);
        return;
      }

      validFiles.push({
        uid: `new-${Math.random().toString(36).substring(2, 9)}`,
        isNew: true,
        imageUrl: URL.createObjectURL(file),
        file,
        name: file.name,
      });
    });

    // Ordenar naturalmente las imágenes nuevas por nombre
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    validFiles.sort((a, b) => collator.compare(a.name, b.name));

    setPages((prev) => [...prev, ...validFiles]);
  };

  // Mover página arriba o abajo
  const movePage = (index: number, direction: 'up' | 'down') => {
    setPages((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  // Eliminar una página
  const removePage = (index: number) => {
    setPages((prev) => {
      const item = prev[index];
      if (!item) return prev;

      if (!item.isNew && item.originalId) {
        setDeletedItems((d) => [
          ...d,
          {
            id: item.originalId!,
            storageKey: item.storageKey,
            name: item.name,
          },
        ]);
      } else if (item.imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.imageUrl);
      }

      return prev.filter((_, i) => i !== index);
    });
  };

  // Restaurar la última página eliminada
  const restoreDeletedPage = () => {
    if (deletedItems.length === 0) return;
    const lastDeleted = deletedItems[deletedItems.length - 1];
    setDeletedItems((d) => d.slice(0, -1));

    // Buscar en initialPages
    const original = initialPages.find((p) => p.id === lastDeleted.id);
    if (original) {
      setPages((prev) => [
        ...prev,
        {
          uid: `orig-${original.id}-${Math.random().toString(36).substring(2, 7)}`,
          isNew: false,
          originalId: original.id,
          storageKey: original.storageKey || undefined,
          imageUrl: original.imageUrl,
          name: `Pág. ${original.pageNumber}`,
        },
      ]);
    }
  };

  // Guardar cambios
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!chapterNumber.trim()) {
      setErrorMessage('El número de capítulo es obligatorio.');
      return;
    }

    if (pages.length === 0) {
      setErrorMessage('El capítulo debe tener al menos una página.');
      return;
    }

    setIsSubmitting(true);
    setSaveProgress(15);

    try {
      const formData = new FormData();
      formData.append('chapterId', chapter.id);
      formData.append('chapterNumber', chapterNumber.trim());
      formData.append('mangaSlug', chapter.mangaSlug || 'blue-lock');
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('status', status);
      formData.append('publishedAt', publishedAt);

      // Separar páginas a conservar y páginas nuevas con su posición final
      const pagesToKeep: { id: string; pageNumber: number }[] = [];
      const newPageNumbers: number[] = [];

      pages.forEach((p, idx) => {
        const finalPageNumber = idx + 1;
        if (!p.isNew && p.originalId) {
          pagesToKeep.push({
            id: p.originalId,
            pageNumber: finalPageNumber,
          });
        } else if (p.isNew && p.file) {
          formData.append('newPages', p.file, `${finalPageNumber}_${p.name}`);
          newPageNumbers.push(finalPageNumber);
        }
      });

      formData.append('pagesOrder', JSON.stringify(pagesToKeep));
      formData.append('newPageNumbers', JSON.stringify(newPageNumbers));

      // IDs y keys a eliminar
      const toDeleteList: string[] = [];
      deletedItems.forEach((d) => {
        if (d.storageKey) toDeleteList.push(d.storageKey);
        if (d.id) toDeleteList.push(d.id);
      });
      formData.append('pagesToDelete', JSON.stringify(toDeleteList));

      setSaveProgress(45);

      const res = await fetch('/api/admin/chapters', {
        method: 'PUT',
        body: formData,
      });

      setSaveProgress(85);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al actualizar el capítulo.');
      }

      setSaveProgress(100);
      setSuccessMessage('¡Capítulo y páginas actualizados exitosamente!');

      setTimeout(() => {
        window.location.href = '/admin/capitulos';
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Ocurrió un error inesperado al guardar los cambios.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIOR CON ACCIONES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-bl-cardBorder">
        <div className="flex items-center gap-3">
          <a
            href="/admin/capitulos"
            className="p-2 rounded-xl bg-bl-surface border border-bl-cardBorder hover:border-bl-primary text-gray-300 hover:text-white transition-colors"
            title="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-bl-primary/10 text-bl-primary border border-bl-primary/20">
                {chapter.mangaTitle}
              </span>
              <span className="text-xs text-bl-muted">ID: {chapter.id}</span>
            </div>
            <h1 className="text-2xl font-black text-white font-heading mt-1">
              Editar Capítulo <span className="text-bl-primary">#{chapterNumber}</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={`/leer/${chapter.mangaSlug}/${chapter.chapterNumber}`}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-bl-surface border border-bl-cardBorder hover:border-bl-primary text-gray-300 hover:text-white transition-colors flex items-center gap-2"
          >
            <Eye className="w-4 h-4 text-cyan-400" />
            <span>Ver en Lector</span>
          </a>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-bl-primary text-black hover:bg-cyan-300 transition-all shadow-neon-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando ({saveProgress}%)...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* MENSAJES DE ESTADO */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span className="flex-1 font-medium">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span className="flex-1 font-medium">{successMessage}</span>
        </div>
      )}

      {/* FORMULARIO DE METADATOS */}
      <div className="bg-bl-card border border-bl-cardBorder rounded-2xl p-5 shadow-xl">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-bl-primary"></span>
          Información del Capítulo
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-bl-muted uppercase tracking-wider mb-1.5">
              Número de Capítulo *
            </label>
            <input
              type="text"
              value={chapterNumber}
              onChange={(e) => setChapterNumber(e.target.value)}
              required
              placeholder="Ej. 1, 366, 10.5"
              className="w-full bg-bl-dark border border-bl-cardBorder rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bl-primary focus:ring-1 focus:ring-bl-primary transition-colors font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-bl-muted uppercase tracking-wider mb-1.5">
              Título del Capítulo (Opcional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. El Despertar del Monstruo"
              className="w-full bg-bl-dark border border-bl-cardBorder rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bl-primary focus:ring-1 focus:ring-bl-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-bl-muted uppercase tracking-wider mb-1.5">
              Estado de Publicación
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
              className="w-full bg-bl-dark border border-bl-cardBorder rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-bl-primary focus:ring-1 focus:ring-bl-primary transition-colors"
            >
              <option value="published">🟢 Publicado (Visible en el sitio)</option>
              <option value="draft">🟡 Borrador (Oculto)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-bl-muted uppercase tracking-wider mb-1.5">
              Fecha de Publicación
            </label>
            <input
              type="date"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              className="w-full bg-bl-dark border border-bl-cardBorder rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-bl-primary focus:ring-1 focus:ring-bl-primary transition-colors"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-bl-muted uppercase tracking-wider mb-1.5">
              Sinopsis o Notas del Capítulo
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve resumen del episodio..."
              className="w-full bg-bl-dark border border-bl-cardBorder rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bl-primary focus:ring-1 focus:ring-bl-primary transition-colors"
            />
          </div>
        </div>
      </div>

      {/* GESTOR DE PÁGINAS */}
      <div className="bg-bl-card border border-bl-cardBorder rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-bl-cardBorder/60">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                Páginas del Capítulo
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-bl-surface border border-bl-cardBorder text-cyan-300">
                {pages.length} páginas
              </span>
            </div>
            <p className="text-[11px] text-bl-muted mt-0.5">
              Reordena, elimina páginas erróneas o añade páginas adicionales para este capítulo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {deletedItems.length > 0 && (
              <button
                type="button"
                onClick={restoreDeletedPage}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5"
                title="Deshacer la última eliminación de página"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar ({deletedItems.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-bl-surface border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/15 hover:border-cyan-400 transition-colors flex items-center gap-1.5 shadow-neon-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir Páginas</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                if (e.target.files) handleAddNewFiles(e.target.files);
                e.target.value = '';
              }}
              className="hidden"
            />
          </div>
        </div>

        {/* ALERTA DE PÁGINAS MARCADAS PARA BORRADO */}
        {deletedItems.length > 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                <strong>{deletedItems.length}</strong> página(s) marcada(s) para eliminar. Se borrarán permanentemente al guardar.
              </span>
            </span>
            <button
              type="button"
              onClick={restoreDeletedPage}
              className="text-[11px] underline font-bold hover:text-white"
            >
              Deshacer última
            </button>
          </div>
        )}

        {/* ZONA DE ARRASTRE RÁPIDA */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files) handleAddNewFiles(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-bl-cardBorder/70 hover:border-cyan-400/50 rounded-xl p-3 text-center transition-colors bg-bl-dark/40 cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex items-center justify-center gap-2 text-bl-muted text-xs">
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Arrastra nuevas páginas aquí o haz clic para subir más imágenes</span>
          </div>
        </div>

        {/* GRILLA DE PÁGINAS */}
        {pages.length === 0 ? (
          <div className="p-8 text-center border border-bl-cardBorder rounded-xl bg-bl-dark/50">
            <p className="text-xs text-bl-muted">No quedan páginas en este capítulo.</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 px-4 py-2 rounded-xl text-xs font-bold bg-bl-primary text-black hover:bg-cyan-300 transition-colors"
            >
              Añadir páginas ahora
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {pages.map((p, idx) => {
              const pageNumber = idx + 1;
              const isFirst = idx === 0;
              const isLast = idx === pages.length - 1;

              return (
                <div
                  key={p.uid}
                  className="group relative bg-bl-dark/90 rounded-xl border border-bl-cardBorder hover:border-cyan-500/50 overflow-hidden flex flex-col transition-all shadow-md hover:shadow-cyan-500/10"
                >
                  {/* IMAGEN DE LA PÁGINA */}
                  <div className="relative aspect-[2/3] bg-black/60 overflow-hidden flex items-center justify-center">
                    <img
                      src={p.imageUrl}
                      alt={`Página ${pageNumber}`}
                      loading="lazy"
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* BADGE DE NÚMERO */}
                    <div className="absolute top-2 left-2 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded-lg border border-white/10 text-white font-mono font-extrabold text-[11px] shadow-lg">
                      #{pageNumber}
                    </div>

                    {/* BADGE DE NUEVA PÁGINA */}
                    {p.isNew && (
                      <div className="absolute top-2 right-2 bg-cyan-500 text-black px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shadow-lg">
                        Nueva
                      </div>
                    )}

                    {/* BOTÓN DE ZOOM RÁPIDO */}
                    <button
                      type="button"
                      onClick={() => setPreviewModalUrl(p.imageUrl)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      title="Ampliar viñeta"
                    >
                      <div className="p-2 rounded-full bg-black/70 backdrop-blur-md border border-white/20">
                        <Eye className="w-5 h-5 text-cyan-300" />
                      </div>
                    </button>
                  </div>

                  {/* BARRA DE CONTROLES INFERIOR */}
                  <div className="p-2 bg-bl-surface/70 border-t border-bl-cardBorder flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => movePage(idx, 'up')}
                        disabled={isFirst}
                        className="p-1 rounded bg-bl-card hover:bg-bl-primary/20 text-gray-300 hover:text-cyan-300 disabled:opacity-25 disabled:hover:bg-bl-card disabled:hover:text-gray-300 transition-colors"
                        title="Mover hacia arriba / anterior"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => movePage(idx, 'down')}
                        disabled={isLast}
                        className="p-1 rounded bg-bl-card hover:bg-bl-primary/20 text-gray-300 hover:text-cyan-300 disabled:opacity-25 disabled:hover:bg-bl-card disabled:hover:text-gray-300 transition-colors"
                        title="Mover hacia abajo / siguiente"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removePage(idx)}
                      className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                      title="Eliminar esta página"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE ZOOM / PREVISUALIZACIÓN */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[92vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewModalUrl(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewModalUrl}
              alt="Previsualización de página"
              className="max-h-[85vh] w-auto object-contain rounded-xl shadow-2xl border border-bl-cardBorder"
            />
          </div>
        </div>
      )}
    </div>
  );
}
