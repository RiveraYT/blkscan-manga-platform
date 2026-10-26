import React, { useState, useRef } from 'react';
import { Upload, X, ArrowUp, ArrowDown, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface MangaOption {
  id: string;
  title: string;
  slug: string;
}

interface PageFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
}

interface ChapterUploaderProps {
  mangas: MangaOption[];
  defaultMangaId?: string;
}

export default function ChapterUploader({ mangas, defaultMangaId }: ChapterUploaderProps) {
  const [selectedMangaId, setSelectedMangaId] = useState(defaultMangaId || mangas[0]?.id || '');
  const [chapterNumber, setChapterNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [publishedAt, setPublishedAt] = useState(new Date().toISOString().split('T')[0]);

  const [pages, setPages] = useState<PageFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validación y adición de archivos
  const handleFiles = (incomingFiles: FileList | File[]) => {
    setErrorMessage(null);
    const validFiles: PageFile[] = [];
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];

    Array.from(incomingFiles).forEach((file) => {
      if (!validTypes.includes(file.type)) {
        setErrorMessage(`El archivo "${file.name}" no es compatible. Solo JPEG, PNG o WebP.`);
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        setErrorMessage(`El archivo "${file.name}" excede los 20MB permitidos.`);
        return;
      }

      validFiles.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
      });
    });

    // Ordenar naturalmente por nombre de archivo
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    validFiles.sort((a, b) => collator.compare(a.name, b.name));

    setPages((prev) => [...prev, ...validFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removePage = (id: string) => {
    setPages((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedMangaId) {
      setErrorMessage('Por favor selecciona un manga.');
      return;
    }
    if (!chapterNumber.trim()) {
      setErrorMessage('Por favor indica el número de capítulo.');
      return;
    }
    if (pages.length === 0) {
      setErrorMessage('Debes añadir al menos una página al capítulo.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      formData.append('mangaId', selectedMangaId);
      formData.append('chapterNumber', chapterNumber);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('status', status);
      formData.append('publishedAt', publishedAt);

      pages.forEach((p, idx) => {
        formData.append(`pages`, p.file, `${idx + 1}_${p.name}`);
      });

      setUploadProgress(40);

      const res = await fetch('/api/admin/chapters', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(90);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al guardar el capítulo.');
      }

      setUploadProgress(100);
      setSuccessMessage('¡Capítulo y páginas subidos con éxito!');

      // Redirigir después de breve confirmación
      setTimeout(() => {
        window.location.href = '/admin/capitulos';
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error inesperado durante la carga.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* MENSAJES DE ESTADO */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* METADATOS DEL CAPÍTULO */}
      <div className="p-6 rounded-2xl bg-bl-card border border-bl-cardBorder space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Información del Capítulo
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Manga */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">Manga *</label>
            <select
              value={selectedMangaId}
              onChange={(e) => setSelectedMangaId(e.target.value)}
              required
              className="w-full bg-bl-dark border border-bl-cardBorder rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-bl-primary"
            >
              {mangas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          {/* Número de capítulo */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">Número de Capítulo *</label>
            <input
              type="number"
              step="any"
              value={chapterNumber}
              onChange={(e) => setChapterNumber(e.target.value)}
              required
              placeholder="Ej. 1 o 1.5"
              className="w-full bg-bl-dark border border-bl-cardBorder rounded-xl px-3 py-2 text-xs text-white placeholder-bl-muted focus:outline-none focus:border-bl-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Título opcional */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">Título del Capítulo (Opcional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. El Despertar del Ego"
              className="w-full bg-bl-dark border border-bl-cardBorder rounded-xl px-3 py-2 text-xs text-white placeholder-bl-muted focus:outline-none focus:border-bl-primary"
            />
          </div>

          {/* Estado de publicación */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">Estado de Publicación</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full bg-bl-dark border border-bl-cardBorder rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-bl-primary"
            >
              <option value="published">Publicar Inmediatamente</option>
              <option value="draft">Guardar como Borrador</option>
            </select>
          </div>
        </div>

        {/* Descripción opcional */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-300">Descripción o Notas (Opcional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Resumen o notas sobre el capítulo..."
            className="w-full bg-bl-dark border border-bl-cardBorder rounded-xl px-3 py-2 text-xs text-white placeholder-bl-muted focus:outline-none focus:border-bl-primary"
          ></textarea>
        </div>
      </div>

      {/* ÁREA DE ARRASTRAR Y SOLTAR IMÁGENES */}
      <div className="p-6 rounded-2xl bg-bl-card border border-bl-cardBorder space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Páginas del Capítulo ({pages.length})
            </h3>
            <p className="text-xs text-bl-muted mt-0.5">
              Arrastra archivos aquí o selecciónalos. Puedes reordenar las páginas antes de publicar.
            </p>
          </div>
          {pages.length > 0 && (
            <button
              type="button"
              onClick={() => setPages([])}
              className="text-xs text-red-400 hover:underline"
            >
              Limpiar todas
            </button>
          )}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-bl-primary bg-bl-primary/10 scale-[1.01]'
              : 'border-bl-cardBorder hover:border-bl-primary/50 bg-bl-dark/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
            className="hidden"
          />
          <Upload className="w-10 h-10 text-bl-primary mx-auto mb-3" />
          <p className="text-sm font-bold text-white">
            Arrastra las imágenes aquí o <span className="text-bl-primary underline">haz click para explorar</span>
          </p>
          <p className="text-xs text-bl-muted mt-1">
            Formatos aceptados: JPEG, PNG, WebP (máx. 20MB por página)
          </p>
        </div>

        {/* VISTA PREVIA Y REORDENAMIENTO DE PÁGINAS */}
        {pages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-4">
            {pages.map((p, index) => (
              <div
                key={p.id}
                className="relative group rounded-xl overflow-hidden bg-bl-dark border border-bl-cardBorder p-1.5 flex flex-col justify-between"
              >
                {/* Indicador de número de página */}
                <div className="flex items-center justify-between text-[11px] font-mono px-1 py-0.5 mb-1 text-bl-muted">
                  <span className="font-bold text-bl-primary">Pág. {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removePage(p.id)}
                    className="text-red-400 hover:text-red-300"
                    title="Eliminar página"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-black">
                  <img
                    src={p.previewUrl}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <span className="text-[10px] text-bl-muted truncate block px-1 mt-1" title={p.name}>
                  {p.name}
                </span>

                {/* Botones de mover */}
                <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-bl-cardBorder/40">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => movePage(index, 'up')}
                    className="p-1 rounded bg-bl-surface hover:bg-bl-surfaceHover text-gray-300 disabled:opacity-20"
                    title="Mover hacia arriba"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={index === pages.length - 1}
                    onClick={() => movePage(index, 'down')}
                    className="p-1 rounded bg-bl-surface hover:bg-bl-surfaceHover text-gray-300 disabled:opacity-20"
                    title="Mover hacia abajo"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BARRA DE PROGRESO */}
      {isUploading && (
        <div className="p-4 rounded-xl bg-bl-card border border-bl-primary/40 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white font-semibold flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-bl-primary" />
              Subiendo páginas al almacenamiento...
            </span>
            <span className="font-mono text-bl-primary font-bold">{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-bl-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-bl-primary to-bl-accent transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* BOTONES DE ACCIÓN */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-bl-cardBorder">
        <a
          href="/admin/capitulos"
          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-bl-muted hover:text-white"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={isUploading}
          className="px-6 py-2.5 rounded-xl text-xs font-bold bg-bl-primary text-black hover:bg-cyan-300 disabled:opacity-50 transition-colors shadow-neon-sm"
        >
          {isUploading ? 'Guardando...' : 'Guardar y Publicar Capítulo'}
        </button>
      </div>
    </form>
  );
}
