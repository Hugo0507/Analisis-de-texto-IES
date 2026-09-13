/**
 * Etapa de subida de PDFs al workspace.
 */

import React, { useState, useRef, useCallback } from 'react';
import publicWorkspaceService from '../../../services/publicWorkspaceService';
import { LANGUAGE_NAMES } from '../../../services/dataPreparationService';


export interface UploadStageProps {
  workspaceId: string;
  onNext: () => void;
  onBack: () => void;
  /**
   * Codigo del idioma del corpus (p. ej. 'en'). La inferencia rechaza los
   * documentos en otro idioma porque los modelos se entrenaron con ese, asi
   * que conviene decirlo antes de que el usuario suba nada.
   */
  corpusLanguage?: string | null;
}

/** Texto del aviso de idioma, con el nombre legible cuando se conoce. */
export function avisoIdioma(corpusLanguage?: string | null): string {
  if (!corpusLanguage) {
    return 'Los documentos deben estar en el mismo idioma del corpus; los demás se rechazan.';
  }
  const nombre = LANGUAGE_NAMES[corpusLanguage]?.name ?? corpusLanguage.toUpperCase();
  return `Los documentos deben estar en ${nombre.toLowerCase()}, el idioma del corpus: `
    + 'los modelos se entrenaron con ese idioma y los documentos en otro se rechazan.';
}

export const UploadStage: React.FC<UploadStageProps> = ({ workspaceId, onNext, onBack, corpusLanguage }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<{ name: string; size: number; status: 'pending' | 'uploading' | 'done' | 'error'; error?: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList);

    for (const file of newFiles) {
      if (file.type !== 'application/pdf') {
        setFiles(prev => [...prev, { name: file.name, size: file.size, status: 'error', error: 'Solo se permiten archivos PDF.' }]);
        continue;
      }
      if (file.size > 50 * 1024 * 1024) {
        setFiles(prev => [...prev, { name: file.name, size: file.size, status: 'error', error: 'El archivo supera 50 MB.' }]);
        continue;
      }

      setFiles(prev => [...prev, { name: file.name, size: file.size, status: 'uploading' }]);
      setUploading(true);

      try {
        await publicWorkspaceService.uploadDocument(workspaceId, file);
        setFiles(prev => prev.map((f, i) => i === prev.length - 1 ? { ...f, status: 'done' } : f));
      } catch (err: any) {
        const msg = err?.response?.data?.file?.[0] || err?.message || 'Error al subir.';
        setFiles(prev => prev.map((f, i) => i === prev.length - 1 ? { ...f, status: 'error', error: msg } : f));
      }
    }
    setUploading(false);
  }, [workspaceId, files.length]);

  const doneCount = files.filter(f => f.status === 'done').length;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">Sube los documentos a analizar</h3>
        <p className="text-sm text-slate-300">Solo archivos PDF · Máximo 50 MB por archivo</p>
        <p className="text-sm text-amber-300 mt-1" data-testid="aviso-idioma">
          {avisoIdioma(corpusLanguage)}
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors
          ${dragOver ? 'border-violet-400 bg-violet-500/10' : 'border-slate-600 hover:border-slate-400 bg-slate-800/30'}
        `}
      >
        <svg className="w-10 h-10 mx-auto mb-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-sm text-slate-300 font-medium">Arrastra PDFs aquí o haz clic para seleccionar</p>
        <p className="text-xs text-slate-500 mt-1">Solo PDF · Máx. 50 MB c/u</p>
        <input ref={inputRef} type="file" accept="application/pdf" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{f.name}</p>
                {f.error && <p className="text-xs text-red-400 mt-0.5">{f.error}</p>}
              </div>
              <span className="text-xs text-slate-500 shrink-0">{formatSize(f.size)}</span>
              <span className={`text-xs font-medium shrink-0 ${f.status === 'done' ? 'text-emerald-400' : f.status === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                {f.status === 'done' ? '✓ Listo' : f.status === 'error' ? '✕ Error' : '…'}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="px-4 py-2.5 min-h-[44px] rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          ← Atrás
        </button>
        <button
          disabled={doneCount === 0 || uploading}
          onClick={onNext}
          className="px-6 py-2.5 min-h-[44px] rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-slate-900"
        >
          {doneCount === 0 ? 'Sube al menos un PDF' : `Analizar ${doneCount} documento${doneCount !== 1 ? 's' : ''} →`}
        </button>
      </div>
    </div>
  );
};

// ── Stage 3: Processing ───────────────────────────────────────────────────────
