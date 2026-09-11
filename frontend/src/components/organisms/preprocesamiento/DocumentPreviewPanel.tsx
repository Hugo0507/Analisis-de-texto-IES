/**
 * Panel deslizante con la vista previa del texto preprocesado de un archivo.
 *
 * Extraido de PreprocesamientoDashboard. Presentacional: el dashboard
 * mantiene el archivo activo y su contenido, y los pasa por props.
 */

import React from 'react';
import type { DatasetFile } from '../../../services/datasetsService';
import { DownloadIcon } from './icons';

export interface PreviewContent {
  preview: string;
  total_words: number;
  has_preprocessed: boolean;
}

export interface DocumentPreviewPanelProps {
  previewFile: DatasetFile | null;
  previewContent: PreviewContent | null;
  previewLoading: boolean;
  setPreviewFile: (file: DatasetFile | null) => void;
  handleDownload: (file: DatasetFile) => void;
}

export const DocumentPreviewPanel: React.FC<DocumentPreviewPanelProps> = ({
  previewFile,
  previewContent,
  previewLoading,
  setPreviewFile,
  handleDownload,
}) => {
  return (
    <>
      {previewFile && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setPreviewFile(null)}
          />
          {/* Slide-in panel */}
          <div className="fixed right-0 top-0 h-full z-50 w-full max-w-lg bg-slate-900 border-l border-slate-700/60 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-700/60">
              <div className="min-w-0">
                <p className="text-xs font-medium text-blue-400 uppercase tracking-wider mb-1">Vista previa</p>
                <h3 className="text-sm font-semibold text-white leading-snug truncate max-w-[340px]" title={previewFile.bib_title || previewFile.original_filename}>
                  {previewFile.bib_title || previewFile.original_filename}
                </h3>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                  {previewFile.bib_year && <span className="text-xs text-slate-400">{previewFile.bib_year}</span>}
                  {previewFile.bib_authors && <span className="text-xs text-slate-500 truncate max-w-[300px]">{previewFile.bib_authors}</span>}
                </div>
              </div>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {previewLoading ? (
                <div className="flex items-center gap-3 text-slate-400 py-8">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Cargando texto preprocesado...
                </div>
              ) : !previewContent?.preview ? (
                <div className="text-slate-500 text-sm py-8">
                  No hay texto preprocesado disponible para este documento.
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                      previewContent.has_preprocessed ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                    }`}>
                      {previewContent.has_preprocessed ? '✓ Texto preprocesado' : '⚠ Texto sin procesar'}
                    </span>
                    <span className="text-xs text-slate-500">{previewContent.total_words.toLocaleString()} palabras en total</span>
                  </div>
                  <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-4">
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">
                      {previewContent.preview}
                      {previewContent.total_words > 120 && (
                        <span className="text-slate-600"> […]</span>
                      )}
                    </p>
                  </div>
                  <p className="mt-3 text-xs text-slate-600 text-center">
                    Mostrando ~120 primeras palabras del texto preprocesado
                  </p>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-700/60 flex gap-2">
              <button
                onClick={() => handleDownload(previewFile)}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <DownloadIcon />
                Descargar PDF
              </button>
              <button
                onClick={() => setPreviewFile(null)}
                className="px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 text-sm transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
