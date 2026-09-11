/**
 * Seccion de listado de archivos del dataset.
 *
 * Extraida de PreprocesamientoDashboard. Es puramente presentacional: el
 * estado de busqueda, pagina y orden sigue viviendo en el dashboard, que lo
 * pasa por props junto a los manejadores.
 */

import React from 'react';
import type { DatasetFile } from '../../../services/datasetsService';
import type { PreprocessingDashboardData } from '../../../services/dashboardService';
import { DownloadIcon, TrashIcon } from './icons';
import { ExtBadge } from './ExtBadge';
import { FILES_PER_PAGE } from './types';
import {
  formatFileSize,
  getFileDirectory,
  getFileExtension,
  getLanguageName,
} from './helpers';

export type SortField = 'name' | 'size' | 'directory';

export interface FileListSectionProps {
  data: PreprocessingDashboardData | null;
  /** Archivos tras filtro y orden, antes de paginar. */
  displayedFiles: DatasetFile[];
  /** Los de la pagina actual. */
  paginatedFiles: DatasetFile[];
  fileSearch: string;
  setFileSearch: (value: string) => void;
  filePage: number;
  setFilePage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  sortField: SortField;
  sortAsc: boolean;
  handleSort: (field: SortField) => void;
  crossFilter: { chartId: string; segmentId: string } | null;
  crossFilterLabel: string | null;
  handlePreview: (file: DatasetFile) => void;
  handleDownload: (file: DatasetFile) => void;
  handleDelete: (file: DatasetFile) => void;
}

export const FileListSection: React.FC<FileListSectionProps> = ({
  data,
  displayedFiles,
  paginatedFiles,
  fileSearch,
  setFileSearch,
  filePage,
  setFilePage,
  totalPages,
  sortField,
  sortAsc,
  handleSort,
  crossFilter,
  crossFilterLabel,
  handlePreview,
  handleDownload,
  handleDelete,
}) => {
  return (
    <>
      {data?.dataset?.files && data.dataset.files.length > 0 && (
        <div className="bg-slate-800 border border-slate-700/60 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-700/60 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                {crossFilter ? `Archivos — ${crossFilterLabel}` : 'Archivos del Dataset'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {displayedFiles.length} archivo{displayedFiles.length !== 1 ? 's' : ''}
                {crossFilter && ` coinciden con el filtro`}
                {fileSearch && ` · búsqueda: "${fileSearch}"`}
              </p>
            </div>

            {/* Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={fileSearch}
                onChange={e => { setFileSearch(e.target.value); setFilePage(1); }}
                placeholder="Buscar archivo..."
                className="pl-9 pr-3 py-2 text-sm border border-slate-600 rounded-lg bg-slate-700/50 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 w-56"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 bg-slate-900/40">
                  <th
                    onClick={() => handleSort('name')}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 select-none"
                  >
                    <span className="flex items-center gap-1">
                      Nombre del Archivo
                      {sortField === 'name' && (
                        <svg className={`w-3 h-3 transition-transform ${sortAsc ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </span>
                  </th>
                  <th
                    onClick={() => handleSort('directory')}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 select-none hidden md:table-cell"
                  >
                    <span className="flex items-center gap-1">
                      Directorio
                      {sortField === 'directory' && (
                        <svg className={`w-3 h-3 transition-transform ${sortAsc ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                    Idioma
                  </th>
                  <th
                    onClick={() => handleSort('size')}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 select-none hidden lg:table-cell"
                  >
                    <span className="flex items-center gap-1">
                      Tamaño
                      {sortField === 'size' && (
                        <svg className={`w-3 h-3 transition-transform ${sortAsc ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      )}
                    </span>
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {paginatedFiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500 text-sm">
                      No se encontraron archivos
                      {fileSearch && ` para "${fileSearch}"`}
                    </td>
                  </tr>
                ) : paginatedFiles.map((file, idx) => {
                  const ext  = getFileExtension(file.original_filename);
                  const dir  = getFileDirectory(file);
                  const lang = file.language_code ? getLanguageName(file.language_code) : '—';
                  const isEven = idx % 2 === 0;
                  return (
                    <tr key={file.id} className={`hover:bg-slate-700/30 transition-colors ${isEven ? '' : 'bg-slate-900/20'}`}>
                      {/* Filename */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-slate-700/60 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p
                              className="text-sm font-medium text-slate-200 truncate max-w-[200px] lg:max-w-[320px]"
                              title={file.original_filename}
                            >
                              {file.bib_title || file.original_filename}
                            </p>
                            {file.bib_title && (
                              <p className="text-xs text-slate-500 truncate max-w-[200px]" title={file.original_filename}>
                                {file.original_filename}
                              </p>
                            )}
                            {file.bib_year && (
                              <p className="text-xs text-slate-500">{file.bib_year}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Directory */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-700/60 px-2 py-0.5 rounded-md">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          {dir}
                        </span>
                      </td>
                      {/* Extension */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <ExtBadge ext={ext} />
                      </td>
                      {/* Language */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {file.language_code ? (
                          <span className="inline-flex items-center gap-1 text-xs text-violet-400 bg-violet-500/15 px-2 py-0.5 rounded-md font-medium">
                            {lang}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>
                      {/* Size */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-slate-400">{formatFileSize(file.file_size_bytes)}</span>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview */}
                          <button
                            onClick={() => handlePreview(file)}
                            title="Vista previa del texto"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/15 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {/* Download */}
                          <button
                            onClick={() => handleDownload(file)}
                            title="Descargar PDF"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/15 transition-colors"
                          >
                            <DownloadIcon />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(file)}
                            title="Eliminar archivo"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/15 transition-colors"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-700/60 flex items-center justify-between flex-wrap gap-3 bg-slate-900/40">
              <p className="text-xs text-slate-500">
                Mostrando {Math.min((filePage - 1) * FILES_PER_PAGE + 1, displayedFiles.length)}–
                {Math.min(filePage * FILES_PER_PAGE, displayedFiles.length)} de {displayedFiles.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFilePage(1)}
                  disabled={filePage === 1}
                  className="px-2.5 py-1 text-xs rounded-md border border-slate-600 text-slate-400 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  «
                </button>
                <button
                  onClick={() => setFilePage(p => p - 1)}
                  disabled={filePage === 1}
                  className="px-2.5 py-1 text-xs rounded-md border border-slate-600 text-slate-400 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ‹
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(filePage - 2, totalPages - 4));
                  const page  = start + i;
                  return page <= totalPages ? (
                    <button
                      key={page}
                      onClick={() => setFilePage(page)}
                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                        page === filePage
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-600 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {page}
                    </button>
                  ) : null;
                })}
                <button
                  onClick={() => setFilePage(p => p + 1)}
                  disabled={filePage === totalPages}
                  className="px-2.5 py-1 text-xs rounded-md border border-slate-600 text-slate-400 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
                <button
                  onClick={() => setFilePage(totalPages)}
                  disabled={filePage === totalPages}
                  className="px-2.5 py-1 text-xs rounded-md border border-slate-600 text-slate-400 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
