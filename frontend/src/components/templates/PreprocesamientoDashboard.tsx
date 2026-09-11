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
import { DashboardGrid, MetricCardDark } from '../organisms';
import type { DonutChartData } from '../organisms/DonutChartViz';
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
  DocumentPreviewPanel,
  DistributionCharts,
  FileSizeHistogram,
  TemporalAnalysis,
  FileIcon,
  SizeIcon,
  CheckIcon,
  DuplicateIcon,
  ExtensionIcon,
  LanguageIcon,
  SkipIcon,
  getLanguageName,
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

      <DistributionCharts
        data={data}
        isLoading={isLoading}
        refetch={refetch}
        crossFilter={crossFilter}
        clearFilter={clearFilter}
        handleSegmentClick={handleSegmentClick}
        dirChartData={dirChartData}
        extChartData={extChartData}
        langChartData={langChartData}
        dirActiveSegments={dirActiveSegments}
        extActiveSegments={extActiveSegments}
        langActiveSegments={langActiveSegments}
        dirCenter={dirCenter}
        extCenter={extCenter}
        langCenter={langCenter}
        originalLangs={originalLangs}
      />

      <FileSizeHistogram data={data} />

      <TemporalAnalysis data={data} />

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

      {/* ── Vista previa del documento ── */}
      <DocumentPreviewPanel
        previewFile={previewFile}
        previewContent={previewContent}
        previewLoading={previewLoading}
        setPreviewFile={setPreviewFile}
        handleDownload={handleDownload}
      />

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
