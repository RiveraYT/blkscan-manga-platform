import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { Archive, Upload, X, ArrowUp, ArrowDown, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface MangaOption {
  id: string;
  title: string;
  slug: string;
}

interface ZipPage {
  id: string;
  name: string;
  blob: Blob;
  previewUrl: string;
  size: number;
}

interface ZipImporterProps {
  mangas: MangaOption[];
}

export default function ZipImporter({ mangas }: ZipImporterProps) {
  const [selectedMangaId, setSelectedMangaId] = useState(mangas[0]?.id || '');
  const [chapterNumber, setChapterNumber] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');

  const [zipFileName, setZipFileName] = useState<string | null>(null);
  const [pages, setPages] = useState<ZipPage[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Procesamiento seguro del archivo ZIP
  const handleZipFile = async (file: File) => {
    setErrorMessage(null);
    setStatusMessage(null);

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErrorMessage('Por favor selecciona un archivo comprimido .ZIP válido.');
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      setErrorMessage('El archivo ZIP excede el límite de 200MB.');
      return;
    }

    // Intentar deducir el número de capítulo del nombre del archivo si es posible (ej. "Blue_Lock_Ch_01.zip")
    const matchNumber = file.name.match(/(?:ch|cap|capitulo)?[_ -]?([0-9]+(?:\.[0-9]+)?)/i);
    if (matchNumber && matchNumber[1] && !chapterNumber) {
      setChapterNumber(matchNumber[1]);
    }

    setZipFileName(file.name);
    setIsExtracting(true);

    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
      const extractedPages: ZipPage[] = [];

      const fileEntries: { name: string; entry: JSZip.JSZipObject }[] = [];

      zipContent.forEach((relativePath, entry) => {
        // Ignorar directorios y archivos de sistema de macOS/Windows
        if (entry.dir) return;
        if (relativePath.includes('__MACOSX') || relativePath.includes('.DS_Store') || relativePath.includes('Thumbs.db')) return;

        const lower = relativePath.toLowerCase();
        if (validExtensions.some((ext) => lower.endsWith(ext))) {
          fileEntries.push({ name: relativePath, entry });
        }
      });

      if (fileEntries.length === 0) {
        throw new Error('El archivo ZIP no contiene imágenes válidas (JPEG, PNG o WebP).');
      }

      // Ordenar naturalmente por nombre (ej. 1.jpg, 2.jpg, ... 10.jpg)
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
      fileEntries.sort((a, b) => collator.compare(a.name, b.name));

      for (let i = 0; i < fileEntries.length; i++) {
        const item = fileEntries[i];
        const blob = await item.entry.async('blob');
        const cleanName = item.name.split('/').pop() || `page_${i + 1}.webp`;

        extractedPages.push({
          id: Math.random().toString(36).substring(2, 9),
          name: cleanName,
          blob,
          previewUrl: URL.createObjectURL(blob),
          size: blob.size,
        });
      }

      setPages(extractedPages);
      setStatusMessage(`Se extrajeron ${extractedPages.length} páginas correctamente.`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al descomprimir el archivo ZIP.');
      setPages([]);
    } finally {
      setIsExtracting(false);
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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedMangaId) {
      setErrorMessage('Selecciona un manga.');
      return;
    }
    if (!chapterNumber.trim()) {
      setErrorMessage('Ingresa el número del capítulo.');
      return;
    }
    if (pages.length === 0) {
      setErrorMessage('No hay páginas válidas para subir.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append('mangaId', selectedMangaId);
      formData.append('chapterNumber', chapterNumber);
      formData.append('title', title);
      formData.append('status', status);
      formData.append('publishedAt', new Date().toISOString().split('T')[0]);

      pages.forEach((p, idx) => {
        formData.append('pages', p.blob, `${idx + 1}_${p.name}`);
      });

      setUploadProgress(45);

      const res = await fetch('/api/admin/chapters', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(90);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al registrar el capítulo.');
      }

      setUploadProgress(100);
      setStatusMessage('¡Capítulo importado exitosamente desde el ZIP!');

      setTimeout(() => {
        window.location.href = '/admin/capitulos';
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error durante la subida al servidor.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleUpload} className="space-y-6">
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* METADATOS */}
      <div className="p-6 rounded-2xl bg-bl-card border border-bl-cardBorder space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Archive className="w-4 h-4 text-bl-primary" />
          Datos del Capítulo a Importar
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">Manga de Destino *</label>
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

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">Número de Capítulo *</label>
            <input
              type="number"
              step="any"
              value={chapterNumber}
              onChange={(e) => setChapterNumber(e.target.value)}
              required
              placeholder="Ej. 1"
              className="w-full bg-bl-dark border border-bl-cardBorder rounded-xl px-3 py-2 text-xs text-white placeholder-bl-muted focus:outline-none focus:border-bl-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">Título Opcional</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Batalla por el Gol"
              className="w-full bg-bl-dark border border-bl-cardBorder rounded-xl px-3 py-2 text-xs text-white placeholder-bl-muted focus:outline-none focus:border-bl-primary"
            />
          </div>

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
      </div>

      {/* DROP ZONE ZIP */}
      <div className="p-6 rounded-2xl bg-bl-card border border-bl-cardBorder space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Seleccionar Archivo Comprimido (.ZIP)
        </h3>

        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-bl-cardBorder hover:border-bl-primary/50 bg-bl-dark/50 rounded-2xl p-8 text-center cursor-pointer transition-all"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip"
            onChange={(e) => e.target.files?.[0] && handleZipFile(e.target.files[0])}
            className="hidden"
          />
          <Archive className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
          <p className="text-sm font-bold text-white">
            {zipFileName ? (
              <span className="text-bl-primary">Archivo cargado: {zipFileName}</span>
            ) : (
              <>Haz click o arrastra tu archivo <span className="text-bl-primary underline">.ZIP</span> aquí</>
            )}
          </p>
          <p className="text-xs text-bl-muted mt-1">
            Extraeremos y ordenaremos automáticamente las páginas de imágenes.
          </p>
        </div>

        {isExtracting && (
          <div className="p-4 rounded-xl bg-bl-dark border border-bl-primary/40 flex items-center justify-center gap-3 text-xs text-white">
            <Loader2 className="w-4 h-4 animate-spin text-bl-primary" />
            <span>Extrayendo y validando imágenes del ZIP de manera segura...</span>
          </div>
        )}

        {/* VISTA PREVIA Y ORDEN DE PÁGINAS EXTRAÍDAS */}
        {pages.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-bl-cardBorder">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">
                Páginas extraídas ({pages.length}) - Revisa el orden antes de publicar:
              </span>
              <button
                type="button"
                onClick={() => setPages([])}
                className="text-xs text-red-400 hover:underline"
              >
                Descartar páginas
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-96 overflow-y-auto p-2 bg-bl-dark rounded-xl border border-bl-cardBorder">
              {pages.map((p, index) => (
                <div
                  key={p.id}
                  className="rounded-lg bg-bl-card border border-bl-cardBorder p-1.5 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between text-[10px] text-bl-muted font-mono mb-1">
                    <span className="font-bold text-bl-primary">#{index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removePage(p.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="aspect-[2/3] w-full rounded overflow-hidden bg-black">
                    <img src={p.previewUrl} alt={p.name} className="w-full h-full object-cover" />
                  </div>

                  <span className="text-[9px] text-bl-muted truncate block mt-1" title={p.name}>
                    {p.name}
                  </span>

                  <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-bl-cardBorder/40">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => movePage(index, 'up')}
                      className="p-1 rounded bg-bl-surface text-gray-300 disabled:opacity-20"
                    >
                      <ArrowUp className="w-2.5 h-2.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === pages.length - 1}
                      onClick={() => movePage(index, 'down')}
                      className="p-1 rounded bg-bl-surface text-gray-300 disabled:opacity-20"
                    >
                      <ArrowDown className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isUploading && (
        <div className="p-4 rounded-xl bg-bl-card border border-bl-primary/40 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white font-semibold flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-bl-primary" />
              Subiendo páginas del ZIP al almacenamiento de objetos...
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

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-bl-cardBorder">
        <a
          href="/admin/capitulos"
          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-bl-muted hover:text-white"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={isUploading || pages.length === 0}
          className="px-6 py-2.5 rounded-xl text-xs font-bold bg-bl-primary text-black hover:bg-cyan-300 disabled:opacity-50 transition-colors shadow-neon-sm"
        >
          {isUploading ? 'Procesando...' : `Confirmar e Importar ${pages.length} Páginas`}
        </button>
      </div>
    </form>
  );
}
