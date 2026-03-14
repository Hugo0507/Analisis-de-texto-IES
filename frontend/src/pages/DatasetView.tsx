/**
 * DatasetView Page
 *
 * Vista de un dataset con:
 * - Información general y métricas
 * - Resumen PRISMA (incluidos / excluidos / pendientes)
 * - Distribución por directorio y extensión
 * - Tabla de archivos con metadatos bibliográficos y estado PRISMA
 * - Modal de edición de metadatos por archivo
 * - Auto-detección de base de datos de origen
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import datasetsService from '../services/datasetsService';
import { SOURCE_DB_LABELS } from '../services/datasetsService';
import type {
  Dataset, DatasetFile, DirectoryStats,
  FileBibUpdate, InclusionStatus, SourceDb,
} from '../services/datasetsService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_DB_OPTIONS: { value: SourceDb | ''; label: string }[] = [
  { value: '', label: '— Sin especificar —' },
  { value: 'scopus', label: 'Scopus' },
  { value: 'wos', label: 'Web of Science' },
  { value: 'sciencedirect', label: 'ScienceDirect / Elsevier' },
  { value: 'sage', label: 'SAGE Journals' },
  { value: 'taylor_francis', label: 'Taylor & Francis' },
  { value: 'springer', label: 'Springer / SpringerLink' },
  { value: 'wiley', label: 'Wiley Online Library' },
  { value: 'ieee', label: 'IEEE Xplore' },
  { value: 'acm', label: 'ACM Digital Library' },
  { value: 'redalyc', label: 'Redalyc' },
  { value: 'scielo', label: 'SciELO' },
  { value: 'dialnet', label: 'Dialnet' },
  { value: 'eric', label: 'ERIC' },
  { value: 'pubmed', label: 'PubMed' },
  { value: 'google_scholar', label: 'Google Scholar' },
  { value: 'semantic_scholar', label: 'Semantic Scholar' },
  { value: 'other', label: 'Otra' },
];

const SOURCE_DB_COLORS: Record<string, string> = {
  scopus: 'bg-orange-100 text-orange-700',
  wos: 'bg-blue-100 text-blue-700',
  sciencedirect: 'bg-sky-100 text-sky-700',
  sage: 'bg-green-100 text-green-700',
  taylor_francis: 'bg-rose-100 text-rose-700',
  springer: 'bg-amber-100 text-amber-700',
  wiley: 'bg-violet-100 text-violet-700',
  ieee: 'bg-blue-100 text-blue-800',
  acm: 'bg-red-100 text-red-700',
  redalyc: 'bg-purple-100 text-purple-700',
  scielo: 'bg-emerald-100 text-emerald-700',
  dialnet: 'bg-yellow-100 text-yellow-700',
  eric: 'bg-teal-100 text-teal-700',
  pubmed: 'bg-red-100 text-red-700',
  google_scholar: 'bg-indigo-100 text-indigo-700',
  semantic_scholar: 'bg-cyan-100 text-cyan-700',
  other: 'bg-gray-100 text-gray-700',
};

const INCLUSION_COLORS: Record<InclusionStatus, string> = {
  included: 'bg-emerald-100 text-emerald-700',
  excluded: 'bg-red-100 text-red-700',
  pending: 'bg-yellow-100 text-yellow-700',
};

const INCLUSION_ICONS: Record<InclusionStatus, string> = {
  included: '✓',
  excluded: '✗',
  pending: '⏳',
};

type ActiveTab = 'files' | 'prisma';

// ─── Bib Edit Modal ───────────────────────────────────────────────────────────

interface BibEditModalProps {
  file: DatasetFile;
  onSave: (fileId: number, data: FileBibUpdate) => Promise<void>;
  onClose: () => void;
}

const BibEditModal: React.FC<BibEditModalProps> = ({ file, onSave, onClose }) => {
  const [form, setForm] = useState<FileBibUpdate>({
    bib_title: file.bib_title || '',
    bib_authors: file.bib_authors || '',
    bib_year: file.bib_year ?? undefined,
    bib_journal: file.bib_journal || '',
    bib_doi: file.bib_doi || '',
    bib_abstract: file.bib_abstract || '',
    bib_keywords: file.bib_keywords || '',
    bib_source_db: file.bib_source_db || '',
    bib_volume: file.bib_volume || '',
    bib_issue: file.bib_issue || '',
    bib_pages: file.bib_pages || '',
    inclusion_status: file.inclusion_status,
    exclusion_reason: file.exclusion_reason || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field: keyof FileBibUpdate, value: string | number | undefined) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(file.id, form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Metadatos Bibliográficos</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate max-w-md">{file.original_filename}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Título</label>
            <input type="text" value={form.bib_title} onChange={e => set('bib_title', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Título del artículo" />
          </div>

          {/* Autores + Año */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Autores <span className="font-normal text-gray-400">(separados por ;)</span></label>
              <input type="text" value={form.bib_authors} onChange={e => set('bib_authors', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="García, J.; López, M." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Año</label>
              <input type="number" value={form.bib_year ?? ''} onChange={e => set('bib_year', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="2024" min={1900} max={2100} />
            </div>
          </div>

          {/* Revista + DOI */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Revista / Conferencia</label>
              <input type="text" value={form.bib_journal} onChange={e => set('bib_journal', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Journal of..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">DOI</label>
              <input type="text" value={form.bib_doi} onChange={e => set('bib_doi', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="10.1234/..." />
            </div>
          </div>

          {/* Volumen + Número + Páginas + Fuente */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Volumen</label>
              <input type="text" value={form.bib_volume} onChange={e => set('bib_volume', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="12" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Número</label>
              <input type="text" value={form.bib_issue} onChange={e => set('bib_issue', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="3" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Páginas</label>
              <input type="text" value={form.bib_pages} onChange={e => set('bib_pages', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" placeholder="45-67" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Base de datos</label>
              <select value={form.bib_source_db} onChange={e => set('bib_source_db', e.target.value as SourceDb)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                {SOURCE_DB_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Palabras clave <span className="font-normal text-gray-400">(separadas por ;)</span></label>
            <input type="text" value={form.bib_keywords} onChange={e => set('bib_keywords', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="transformación digital; educación superior; PLN" />
          </div>

          {/* Abstract */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Resumen</label>
            <textarea value={form.bib_abstract} onChange={e => set('bib_abstract', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Resumen del artículo..." />
          </div>

          {/* PRISMA */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Decisión de inclusión (PRISMA)</p>
            <div className="flex gap-3 mb-3">
              {(['included', 'pending', 'excluded'] as InclusionStatus[]).map(s => (
                <button key={s} type="button"
                  onClick={() => set('inclusion_status', s)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                    form.inclusion_status === s
                      ? s === 'included' ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : s === 'excluded' ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-yellow-400 bg-yellow-50 text-yellow-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  {INCLUSION_ICONS[s]} {s === 'included' ? 'Incluir' : s === 'excluded' ? 'Excluir' : 'Pendiente'}
                </button>
              ))}
            </div>
            {form.inclusion_status === 'excluded' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Motivo de exclusión <span className="text-red-500">*</span></label>
                <textarea value={form.exclusion_reason} onChange={e => set('exclusion_reason', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Ej: No corresponde al ámbito de educación superior" />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Spinner size="sm" /> Guardando...</> : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const DatasetView: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showSuccess, showError } = useToast();

  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [directoryStats, setDirectoryStats] = useState<DirectoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('files');
  const [inclusionFilter, setInclusionFilter] = useState<InclusionStatus | 'all'>('all');
  const [editingFile, setEditingFile] = useState<DatasetFile | null>(null);
  const [isExtractingMeta, setIsExtractingMeta] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadDataset();
  }, [id]);

  useEffect(() => {
    if (!dataset || dataset.status !== 'processing') return;
    const poll = setInterval(loadDataset, 5000);
    return () => clearInterval(poll);
  }, [dataset?.status]);

  const loadDataset = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [datasetData, dirStats] = await Promise.all([
        datasetsService.getDataset(parseInt(id)),
        datasetsService.getDirectoryStats(parseInt(id)),
      ]);
      setDataset(datasetData);
      setDirectoryStats(dirStats);
    } catch (error: any) {
      showError('Error al cargar dataset: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtractMetadata = async (force = false) => {
    if (!id) return;
    setIsExtractingMeta(true);
    try {
      const result = await datasetsService.autoExtractMetadata(parseInt(id), force);
      showSuccess(`${result.message}`);
      // Reload progressively: 5s, 15s, 30s to catch results as they arrive
      setTimeout(() => loadDataset(), 5000);
      setTimeout(() => loadDataset(), 15000);
      setTimeout(() => loadDataset(), 30000);
    } catch {
      showError('Error al iniciar la extracción de metadatos');
    } finally {
      setIsExtractingMeta(false);
    }
  };


  const handleSaveFileBib = useCallback(async (fileId: number, data: FileBibUpdate) => {
    if (!id) return;
    try {
      const updated = await datasetsService.updateFileBib(parseInt(id), fileId, data);
      setDataset(prev => prev ? {
        ...prev,
        files: prev.files.map(f => f.id === fileId ? updated : f),
        prisma_stats: {
          ...prev.prisma_stats,
          included: prev.files.filter(f => (f.id === fileId ? updated : f).inclusion_status === 'included').length,
          excluded: prev.files.filter(f => (f.id === fileId ? updated : f).inclusion_status === 'excluded').length,
          pending: prev.files.filter(f => (f.id === fileId ? updated : f).inclusion_status === 'pending').length,
        }
      } : prev);
      setEditingFile(null);
      showSuccess('Metadatos actualizados');
    } catch (error: any) {
      showError('Error al guardar: ' + (error.response?.data?.exclusion_reason?.[0] || error.response?.data?.error || error.message));
    }
  }, [id]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

  const getStatusBadge = (status: string) => {
    const cfg = {
      pending: ['bg-yellow-100 text-yellow-700', 'Pendiente'],
      processing: ['bg-blue-100 text-blue-700', 'Procesando'],
      completed: ['bg-emerald-100 text-emerald-700', 'Completado'],
      error: ['bg-red-100 text-red-700', 'Error'],
    }[status] ?? ['bg-gray-100 text-gray-600', status];
    return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cfg[0]}`}>{cfg[1]}</span>;
  };

  const getExtensionStats = () => {
    const stats: Record<string, number> = {};
    dataset?.files.forEach(f => {
      const ext = f.original_filename.split('.').pop()?.toLowerCase() || 'unknown';
      stats[ext] = (stats[ext] || 0) + 1;
    });
    return stats;
  };

  // ── Filtered files ─────────────────────────────────────────────────────────

  const filteredFiles = (dataset?.files ?? []).filter(f => {
    const matchSearch = !searchTerm ||
      f.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.bib_title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.bib_authors || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchInclusion = inclusionFilter === 'all' || f.inclusion_status === inclusionFilter;
    return matchSearch && matchInclusion;
  });

  // ── Early returns ──────────────────────────────────────────────────────────

  if (isLoading) return <div className="flex items-center justify-center h-96"><Spinner size="lg" /></div>;
  if (!dataset) return <div className="flex items-center justify-center h-96"><p className="text-gray-500">Dataset no encontrado</p></div>;

  const extensionStats = getExtensionStats();
  const totalFiles = dataset.files.length;
  const prisma = dataset.prisma_stats ?? { total: totalFiles, included: 0, excluded: 0, pending: totalFiles };

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: '#F4F7FE' }}>

      {/* Edit Modal */}
      {editingFile && (
        <BibEditModal
          file={editingFile}
          onSave={handleSaveFileBib}
          onClose={() => setEditingFile(null)}
        />
      )}

      {/* Fixed Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/admin/configuracion/datasets')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">{dataset.name}</h1>
            <div className="ml-1">{getStatusBadge(dataset.status)}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExtractMetadata(false)}
              disabled={isExtractingMeta}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              title="Extrae título, autores, año, revista, abstract y más desde el PDF vía CrossRef API"
            >
              {isExtractingMeta ? <Spinner size="sm" /> : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347A3.75 3.75 0 0114.25 18H9.75a3.75 3.75 0 01-2.65-6.344l-.347-.347z" />
                </svg>
              )}
              Extraer metadatos bibliográficos
            </button>
            <button
              onClick={() => navigate(`/admin/configuracion/datasets/${id}/editar`)}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors">
              Editar dataset
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 w-full max-w-full">

        {/* Processing Banner */}
        {dataset.status === 'processing' && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800">Procesando archivos en segundo plano</p>
              <p className="text-xs text-blue-600">Esta página se actualiza automáticamente cada 5 segundos.</p>
            </div>
          </div>
        )}

        {/* ── Info + PRISMA ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Info */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Información General</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-xs text-gray-500">Nombre</p><p className="font-medium text-gray-900">{dataset.name}</p></div>
              <div><p className="text-xs text-gray-500">Origen</p><p className="font-medium text-gray-900">{dataset.source === 'drive' ? 'Google Drive' : 'Local'}</p></div>
              <div><p className="text-xs text-gray-500">Archivos</p><p className="font-medium text-gray-900">{totalFiles}</p></div>
              <div><p className="text-xs text-gray-500">Tamaño</p><p className="font-medium text-gray-900">{formatBytes(dataset.total_size_bytes)}</p></div>
              {dataset.database_sources && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Bases de datos</p>
                  <p className="font-medium text-gray-900">{dataset.database_sources}</p>
                </div>
              )}
              {dataset.description && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Descripción</p>
                  <p className="text-gray-700">{dataset.description}</p>
                </div>
              )}
              <div><p className="text-xs text-gray-500">Creado por</p><p className="text-gray-700">{dataset.created_by_email}</p></div>
              <div><p className="text-xs text-gray-500">Fecha</p><p className="text-gray-700">{formatDate(dataset.created_at)}</p></div>
            </div>
          </div>

          {/* PRISMA Stats */}
          <div className="bg-white p-5 rounded-2xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Protocolo PRISMA</h2>
            <div className="space-y-3">
              {[
                { label: 'Total identificados', value: prisma.total, color: 'text-gray-900', bg: 'bg-gray-50' },
                { label: 'Incluidos', value: prisma.included, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                { label: 'Excluidos', value: prisma.excluded, color: 'text-red-700', bg: 'bg-red-50' },
                { label: 'Pendientes', value: prisma.pending, color: 'text-yellow-700', bg: 'bg-yellow-50' },
              ].map(row => (
                <div key={row.label} className={`flex items-center justify-between px-3 py-2 rounded-lg ${row.bg}`}>
                  <span className="text-xs text-gray-600">{row.label}</span>
                  <span className={`text-lg font-bold ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>
            {dataset.search_strategy && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Estrategia de búsqueda</p>
                <p className="text-xs text-gray-700 line-clamp-3">{dataset.search_strategy}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Distribuciones ───────────────────────────────────────────────── */}
        {directoryStats && directoryStats.pie_chart_data.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Por Directorio</h2>
              <div className="space-y-3">
                {directoryStats.pie_chart_data.map((item, i) => {
                  const colors = ['bg-emerald-500','bg-blue-500','bg-purple-500','bg-yellow-500','bg-red-500','bg-indigo-500','bg-pink-500','bg-teal-500'];
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${colors[i % colors.length]}`} />
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700 truncate">{item.name}</span>
                          <span className="text-gray-500 ml-2 flex-shrink-0">{item.value} ({item.percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className={`${colors[i % colors.length]} h-1.5 rounded-full`} style={{ width: `${item.percentage}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Por Extensión</h2>
              <div className="space-y-2">
                {Object.entries(extensionStats).sort((a,b) => b[1]-a[1]).map(([ext, count]) => {
                  const pct = totalFiles > 0 ? (count / totalFiles) * 100 : 0;
                  const extColors: Record<string,string> = { pdf:'bg-red-500', txt:'bg-gray-500', doc:'bg-blue-500', docx:'bg-blue-600' };
                  const c = extColors[ext] || 'bg-emerald-500';
                  return (
                    <div key={ext}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700 uppercase">.{ext}</span>
                        <span className="text-gray-500">{count} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className={`${c} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── Archivos / PRISMA Tabs ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {/* Tab bar */}
          <div className="flex items-center border-b border-gray-100 px-5">
            {([
              { key: 'files', label: `Archivos (${totalFiles})` },
              { key: 'prisma', label: `Resumen PRISMA` },
            ] as { key: ActiveTab; label: string }[]).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Archivos ─────────────────────────────────────────────── */}
          {activeTab === 'files' && (
            <div className="p-5">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                {/* Search */}
                <div className="relative flex-1 min-w-48">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input type="text" placeholder="Buscar por nombre, título o autor..."
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
                </div>
                {/* Inclusion filter */}
                <div className="flex gap-1">
                  {([
                    { value: 'all', label: 'Todos' },
                    { value: 'included', label: '✓ Incluidos' },
                    { value: 'excluded', label: '✗ Excluidos' },
                    { value: 'pending', label: '⏳ Pendientes' },
                  ] as { value: InclusionStatus | 'all'; label: string }[]).map(f => (
                    <button key={f.value} onClick={() => setInclusionFilter(f.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        inclusionFilter === f.value
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-gray-400">{filteredFiles.length} de {totalFiles}</span>
              </div>

              {/* Table */}
              <div style={{ maxHeight: '520px', overflowY: 'auto' }} className="border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b border-gray-200">
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Archivo / Título</th>
                      <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Autores</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase">Año</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase">Fuente</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase">PRISMA</th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase">Editar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredFiles.length > 0 ? filteredFiles.map((file, idx) => (
                      <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-2.5 max-w-xs">
                          <p className="font-medium text-gray-900 truncate">
                            {file.bib_title || file.original_filename}
                          </p>
                          {file.bib_title && (
                            <p className="text-xs text-gray-400 truncate mt-0.5">📄 {file.original_filename}</p>
                          )}
                          {file.directory_path && (
                            <p className="text-xs text-gray-400 mt-0.5">📁 {file.directory_path}</p>
                          )}
                        </td>
                        <td className="px-3 py-2.5 max-w-[160px]">
                          <p className="text-xs text-gray-600 truncate">{file.bib_authors || '—'}</p>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="text-xs font-medium text-gray-700">{file.bib_year || '—'}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {file.bib_source_db ? (
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_DB_COLORS[file.bib_source_db] || 'bg-gray-100 text-gray-600'}`}>
                              {file.bib_source_db_display || file.bib_source_db}
                            </span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${INCLUSION_COLORS[file.inclusion_status]}`}>
                            {INCLUSION_ICONS[file.inclusion_status]} {file.inclusion_status_display || file.inclusion_status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button onClick={() => setEditingFile(file)}
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Editar metadatos">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                          No hay archivos que coincidan con los filtros aplicados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Tab: PRISMA ───────────────────────────────────────────────── */}
          {activeTab === 'prisma' && (() => {
            // ── Compute derived values from files ──────────────────────────
            const detectedDbs = Array.from(
              new Set(dataset.files.map(f => f.bib_source_db).filter(Boolean))
            ) as string[];
            const dbLabels = detectedDbs.map(db => SOURCE_DB_LABELS[db as keyof typeof SOURCE_DB_LABELS] ?? db);

            const years = dataset.files.map(f => f.bib_year).filter(Boolean) as number[];
            const minYear = years.length ? Math.min(...years) : null;
            const maxYear = years.length ? Math.max(...years) : null;
            const pdfCount = dataset.files.filter(f =>
              f.mime_type === 'application/pdf' || f.original_filename?.endsWith('.pdf')
            ).length;

            const autoSearchStrategy = detectedDbs.length > 0
              ? `Se realizó una búsqueda bibliográfica en ${dbLabels.join(', ')}. Se identificaron ${dataset.total_files} documentos en total${pdfCount ? ` (${pdfCount} en formato PDF)` : ''}.${minYear && maxYear ? ` Los artículos recuperados abarcan el período ${minYear}–${maxYear}.` : ''}`
              : null;

            const autoDatabases = dbLabels.length > 0 ? dbLabels.join(', ') : null;

            const fields = [
              {
                label: 'Estrategia de búsqueda',
                value: dataset.search_strategy,
                auto: autoSearchStrategy,
                hint: 'Define la ecuación de búsqueda, bases de datos consultadas y fechas de la búsqueda.',
              },
              {
                label: 'Bases de datos consultadas',
                value: dataset.database_sources,
                auto: autoDatabases,
                hint: 'Sube archivos PDF organizados en carpetas por base de datos y usa "Detectar fuente" para poblar este campo.',
              },
              {
                label: 'Criterios de inclusión',
                value: dataset.inclusion_criteria,
                auto: null,
                hint: 'Ej: Artículos en inglés o español, publicados entre 2018-2024, sobre transformación digital en educación superior, con acceso al texto completo.',
              },
              {
                label: 'Criterios de exclusión',
                value: dataset.exclusion_criteria,
                auto: null,
                hint: 'Ej: Artículos duplicados, literatura gris, actas de conferencia sin revisión por pares, estudios no relacionados con el contexto universitario.',
              },
            ];

            return (
            <div className="p-5 space-y-5">
              {/* Criteria */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map(item => (
                  <div key={item.label} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{item.label}</p>
                      {!item.value && (item.auto || item.hint) && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                          {item.auto ? 'auto' : 'sugerencia'}
                        </span>
                      )}
                    </div>
                    {item.value ? (
                      <p className="text-sm text-gray-700 whitespace-pre-line">{item.value}</p>
                    ) : item.auto ? (
                      <p className="text-sm text-gray-700">{item.auto}</p>
                    ) : (
                      <p className="text-xs text-gray-400 italic leading-relaxed">{item.hint}</p>
                    )}
                  </div>
                ))}
              </div>
              {/* Edit prompt */}
              {fields.some(f => !f.value) && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Los campos marcados como <strong className="mx-1">sugerencia</strong> son plantillas de referencia — define los criterios reales en
                  <button
                    onClick={() => navigate(`/admin/configuracion/datasets/${id}/editar`)}
                    className="ml-1 underline font-medium hover:text-blue-900"
                  >
                    Editar dataset
                  </button>.
                </div>
              )}

              {/* Exclusion reasons */}
              {dataset.files.some(f => f.inclusion_status === 'excluded' && f.exclusion_reason) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-3">Motivos de exclusión registrados</h3>
                  <div className="space-y-2">
                    {dataset.files
                      .filter(f => f.inclusion_status === 'excluded' && f.exclusion_reason)
                      .map(f => (
                        <div key={f.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                          <span className="text-red-500 text-xs font-semibold flex-shrink-0 mt-0.5">✗</span>
                          <div>
                            <p className="text-xs font-medium text-gray-800 truncate">{f.bib_title || f.original_filename}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{f.exclusion_reason}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* By year */}
              {(() => {
                const byYear: Record<number, { included: number; excluded: number; pending: number }> = {};
                dataset.files.forEach(f => {
                  if (!f.bib_year) return;
                  if (!byYear[f.bib_year]) byYear[f.bib_year] = { included: 0, excluded: 0, pending: 0 };
                  byYear[f.bib_year][f.inclusion_status]++;
                });
                const years = Object.keys(byYear).sort();
                if (years.length === 0) return null;
                return (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Distribución por año de publicación</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-3 py-2 text-left text-gray-600">Año</th>
                            <th className="px-3 py-2 text-center text-emerald-600">Incluidos</th>
                            <th className="px-3 py-2 text-center text-red-600">Excluidos</th>
                            <th className="px-3 py-2 text-center text-yellow-600">Pendientes</th>
                            <th className="px-3 py-2 text-center text-gray-600">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {years.map(year => {
                            const row = byYear[parseInt(year)];
                            const total = row.included + row.excluded + row.pending;
                            return (
                              <tr key={year} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium text-gray-800">{year}</td>
                                <td className="px-3 py-2 text-center text-emerald-700">{row.included || '—'}</td>
                                <td className="px-3 py-2 text-center text-red-700">{row.excluded || '—'}</td>
                                <td className="px-3 py-2 text-center text-yellow-700">{row.pending || '—'}</td>
                                <td className="px-3 py-2 text-center font-semibold text-gray-800">{total}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
