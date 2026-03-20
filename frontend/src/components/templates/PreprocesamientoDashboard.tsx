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
import dashboardService from '../../services/dashboardService';
import type { PreprocessingDashboardData } from '../../services/dashboardService';
import { useFilter } from '../../contexts/FilterContext';
import { LANGUAGE_NAMES } from '../../services/dataPreparationService';
import type { DatasetFile } from '../../services/datasetsService';

// ─── Helpers ────────────────────────────────────────────────────────────────
const getLanguageName = (code: string): string =>
  LANGUAGE_NAMES[code]?.name || code.toUpperCase();

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getFileExtension = (filename: string) =>
  filename.split('.').pop()?.toLowerCase() || 'unknown';

/**
 * FIX: Extract directory using directory_name first.
 * The backend groups files by directory_name in DirectoryStats,
 * so matching on directory_name avoids the directory_path root-split mismatch.
 */
const getFileDirectory = (f: DatasetFile): string =>
  f.directory_name || f.directory_path?.split('/').filter(Boolean)[0] || 'root';

// ─── Icons ───────────────────────────────────────────────────────────────────
const FileIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const SizeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
  </svg>
);
const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const DuplicateIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);
const ExtensionIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);
const LanguageIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
  </svg>
);
const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const UploadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);
const SearchIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const SkipIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);

// ─── File Entry for cross-filtering ─────────────────────────────────────────
interface FileEntry {
  directory: string;
  extension: string;
  language: string | null;
  size: number;
}

const FILES_PER_PAGE = 12;

// ─── Stat Pill (compact preparation metric) ──────────────────────────────────
interface StatPillProps {
  label: string;
  value: string | number;
  percent?: number;
  subtitle?: string;
  color: 'emerald' | 'rose' | 'amber' | 'blue' | 'violet';
}
const colorMap: Record<StatPillProps['color'], { bg: string; text: string; bar: string; dot: string }> = {
  emerald: { bg: 'bg-emerald-50',  text: 'text-emerald-700', bar: 'bg-emerald-400', dot: 'bg-emerald-500' },
  rose:    { bg: 'bg-rose-50',     text: 'text-rose-700',    bar: 'bg-rose-400',    dot: 'bg-rose-500'    },
  amber:   { bg: 'bg-amber-50',    text: 'text-amber-700',   bar: 'bg-amber-400',   dot: 'bg-amber-500'   },
  blue:    { bg: 'bg-blue-50',     text: 'text-blue-700',    bar: 'bg-blue-400',    dot: 'bg-blue-500'    },
  violet:  { bg: 'bg-violet-50',   text: 'text-violet-700',  bar: 'bg-violet-400',  dot: 'bg-violet-500'  },
};

const StatPill: React.FC<StatPillProps> = ({ label, value, percent, subtitle, color }) => {
  const c = colorMap[color];
  return (
    <div className={`flex-1 min-w-[120px] rounded-lg px-4 py-3 ${c.bg}`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${c.text}`}>{value}</p>
      {percent !== undefined && (
        <div className="mt-1.5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">{percent.toFixed(1)}% del total</span>
          </div>
          <div className="h-1 w-full rounded-full bg-gray-200">
            <div
              className={`h-1 rounded-full transition-all ${c.bar}`}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
        </div>
      )}
      {subtitle && !percent && (
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      )}
    </div>
  );
};

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
interface DeleteModalProps {
  file: DatasetFile;
  onConfirm: () => void;
  onCancel: () => void;
}
const DeleteModal: React.FC<DeleteModalProps> = ({ file, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 max-w-sm w-full mx-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
          <TrashIcon />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Eliminar archivo</h3>
          <p className="text-xs text-gray-500">Esta acción no se puede deshacer</p>
        </div>
      </div>
      <p className="text-sm text-gray-700 mb-5 bg-gray-50 rounded-lg p-3 font-mono break-all">
        {file.original_filename}
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-600 transition-colors"
        >
          Eliminar
        </button>
      </div>
    </div>
  </div>
);

// ─── Extension Badge ──────────────────────────────────────────────────────────
const EXT_COLORS: Record<string, string> = {
  pdf:  'bg-rose-100 text-rose-700',
  txt:  'bg-blue-100 text-blue-700',
  docx: 'bg-blue-100 text-blue-800',
  xlsx: 'bg-green-100 text-green-700',
  csv:  'bg-lime-100 text-lime-700',
  json: 'bg-amber-100 text-amber-700',
  xml:  'bg-violet-100 text-violet-700',
};
const ExtBadge: React.FC<{ ext: string }> = ({ ext }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase ${EXT_COLORS[ext] || 'bg-gray-100 text-gray-600'}`}>
    .{ext}
  </span>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const PreprocesamientoDashboard: React.FC = () => {
  const [data, setData]               = useState<PreprocessingDashboardData | null>(null);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [crossFilter, setCrossFilterState] = useState<{ chartId: string; segmentId: string } | null>(null);
  const { filters, setSelectedPreparation } = useFilter();

  // File list state
  const [fileSearch, setFileSearch]       = useState('');
  const [filePage, setFilePage]           = useState(1);
  const [deleteTarget, setDeleteTarget]   = useState<DatasetFile | null>(null);
  const [sortField, setSortField]         = useState<'name' | 'size' | 'directory'>('name');
  const [sortAsc, setSortAsc]             = useState(true);

  // Reset cross-filter & file list when dataset changes
  useEffect(() => {
    setCrossFilterState(null);
    setFilePage(1);
    setFileSearch('');
  }, [filters.selectedDatasetId]);

  // Reset page when cross-filter changes
  useEffect(() => { setFilePage(1); }, [crossFilter]);

  useEffect(() => {
    if (filters.selectedDatasetId) fetchData(filters.selectedDatasetId);
    else { setData(null); setIsLoading(false); }
  }, [filters.selectedDatasetId]);

  const fetchData = async (datasetId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await dashboardService.getPreprocessingData(datasetId);
      setData(result);
    } catch (err) {
      setError('Error al cargar los datos del dataset');
      console.error('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleDownload = (file: DatasetFile) => {
    const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
    const url = `${apiBase}/public/datasets/${data?.dataset?.id}/files/${file.id}/download/`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleDelete = (file: DatasetFile) => setDeleteTarget(file);
  const confirmDelete = async () => {
    if (!deleteTarget || !data?.dataset) return;
    // TODO: wire to authenticated API endpoint
    // await datasetsService.deleteFile(data.dataset.id, deleteTarget.id);
    console.info('Delete requested for file:', deleteTarget.id);
    setDeleteTarget(null);
    // Refresh data after delete
    fetchData(data.dataset.id);
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
    const attempted  = processed + omitted + duplicates;
    return {
      processed,
      omitted,
      duplicates,
      processedPct:  Math.round((processed  / total) * 100),
      omittedPct:    Math.round((omitted    / total) * 100),
      duplicatesPct: Math.round((duplicates / total) * 100),
      /** Cobertura: processed / total dataset files */
      coverage:      Math.round((processed / total) * 100),
      /** Tasa de éxito: of the attempted files, how many were processed */
      successRate:   attempted > 0 ? Math.round((processed / attempted) * 100) : 0,
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
            onClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
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
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
          {/* Header row */}
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900">{data.selectedPreparation.name}</span>
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                  data.selectedPreparation.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-700'
                    : data.selectedPreparation.status === 'processing'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {data.selectedPreparation.status === 'completed' ? 'Completado'
                   : data.selectedPreparation.status === 'processing' ? 'Procesando' : data.selectedPreparation.status}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Total en dataset: <span className="font-semibold text-gray-600">{dataset?.total_files || 0} archivos</span>
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
            <StatPill
              label="Tasa de Éxito"
              value={`${prepMetrics.successRate}%`}
              subtitle="efectividad de la preparación"
              color="violet"
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
          title="Extensión Principal"
          value={syncedMetrics.dominantExtension}
          subtitle={crossFilter ? 'Más común (filtrado)' : 'Tipo más común'}
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
              ? `${prepMetrics.omittedPct}% del total del dataset`
              : 'No procesados (errores o incompatibles)'
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
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
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
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
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
          onRefreshClick={() => filters.selectedDatasetId && fetchData(filters.selectedDatasetId)}
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

      {/* ── File List Section ── */}
      {data?.dataset?.files && data.dataset.files.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                {crossFilter ? `Archivos — ${crossFilterLabel}` : 'Archivos del Dataset'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {displayedFiles.length} archivo{displayedFiles.length !== 1 ? 's' : ''}
                {crossFilter && ` coinciden con el filtro`}
                {fileSearch && ` · búsqueda: "${fileSearch}"`}
              </p>
            </div>

            {/* Search */}
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={fileSearch}
                onChange={e => { setFileSearch(e.target.value); setFilePage(1); }}
                placeholder="Buscar archivo..."
                className="pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 w-56"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th
                    onClick={() => handleSort('name')}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
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
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none hidden md:table-cell"
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Idioma
                  </th>
                  <th
                    onClick={() => handleSort('size')}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none hidden lg:table-cell"
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
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedFiles.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">
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
                    <tr key={file.id} className={`hover:bg-blue-50/40 transition-colors ${isEven ? 'bg-white' : 'bg-gray-50/40'}`}>
                      {/* Filename */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p
                              className="text-sm font-medium text-gray-900 truncate max-w-[200px] lg:max-w-[320px]"
                              title={file.original_filename}
                            >
                              {file.bib_title || file.original_filename}
                            </p>
                            {file.bib_title && (
                              <p className="text-xs text-gray-400 truncate max-w-[200px]" title={file.original_filename}>
                                {file.original_filename}
                              </p>
                            )}
                            {file.bib_year && (
                              <p className="text-xs text-gray-400">{file.bib_year}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Directory */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
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
                          <span className="inline-flex items-center gap-1 text-xs text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md font-medium">
                            {lang}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      {/* Size */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-gray-500">{formatFileSize(file.file_size_bytes)}</span>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Download */}
                          <button
                            onClick={() => handleDownload(file)}
                            title="Descargar PDF"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <DownloadIcon />
                          </button>
                          {/* Replace */}
                          <label
                            title="Reemplazar archivo"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            <UploadIcon />
                            <input
                              type="file"
                              accept=".pdf,.txt,.docx"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) console.info('Replace file:', file.id, 'with:', f.name);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(file)}
                            title="Eliminar archivo"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3 bg-gray-50">
              <p className="text-xs text-gray-500">
                Mostrando {Math.min((filePage - 1) * FILES_PER_PAGE + 1, displayedFiles.length)}–
                {Math.min(filePage * FILES_PER_PAGE, displayedFiles.length)} de {displayedFiles.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setFilePage(1)}
                  disabled={filePage === 1}
                  className="px-2.5 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  «
                </button>
                <button
                  onClick={() => setFilePage(p => p - 1)}
                  disabled={filePage === 1}
                  className="px-2.5 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                          : 'border-gray-200 text-gray-600 hover:bg-white'
                      }`}
                    >
                      {page}
                    </button>
                  ) : null;
                })}
                <button
                  onClick={() => setFilePage(p => p + 1)}
                  disabled={filePage === totalPages}
                  className="px-2.5 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
                <button
                  onClick={() => setFilePage(totalPages)}
                  disabled={filePage === totalPages}
                  className="px-2.5 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
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
