/**
 * PreprocesamientoDashboard - Preprocessing visualization dashboard
 *
 * Cross-filtering is highlight-based (Power BI style):
 * - ALL charts ALWAYS show the original backend distributions
 * - Clicking a segment highlights matching segments in other charts (dims the rest)
 * - No data is ever removed; context is always preserved
 *
 * Bug fix (v2): fileData now uses directory_name as primary key (matching backend grouping)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DashboardGrid, MetricCardDark, DonutChartViz } from '../organisms';
import type { DonutChartData } from '../organisms/DonutChartViz';
import { ChartCard } from '../molecules';
import { useFilter } from '../../contexts/FilterContext';
import type { DatasetFile } from '../../services/datasetsService';
import apiClient from '../../services/api';
import publicApiClient from '../../services/publicApi';
import { useToast } from '../../contexts/ToastContext';
import { downloadBlob } from '../../utils/download';
import {
  StatPill,
  DeleteModal,
  FileListSection,
  FileIcon,
  SizeIcon,
  CheckIcon,
  DuplicateIcon,
  ExtensionIcon,
  LanguageIcon,
  DownloadIcon,
  SkipIcon,
  getLanguageName,
  formatFileSize,
  getFileExtension,
  getFileDirectory,
  FILES_PER_PAGE,
} from '../organisms/preprocesamiento';
import type { FileEntry } from '../organisms/preprocesamiento';
import { usePreprocessingData } from '../../hooks/usePreprocessingData';

// ─── Main Component ───────────────────────────────────────────────────────────
export const PreprocesamientoDashboard: React.FC = () => {
  const { data, isLoading, error, refetch } = usePreprocessingData();
  const [crossFilter, setCrossFilterState] = useState<{ chartId: string; segmentId: string } | null>(null);
  const { filters, setSelectedPreparation } = useFilter();
  const { showError } = useToast();

  // File list state
  const [fileSearch, setFileSearch]       = useState('');
  const [filePage, setFilePage]           = useState(1);
  const [deleteTarget, setDeleteTarget]   = useState<DatasetFile | null>(null);
  const [sortField, setSortField]         = useState<'name' | 'size' | 'directory'>('name');
  const [sortAsc, setSortAsc]             = useState(true);

  // Document preview (TRANS-6)
  const [previewFile, setPreviewFile]     = useState<DatasetFile | null>(null);
  const [previewContent, setPreviewContent] = useState<{ preview: string; total_words: number; has_preprocessed: boolean } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Reset cross-filter & file list when dataset changes
  useEffect(() => {
    setCrossFilterState(null);
    setFilePage(1);
    setFileSearch('');
  }, [filters.selectedDatasetId]);

  // Reset page when cross-filter changes
  useEffect(() => { setFilePage(1); }, [crossFilter]);

  // ──────────────────────────────────────────────────────────────────────────
  // ORIGINAL DISTRIBUTIONS (always from backend)
  // ──────────────────────────────────────────────────────────────────────────
  const originalDirs  = data?.directoryDistribution  || [];
  const originalExts  = data?.extensionDistribution  || [];
  const originalLangs = data?.languageDistribution   || [];

  // ──────────────────────────────────────────────────────────────────────────
  // FILE-LEVEL DATA — FIX: use directory_name as primary key
  // ──────────────────────────────────────────────────────────────────────────
  const fileData: FileEntry[] = useMemo(() => {
    if (!data?.dataset?.files) return [];
    return data.dataset.files.map(f => ({
      directory: getFileDirectory(f),
      extension: getFileExtension(f.original_filename),
      language: f.language_code || null,
      size: f.file_size_bytes,
    }));
  }, [data]);

  // ──────────────────────────────────────────────────────────────────────────
  // CROSS-FILTER STATE
  // ──────────────────────────────────────────────────────────────────────────
  const crossFilterState = useMemo(() => {
    if (!crossFilter) return null;

    let matchingFiles = fileData;
    if      (crossFilter.chartId === 'directory-donut')  matchingFiles = fileData.filter(f => f.directory === crossFilter.segmentId);
    else if (crossFilter.chartId === 'extension-donut')  matchingFiles = fileData.filter(f => f.extension === crossFilter.segmentId);
    else if (crossFilter.chartId === 'languages-donut')  matchingFiles = fileData.filter(f => f.language  === crossFilter.segmentId);

    const dirCounts:  Record<string, number> = {};
    const extCounts:  Record<string, number> = {};
    const langCounts: Record<string, number> = {};
    matchingFiles.forEach(f => {
      dirCounts[f.directory]  = (dirCounts[f.directory]  || 0) + 1;
      extCounts[f.extension]  = (extCounts[f.extension]  || 0) + 1;
      if (f.language) langCounts[f.language] = (langCounts[f.language] || 0) + 1;
    });

    const filteredDirDist  = originalDirs.filter(d  => (dirCounts[d.id]  || 0) > 0).map(d  => ({ ...d,  value: dirCounts[d.id]  }));
    const filteredExtDist  = originalExts.filter(d  => (extCounts[d.id]  || 0) > 0).map(d  => ({ ...d,  value: extCounts[d.id]  }));
    const filteredLangDist = originalLangs.filter(d => (langCounts[d.id] || 0) > 0).map(d => ({ ...d, value: langCounts[d.id] }));

    const sortedExts  = Object.entries(extCounts).sort((a, b) => b[1] - a[1]);
    const sortedLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);
    const langTotal   = sortedLangs.reduce((s, [, v]) => s + v, 0);

    return {
      filteredDirDist,
      filteredExtDist,
      filteredLangDist,
      fileCount: matchingFiles.length,
      sizeMB:    matchingFiles.reduce((s, f) => s + f.size, 0) / (1024 * 1024),
      dominantExtension:           sortedExts.length  > 0 ? sortedExts[0][0].toUpperCase() : 'N/A',
      dominantLanguage:            sortedLangs.length > 0 ? getLanguageName(sortedLangs[0][0]) : 'N/A',
      dominantLanguagePercentage:  langTotal > 0 && sortedLangs.length > 0
        ? Math.round((sortedLangs[0][1] / langTotal) * 100) : 0,
    };
  }, [crossFilter, fileData, originalDirs, originalExts, originalLangs]);

  // ──────────────────────────────────────────────────────────────────────────
  // FILTERED FILES for the file list section
  // ──────────────────────────────────────────────────────────────────────────
  const filteredFiles = useMemo(() => {
    const allFiles = data?.dataset?.files || [];
    if (!crossFilter) return allFiles;
    return allFiles.filter(file => {
      const dir  = getFileDirectory(file);
      const ext  = getFileExtension(file.original_filename);
      const lang = file.language_code || null;
      if (crossFilter.chartId === 'directory-donut')  return dir  === crossFilter.segmentId;
      if (crossFilter.chartId === 'extension-donut')  return ext  === crossFilter.segmentId;
      if (crossFilter.chartId === 'languages-donut')  return lang === crossFilter.segmentId;
      return true;
    });
  }, [crossFilter, data?.dataset?.files]);

  // Apply search + sort to the file list
  const displayedFiles = useMemo(() => {
    let result = filteredFiles;
    if (fileSearch.trim()) {
      const q = fileSearch.toLowerCase();
      result = result.filter(f =>
        f.original_filename.toLowerCase().includes(q) ||
        (f.directory_name || '').toLowerCase().includes(q) ||
        (f.language_code  || '').toLowerCase().includes(q)
      );
    }
    result = [...result].sort((a, b) => {
      let va: string | number, vb: string | number;
      if      (sortField === 'size')      { va = a.file_size_bytes;      vb = b.file_size_bytes; }
      else if (sortField === 'directory') { va = getFileDirectory(a);    vb = getFileDirectory(b); }
      else                                { va = a.original_filename;    vb = b.original_filename; }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return result;
  }, [filteredFiles, fileSearch, sortField, sortAsc]);

  const totalPages    = Math.max(1, Math.ceil(displayedFiles.length / FILES_PER_PAGE));
  const paginatedFiles = displayedFiles.slice((filePage - 1) * FILES_PER_PAGE, filePage * FILES_PER_PAGE);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────
  const handleSegmentClick = useCallback((chartId: string) => (datum: DonutChartData) => {
    setCrossFilterState(prev =>
      prev?.chartId === chartId && prev?.segmentId === datum.id ? null : { chartId, segmentId: datum.id }
    );
  }, []);
  const clearFilter = useCallback(() => setCrossFilterState(null), []);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(a => !a);
    else { setSortField(field); setSortAsc(true); }
  };

  const handleDownload = async (file: DatasetFile) => {
    const url = file.download_url ?? `/api/v1/datasets/${data?.dataset?.id}/files/${file.id}/download/`;
    try {
      const response = await apiClient.get(url, { responseType: 'blob' });
      downloadBlob(new Blob([response.data]), file.original_filename || file.filename);
    } catch (err: any) {
      let msg = err?.message || 'Error desconocido';
      // La respuesta viene como blob — hay que leerla como texto para obtener el JSON
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          msg = json.error || msg;
        } catch { /* mantener msg original */ }
      }
      showError(`No se pudo descargar "${file.original_filename || file.filename}": ${msg}`);
    }
  };

  const handlePreview = async (file: DatasetFile) => {
    setPreviewFile(file);
    setPreviewContent(null);
    setPreviewLoading(true);
    try {
      const res = await publicApiClient.get(`/documents/${file.id}/preview/`, { params: { chars: 600 } });
      setPreviewContent({ preview: res.data.preview, total_words: res.data.total_words, has_preprocessed: res.data.has_preprocessed });
    } catch {
      setPreviewContent({ preview: '', total_words: 0, has_preprocessed: false });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDelete = (file: DatasetFile) => setDeleteTarget(file);
  const confirmDelete = async () => {
    if (!deleteTarget || !data?.dataset) return;
    // TODO: wire to authenticated API endpoint
    // await datasetsService.deleteFile(data.dataset.id, deleteTarget.id);
    console.info('Delete requested for file:', deleteTarget.id);
    setDeleteTarget(null);
    // Refresh data after delete
    refetch();
  };

  // ──────────────────────────────────────────────────────────────────────────
  // DYNAMIC CENTER VALUES
  // ──────────────────────────────────────────────────────────────────────────
  const getCenterProps = (chartId: string, chartData: DonutChartData[]) => {
    const total = chartData.reduce((s, d) => s + d.value, 0);
    const defaultLabel = chartId === 'languages-donut' ? 'docs' : 'archivos';
    if (!crossFilter || !crossFilterState) return { centerValue: total, centerLabel: defaultLabel };
    if (crossFilter.chartId === chartId) {
      const src = chartId === 'directory-donut' ? originalDirs : chartId === 'extension-donut' ? originalExts : originalLangs;
      const seg = src.find(d => d.id === crossFilter.segmentId);
      return { centerValue: seg?.value || 0, centerLabel: seg?.label || crossFilter.segmentId };
    }
    return { centerValue: crossFilterState.fileCount, centerLabel: 'filtrados' };
  };

  // ──────────────────────────────────────────────────────────────────────────
  // SYNCED METRICS
  // ──────────────────────────────────────────────────────────────────────────
  const syncedMetrics = useMemo(() => {
    const predominantLang = data?.metrics?.predominantLanguage || 'N/A';
    const defaultMetrics = {
      fileCount:                    data?.metrics?.totalFiles || 0,
      sizeMB:                       data?.metrics?.totalSizeMB || 0,
      dominantExtension:            data?.metrics?.dominantExtension || 'N/A',
      predominantLanguage:          predominantLang === 'N/A' ? 'N/A' : getLanguageName(predominantLang),
      predominantLanguagePercentage: data?.metrics?.predominantLanguagePercentage || 0,
    };
    if (!crossFilterState) return defaultMetrics;
    return {
      fileCount:                    crossFilterState.fileCount,
      sizeMB:                       Math.round(crossFilterState.sizeMB * 100) / 100,
      dominantExtension:            crossFilterState.dominantExtension,
      predominantLanguage:          crossFilterState.dominantLanguage,
      predominantLanguagePercentage: crossFilterState.dominantLanguagePercentage,
    };
  }, [crossFilterState, data?.metrics]);

  // ──────────────────────────────────────────────────────────────────────────
  // PREPARATION METRICS
  // ──────────────────────────────────────────────────────────────────────────
  const prepMetrics = useMemo(() => {
    const prep  = data?.selectedPreparation;
    const total = data?.dataset?.total_files || 1;
    if (!prep) return null;
    const processed  = prep.files_processed     || 0;
    const omitted    = prep.files_omitted        || 0;
    const duplicates = prep.duplicates_removed   || 0;
    return {
      processed,
      omitted,
      duplicates,
      processedPct:  Math.round((processed  / total) * 100),
      omittedPct:    Math.round((omitted    / total) * 100),
      duplicatesPct: Math.round((duplicates / total) * 100),
      coverage:      Math.round((processed / total) * 100),
    };
  }, [data]);

  // ──────────────────────────────────────────────────────────────────────────
  // CHART DATA DERIVATION
  // ──────────────────────────────────────────────────────────────────────────
  const crossFilterLabel = useMemo(() => {
    if (!crossFilter) return '';
    if (crossFilter.chartId === 'directory-donut')  return `Directorio: ${crossFilter.segmentId}`;
    if (crossFilter.chartId === 'extension-donut')  return `Extensión: .${crossFilter.segmentId}`;
    if (crossFilter.chartId === 'languages-donut')  return `Idioma: ${getLanguageName(crossFilter.segmentId)}`;
    return crossFilter.segmentId;
  }, [crossFilter]);

  const dirIsOwner  = crossFilter?.chartId === 'directory-donut';
  const extIsOwner  = crossFilter?.chartId === 'extension-donut';
  const langIsOwner = crossFilter?.chartId === 'languages-donut';

  const dirHasFiltered  = (crossFilterState?.filteredDirDist.length  ?? 0) > 0;
  const extHasFiltered  = (crossFilterState?.filteredExtDist.length  ?? 0) > 0;
  const langHasFiltered = (crossFilterState?.filteredLangDist.length ?? 0) > 0;

  const dirChartData  = dirIsOwner  || !crossFilter ? originalDirs  : (dirHasFiltered  ? crossFilterState!.filteredDirDist  : originalDirs);
  const extChartData  = extIsOwner  || !crossFilter ? originalExts  : (extHasFiltered  ? crossFilterState!.filteredExtDist  : originalExts);
  const langChartData = langIsOwner || !crossFilter ? originalLangs : (langHasFiltered ? crossFilterState!.filteredLangDist : originalLangs);

  const dirActiveSegments  = dirIsOwner  ? [crossFilter!.segmentId] : (crossFilter && !dirHasFiltered  ? [] : undefined);
  const extActiveSegments  = extIsOwner  ? [crossFilter!.segmentId] : (crossFilter && !extHasFiltered  ? [] : undefined);
  const langActiveSegments = langIsOwner ? [crossFilter!.segmentId] : (crossFilter && !langHasFiltered ? [] : undefined);

  const dirCenter  = getCenterProps('directory-donut',  dirChartData);
  const extCenter  = getCenterProps('extension-donut',  extChartData);
  const langCenter = getCenterProps('languages-donut',  langChartData);

  // ──────────────────────────────────────────────────────────────────────────
  // EARLY RETURNS
  // ──────────────────────────────────────────────────────────────────────────
  if (!filters.selectedDatasetId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Selecciona un Dataset</h3>
          <p className="text-gray-500 text-sm max-w-md">Usa el selector de Dataset en el panel lateral izquierdo.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Cargando datos del dataset...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics;
  const dataset = data?.dataset;

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Preprocesamiento</h2>
          <p className="text-gray-500 text-sm mt-1">
            {dataset ? `Dataset: ${dataset.name}` : 'Métricas y análisis de la fase de preparación de datos'}
          </p>
        </div>
        {data?.preparations && data.preparations.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Preparación:</span>
            <select
              value={filters.selectedPreparationId || ''}
              onChange={(e) => setSelectedPreparation(e.target.value ? Number(e.target.value) : null)}
              className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400"
            >
              <option value="">Más reciente</option>
              {data.preparations.map((prep) => (
                <option key={prep.id} value={prep.id}>{prep.name} ({prep.status})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Preparation Summary Strip (moved to top) ── */}
      {data?.selectedPreparation && prepMetrics && (
        <div className="bg-slate-800 border border-slate-700/60 rounded-xl">
          {/* Header row */}
          <div className="px-5 py-3 border-b border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <span className="text-sm font-semibold text-white">{data.selectedPreparation.name}</span>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                  data.selectedPreparation.status === 'completed'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                    : data.selectedPreparation.status === 'processing'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  {data.selectedPreparation.status === 'completed' ? 'Completado'
                   : data.selectedPreparation.status === 'processing' ? 'Procesando' : data.selectedPreparation.status}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Total en dataset: <span className="font-semibold text-slate-300">{dataset?.total_files || 0} archivos</span>
            </p>
          </div>
          {/* Stats pills */}
          <div className="p-4 flex gap-3 flex-wrap">
            <StatPill
              label="Procesados"
              value={prepMetrics.processed}
              percent={prepMetrics.processedPct}
              color="emerald"
            />
            <StatPill
              label="Omitidos"
              value={prepMetrics.omitted}
              percent={prepMetrics.omittedPct}
              color="rose"
              tooltip="Archivos no procesados: formatos no soportados (.exe, imágenes, etc.), archivos vacíos o documentos corruptos que no pudieron extraerse."
            />
            <StatPill
              label="Duplicados"
              value={prepMetrics.duplicates}
              percent={prepMetrics.duplicatesPct}
              color="amber"
            />
            <StatPill
              label="Cobertura del Dataset"
              value={`${prepMetrics.coverage}%`}
              subtitle="archivos procesados / total"
              color="blue"
            />

          </div>
        </div>
      )}

      {/* ── No Preparations Warning ── */}
      {data && data.preparations.length === 0 && (
        <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-4">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-700">Sin Preparaciones</h3>
            <p className="text-sm text-gray-600 mt-0.5">
              Este dataset no tiene preparaciones. Ve a{' '}
              <a href="/admin/preparacion" className="text-amber-700 hover:underline font-medium">
                Administración › Preparación de Datos
              </a>{' '}
              para crear una y visualizar idiomas detectados.
            </p>
          </div>
        </div>
      )}

      {/* ── Cross-filter indicator ── */}
      {crossFilter && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm text-amber-700">
              Filtro activo: <span className="font-medium text-amber-800">{crossFilterLabel}</span>
              {crossFilterState && (
                <span className="ml-1.5 text-amber-600">
                  — {crossFilterState.fileCount} archivo{crossFilterState.fileCount !== 1 ? 's' : ''}
                </span>
              )}
            </span>
          </div>
          <button
            onClick={clearFilter}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Limpiar
          </button>
        </div>
      )}

      {/* ── KPI Metrics Row ── */}
      <DashboardGrid columns={4} gap="md">
        <MetricCardDark
          title="Archivos Totales"
          value={syncedMetrics.fileCount}
          subtitle={crossFilter ? 'Archivos filtrados' : 'En el dataset'}
          icon={<FileIcon />}
          accentColor="cyan"
        />
        <MetricCardDark
          title="Tamaño Total"
          value={`${syncedMetrics.sizeMB.toFixed(1)} MB`}
          subtitle={crossFilter ? 'Volumen filtrado' : 'Volumen de datos'}
          icon={<SizeIcon />}
          accentColor="purple"
        />
        <MetricCardDark
          title="Total de Tokens"
          value={data?.selectedPreparation?.total_tokens != null && data.selectedPreparation.total_tokens > 0
            ? data.selectedPreparation.total_tokens.toLocaleString()
            : syncedMetrics.dominantExtension}
          subtitle={data?.selectedPreparation?.total_tokens != null && data.selectedPreparation.total_tokens > 0
            ? `~${data.selectedPreparation.avg_tokens_per_doc.toLocaleString()} tokens/doc · corpus preprocesado`
            : crossFilter ? 'Más común (filtrado)' : 'Ejecuta una preparación para ver tokens'}
          icon={<ExtensionIcon />}
          accentColor="amber"
        />
        <MetricCardDark
          title="Idioma Predominante"
          value={syncedMetrics.predominantLanguage}
          subtitle={
            syncedMetrics.predominantLanguage !== 'N/A'
              ? `${syncedMetrics.predominantLanguagePercentage}% de los documentos`
              : 'Ejecuta una preparación'
          }
          icon={<LanguageIcon />}
          accentColor="purple"
        />
      </DashboardGrid>

      {/* ── Processing Stats Row ── */}
      <DashboardGrid columns={3} gap="md">
        <MetricCardDark
          title="Procesados"
          value={metrics?.filesProcessed || 0}
          subtitle={
            prepMetrics
              ? `${prepMetrics.processedPct}% del total del dataset`
              : 'Archivos preparados'
          }
          icon={<CheckIcon />}
          accentColor="emerald"
        />
        <MetricCardDark
          title="Duplicados Eliminados"
          value={metrics?.duplicatesRemoved || 0}
          subtitle={
            prepMetrics
              ? `${prepMetrics.duplicatesPct}% del total del dataset`
              : 'Archivos duplicados removidos'
          }
          icon={<DuplicateIcon />}
          accentColor="rose"
        />
        <MetricCardDark
          title="Archivos Omitidos"
          value={metrics?.filesOmitted || 0}
          subtitle={
            prepMetrics
              ? `${prepMetrics.omittedPct}% — formatos no soportados, vacíos o corruptos`
              : 'Formatos no soportados, archivos vacíos o corruptos'
          }
          icon={<SkipIcon />}
          accentColor="blue"
        />
      </DashboardGrid>

      {/* ── Distribution Charts ── */}
      <DashboardGrid columns={3} gap="lg">
        {/* Directory Donut */}
        <ChartCard
          title="Distribución por Directorio"
          subtitle="Archivos por carpeta"
          accentColor="emerald"
          size="lg"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
          isActive={crossFilter?.chartId === 'directory-donut'}
          onRefreshClick={() => refetch()}
          isLoading={isLoading}
        >
          <div className="h-[260px]">
            {dirChartData.length > 0 ? (
              <DonutChartViz
                data={dirChartData}
                chartId="directory-donut"
                centerValue={dirCenter.centerValue}
                centerLabel={dirCenter.centerLabel}
                activeSegments={dirActiveSegments}
                skipCrossFilter
                onSegmentClick={handleSegmentClick('directory-donut')}
                onClearFilter={clearFilter}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">No hay datos de directorios</div>
            )}
          </div>
        </ChartCard>

        {/* Extension Donut */}
        <ChartCard
          title="Distribución por Extensión"
          subtitle="Tipos de archivo"
          accentColor="cyan"
          size="lg"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          }
          isActive={crossFilter?.chartId === 'extension-donut'}
          onRefreshClick={() => refetch()}
          isLoading={isLoading}
        >
          <div className="h-[260px]">
            {extChartData.length > 0 ? (
              <DonutChartViz
                data={extChartData}
                chartId="extension-donut"
                centerValue={extCenter.centerValue}
                centerLabel={extCenter.centerLabel}
                activeSegments={extActiveSegments}
                skipCrossFilter
                onSegmentClick={handleSegmentClick('extension-donut')}
                onClearFilter={clearFilter}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">No hay datos de extensiones</div>
            )}
          </div>
        </ChartCard>

        {/* Language Donut — shows ALL detected languages */}
        <ChartCard
          title="Distribución de Idiomas"
          subtitle={`Idiomas detectados${originalLangs.length > 0 ? ` · ${originalLangs.length} idioma${originalLangs.length !== 1 ? 's' : ''}` : ''}`}
          accentColor="purple"
          size="lg"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          }
          isActive={crossFilter?.chartId === 'languages-donut'}
          onRefreshClick={() => refetch()}
          isLoading={isLoading}
        >
          <div className="h-[260px]">
            {langChartData.length > 0 ? (
              <DonutChartViz
                data={langChartData}
                chartId="languages-donut"
                centerValue={langCenter.centerValue}
                centerLabel={langCenter.centerLabel}
                activeSegments={langActiveSegments}
                skipCrossFilter
                onSegmentClick={handleSegmentClick('languages-donut')}
                onClearFilter={clearFilter}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm text-center px-4">
                {data?.selectedPreparation ? 'No hay datos de idiomas detectados' : 'Ejecuta una preparación para detectar idiomas'}
              </div>
            )}
          </div>
        </ChartCard>
      </DashboardGrid>

      {/* ── VIZ-1: File Size Histogram ── */}
      {data?.dataset?.files && data.dataset.files.length > 0 && (() => {
        const BINS = [
          { label: '0–10 KB',    min: 0,          max: 10 * 1024 },
          { label: '10–50 KB',   min: 10 * 1024,  max: 50 * 1024 },
          { label: '50–100 KB',  min: 50 * 1024,  max: 100 * 1024 },
          { label: '100–500 KB', min: 100 * 1024, max: 500 * 1024 },
          { label: '500 KB–1 MB', min: 500 * 1024, max: 1024 * 1024 },
          { label: '1 MB+',      min: 1024 * 1024, max: Infinity },
        ];
        const counts = BINS.map(b =>
          data.dataset!.files.filter(f => f.file_size_bytes >= b.min && f.file_size_bytes < b.max).length
        );
        const maxCount = Math.max(...counts, 1);
        const totalWithSize = data.dataset!.files.filter(f => f.file_size_bytes > 0).length;
        const avgBytes = totalWithSize > 0
          ? data.dataset!.files.reduce((s, f) => s + (f.file_size_bytes || 0), 0) / totalWithSize
          : 0;

        return (
          <ChartCard
            title="Distribución de Tamaños de Archivos"
            subtitle={`${totalWithSize} archivos · promedio ${formatFileSize(avgBytes)}`}
            accentColor="cyan"
            size="md"
            icon={<SizeIcon />}
          >
            <div className="px-2 pb-2">
              <div className="flex items-end gap-2 h-28 sm:h-36 pt-2">
                {BINS.map((bin, i) => {
                  const count = counts[i];
                  const heightPct = (count / maxCount) * 100;
                  const pct = totalWithSize > 0 ? ((count / totalWithSize) * 100).toFixed(1) : '0';
                  return (
                    <div key={bin.label} className="flex-1 flex flex-col items-center gap-1 min-w-0 group relative">
                      <div
                        className="w-full bg-cyan-400 rounded-t-sm transition-all duration-500 group-hover:bg-cyan-500"
                        style={{ height: `${Math.max(heightPct, count > 0 ? 4 : 0)}%` }}
                      />
                      <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center pointer-events-none z-10">
                        <div className="bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                          {bin.label}: {count} doc{count !== 1 ? 's' : ''} ({pct}%)
                        </div>
                        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-start gap-2 mt-1">
                {BINS.map((bin, i) => (
                  <div key={bin.label} className="flex-1 min-w-0 text-center">
                    <span className="text-gray-400 block truncate" style={{ fontSize: '9px' }}>{bin.label}</span>
                    {counts[i] > 0 && (
                      <span className="text-cyan-500 font-semibold" style={{ fontSize: '9px' }}>{counts[i]}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 border-t border-gray-100 pt-3" style={{ fontSize: '11px' }}>
                <span className="text-gray-500">
                  Mín: <strong className="text-gray-700">{formatFileSize(Math.min(...data.dataset!.files.map(f => f.file_size_bytes || 0).filter(s => s > 0)))}</strong>
                </span>
                <span className="text-gray-500">
                  Máx: <strong className="text-gray-700">{formatFileSize(Math.max(...data.dataset!.files.map(f => f.file_size_bytes || 0)))}</strong>
                </span>
                <span className="text-gray-500">
                  Promedio: <strong className="text-gray-700">{formatFileSize(avgBytes)}</strong>
                </span>
              </div>
            </div>
          </ChartCard>
        );
      })()}

      {/* ── Temporal Analysis Section ── */}
      {data?.dataset?.files && data.dataset.files.some(f => f.bib_year) && (() => {
        // Compute year distribution from bib_year field
        const yearCounts: Record<number, number> = {};
        data.dataset!.files.forEach(f => {
          if (f.bib_year) yearCounts[f.bib_year] = (yearCounts[f.bib_year] ?? 0) + 1;
        });
        const sortedYears = Object.keys(yearCounts).map(Number).sort((a, b) => a - b);
        const maxCount = Math.max(...Object.values(yearCounts), 1);

        return (
          <ChartCard
            title="Distribución Temporal"
            subtitle="Publicaciones por año (bib_year)"
            accentColor="amber"
            size="md"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          >
            <div className="px-2 pb-2">
              {/* Bar chart */}
              <div className="flex items-end gap-1 h-28 sm:h-36 pt-2">
                {sortedYears.map(year => {
                  const count = yearCounts[year];
                  const heightPct = (count / maxCount) * 100;
                  return (
                    <div key={year} className="flex-1 flex flex-col items-center gap-1 min-w-0 group relative">
                      <div
                        className="w-full bg-amber-400 rounded-t-sm transition-all duration-500 group-hover:bg-amber-500"
                        style={{ height: `${Math.max(heightPct, 4)}%` }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1 hidden group-hover:flex flex-col items-center pointer-events-none z-10">
                        <div className="bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                          {year}: {count} doc{count !== 1 ? 's' : ''}
                        </div>
                        <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* X-axis labels */}
              <div className="flex items-start gap-1 mt-1">
                {sortedYears.map(year => (
                  <div key={year} className="flex-1 min-w-0 text-center">
                    <span className="text-xs text-gray-400 block truncate" style={{ fontSize: sortedYears.length > 15 ? '9px' : '10px' }}>
                      {year}
                    </span>
                  </div>
                ))}
              </div>
              {/* Summary */}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500 border-t border-gray-100 pt-3">
                <span>
                  <strong className="text-gray-700">{sortedYears.length}</strong> años con publicaciones
                </span>
                <span>
                  <strong className="text-gray-700">{sortedYears[0]}</strong> – <strong className="text-gray-700">{sortedYears[sortedYears.length - 1]}</strong> rango
                </span>
                <span>
                  Pico: <strong className="text-gray-700">{sortedYears.find(y => yearCounts[y] === maxCount)}</strong> ({maxCount} docs)
                </span>
              </div>
            </div>
          </ChartCard>
        );
      })()}

      {/* ── Listado de archivos ── */}
      <FileListSection
        data={data}
        displayedFiles={displayedFiles}
        paginatedFiles={paginatedFiles}
        fileSearch={fileSearch}
        setFileSearch={setFileSearch}
        filePage={filePage}
        setFilePage={setFilePage}
        totalPages={totalPages}
        sortField={sortField}
        sortAsc={sortAsc}
        handleSort={handleSort}
        crossFilter={crossFilter}
        crossFilterLabel={crossFilterLabel}
        handlePreview={handlePreview}
        handleDownload={handleDownload}
        handleDelete={handleDelete}
      />

      {/* ── Document Preview Panel (TRANS-6) ── */}
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

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <DeleteModal
          file={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
