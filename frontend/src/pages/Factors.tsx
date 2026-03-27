/**
 * Factors Page
 *
 * Digital Transformation Factor Analysis.
 * Shows consolidated ranking, category breakdown, and co-occurrence data.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2,
  RefreshCw,
  Play,
  Layers,
  TrendingUp,
  Users,
  Database,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  Info,
} from 'lucide-react';
import analysisService from '../services/analysisService';
import type { FactorAnalysisResponse, CooccurrenceGraphResponse } from '../services/analysisService';
import { FactorCooccurrenceGraph } from '../components/organisms/FactorCooccurrenceGraph';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

// ── Helpers ────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
  tecnologico:    { label: 'Tecnológico',    color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  organizacional: { label: 'Organizacional', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
  humano:         { label: 'Humano',         color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200' },
  estrategico:    { label: 'Estratégico',    color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
  financiero:     { label: 'Financiero',     color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
  pedagogico:     { label: 'Pedagógico',     color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-200' },
  infraestructura:{ label: 'Infraestructura',color: 'text-slate-700',  bg: 'bg-slate-50 border-slate-200' },
  seguridad:      { label: 'Seguridad',      color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
};

const BAR_COLORS: Record<string, string> = {
  tecnologico:    'bg-blue-500',
  organizacional: 'bg-violet-500',
  humano:         'bg-emerald-500',
  estrategico:    'bg-amber-500',
  financiero:     'bg-green-500',
  pedagogico:     'bg-rose-500',
  infraestructura:'bg-slate-500',
  seguridad:      'bg-red-500',
};

function categoryMeta(cat: string) {
  return CATEGORY_META[cat] ?? { label: cat, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' };
}

function barColor(cat: string) {
  return BAR_COLORS[cat] ?? 'bg-slate-400';
}

function pct(value: number, max: number): number {
  if (!max) return 0;
  return Math.round((value / max) * 100);
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, sub, accent = 'border-blue-500' }) => (
  <div className={`bg-white rounded-xl border-l-4 ${accent} shadow-sm p-4 sm:p-5`}>
    <div className="flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl sm:text-3xl font-bold text-slate-800 mt-1 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className="text-slate-300 mt-1 shrink-0 ml-2">{icon}</div>
    </div>
  </div>
);

interface InfoBoxProps {
  children: React.ReactNode;
  className?: string;
}

const InfoBox: React.FC<InfoBoxProps> = ({ children, className = '' }) => (
  <div className={`flex gap-2.5 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 ${className}`}>
    <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
    <span className="leading-relaxed">{children}</span>
  </div>
);

interface HBarProps {
  label: string;
  value: number;
  maxValue: number;
  category: string;
  rank?: number;
}

const HBar: React.FC<HBarProps> = ({ label, value, maxValue, category, rank }) => {
  const width = pct(value, maxValue);
  const meta = categoryMeta(category);
  return (
    <div className="flex items-center gap-2 py-1.5 min-w-0">
      {rank !== undefined && (
        <span className="w-5 text-xs text-slate-400 text-right shrink-0">{rank}</span>
      )}
      <span className="w-28 sm:w-44 text-xs sm:text-sm text-slate-700 truncate shrink-0" title={label}>{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-4 sm:h-5 overflow-hidden min-w-0">
        <div
          className={`${barColor(category)} h-full rounded-full transition-all duration-500`}
          style={{ width: `${Math.max(width, 2)}%` }}
        />
      </div>
      <span className="w-10 sm:w-12 text-xs text-slate-500 text-right shrink-0 font-mono">
        {value > 0 ? value.toFixed(2) : '—'}
      </span>
      <span className={`hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color} shrink-0`}>
        {meta.label}
      </span>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────

export const Factors: React.FC = () => {
  const { showError, showSuccess } = useToast();

  const [stats, setStats] = useState<any | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FactorAnalysisResponse | null>(null);
  const [graphData, setGraphData] = useState<CooccurrenceGraphResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [noFactorsInDb, setNoFactorsInDb] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const hasResults = stats?.factors?.some((f: any) => f.relevance_score > 0) ?? false;
  const displayData = analysisResult ?? null;

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    try {
      const data = await analysisService.getFactorStatistics();
      if (data.success) {
        setStats(data);
        setNoFactorsInDb(false);
      }
    } catch (err: any) {
      const msg: string = err.response?.data?.error ?? err.message ?? '';
      if (msg.toLowerCase().includes('no factors found') || msg.toLowerCase().includes('seed factors')) {
        setNoFactorsInDb(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadGraph = useCallback(async () => {
    try {
      const data = await analysisService.getCooccurrenceGraph();
      setGraphData(data);
    } catch {
      // El grafo es opcional; si falla no bloquea la página
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadGraph();
  }, [loadStats, loadGraph]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const seedFactors = async () => {
    setIsSeeding(true);
    try {
      await analysisService.seedFactors();
      showSuccess('Catálogo de factores inicializado correctamente');
      await loadStats();
    } catch {
      showError('No se pudo inicializar el catálogo de factores. Contacte al administrador del sistema.');
    } finally {
      setIsSeeding(false);
    }
  };

  const runAnalysis = async () => {
    setIsRunning(true);
    try {
      const result = await analysisService.analyzeFactors({
        normalize_by_length: true,
        use_cache: false,
      });
      if (result.success) {
        setAnalysisResult(result);
        await loadStats();
        showSuccess('Análisis de factores completado');
      } else {
        const rawError: string = (result as any).error ?? '';
        if (rawError.toLowerCase().includes('no factors found') || rawError.toLowerCase().includes('seed factors')) {
          setNoFactorsInDb(true);
          showError('El catálogo de factores no está inicializado. Usa el botón "Inicializar catálogo" para cargarlo.');
        } else {
          showError(rawError || 'Error en el análisis');
        }
      }
    } catch (err: any) {
      const rawError: string = err.response?.data?.error ?? err.message ?? '';
      if (rawError.toLowerCase().includes('no factors found') || rawError.toLowerCase().includes('seed factors')) {
        setNoFactorsInDb(true);
        showError('El catálogo de factores no está inicializado.');
      } else if (rawError.toLowerCase().includes('no preprocessed documents')) {
        showError('No hay documentos preprocesados. Ejecuta una Preparación de Datos antes de correr el análisis de factores.');
      } else {
        showError('Error al ejecutar el análisis: ' + rawError);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const refreshAnalysis = async () => {
    setIsRunning(true);
    try {
      const result = await analysisService.analyzeFactors({
        normalize_by_length: true,
        use_cache: false,
      });
      if (result.success) {
        setAnalysisResult(result);
        await loadStats();
        showSuccess('Análisis actualizado');
      }
    } catch (err: any) {
      showError('Error: ' + (err.response?.data?.error ?? err.message));
    } finally {
      setIsRunning(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await analysisService.exportFactorsCSV();
      showSuccess('CSV exportado correctamente');
    } catch {
      showError('No se pudo exportar el CSV. Verifica que el análisis esté completado.');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4F7FE' }}>
        <Spinner />
      </div>
    );
  }

  // ── Sticky header (reutilizado) ───────────────────────────────────────────

  const StickyHeader = ({ showActions = false }: { showActions?: boolean }) => (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
      <div className="flex items-center justify-between px-4 sm:px-8 py-4">
        <div className="flex items-center gap-3 min-w-0">
          <BarChart2 className="w-5 h-5 text-gray-700 shrink-0" />
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Análisis de Factores</h1>
        </div>
        {showActions && (
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-4">
            <button
              onClick={handleExportCsv}
              disabled={isExporting}
              className="p-2 sm:p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar CSV"
              aria-label="Exportar factores como CSV"
            >
              {isExporting ? <Spinner /> : <Download className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />}
            </button>
            <button
              onClick={refreshAnalysis}
              disabled={isRunning}
              className="p-2 sm:p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Re-ejecutar análisis"
              aria-label="Re-ejecutar análisis de factores"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
            </button>
            <button
              onClick={runAnalysis}
              disabled={isRunning}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-full transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium"
            >
              {isRunning ? <Spinner /> : <Play className="w-4 h-4" />}
              <span className="hidden sm:inline">{isRunning ? 'Analizando...' : 'Ejecutar'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ── No factors in DB state ────────────────────────────────────────────────

  if (noFactorsInDb) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>
        <StickyHeader />
        <div className="p-4 sm:p-8">
          <div className="bg-white p-8 sm:p-10 text-center" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Catálogo de factores no inicializado
            </h3>
            <p className="text-sm text-gray-600 mb-2 max-w-md mx-auto">
              El sistema no encontró factores de transformación digital en la base de datos.
              Es necesario cargar el catálogo antes de ejecutar el análisis.
            </p>
            <p className="text-xs text-gray-400 mb-8 max-w-md mx-auto">
              Este proceso carga los 16 factores en 8 categorías: tecnológico, organizacional,
              humano, estratégico, financiero, pedagógico, infraestructura y seguridad.
            </p>
            <button
              onClick={seedFactors}
              disabled={isSeeding}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSeeding ? <><Spinner />Inicializando...</> : <><Download className="w-4 h-4" />Inicializar catálogo de factores</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!hasResults && !analysisResult) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>
        <StickyHeader />
        <div className="p-4 sm:p-8 space-y-4">

          {/* Explanation */}
          <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h3 className="text-base font-semibold text-slate-800 mb-2">¿Qué hace este análisis?</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              Examina los documentos preprocesados del corpus y cuenta cuántas veces aparece cada uno de
              los <strong>16 factores de transformación digital</strong> definidos en la literatura académica.
              El resultado te indica qué factores son más mencionados y cuáles están más extendidos entre los documentos.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-500">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="font-semibold text-slate-700 mb-1">Frecuencia</p>
                <p>Total de veces que aparece el factor en todo el corpus (suma de todos los documentos).</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="font-semibold text-slate-700 mb-1">Cobertura</p>
                <p>Porcentaje de documentos donde aparece el factor al menos una vez.</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="font-semibold text-slate-700 mb-1">Relevancia</p>
                <p>Frecuencia × cobertura. Penaliza factores que solo aparecen en pocos documentos.</p>
              </div>
            </div>
          </div>

          {/* Factors preview */}
          <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Factores disponibles en base de datos ({stats?.total_factors ?? 0})
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {stats?.factors?.map((f: any) => {
                const meta = categoryMeta(f.category);
                return (
                  <span key={f.factor_id} className={`text-xs px-2 py-1 rounded-full border ${meta.bg} ${meta.color}`}>
                    {f.factor_name}
                  </span>
                );
              })}
            </div>
            <button
              onClick={runAnalysis}
              disabled={isRunning}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors font-medium shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? <><Spinner />Analizando corpus...</> : <><Play className="w-4 h-4" />Ejecutar análisis de factores</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Build display data ─────────────────────────────────────────────────────

  const factors: any[] = displayData?.global_statistics ?? stats?.factors ?? [];
  const categoryStats = displayData?.category_statistics ?? {};
  const consolidated = displayData?.consolidated_ranking ?? [];
  const coOccurrence = displayData?.co_occurrence ?? [];
  const docCount = displayData?.document_count ?? 0;
  const factorCount = displayData?.factor_count ?? stats?.total_factors ?? 16;

  const maxRelevance = Math.max(...factors.map((f: any) => f.relevance_score ?? 0), 0.001);
  const maxConsolidated = Math.max(...consolidated.map((c: any) => c.consolidated_score ?? 0), 0.001);

  const byCategory = stats?.by_category ?? {};

  const topFactor = factors.reduce((best: any, f: any) =>
    (f.relevance_score ?? 0) > (best?.relevance_score ?? 0) ? f : best, null
  );

  const categoryCount = Object.keys(byCategory).length || 8;

  // ── Results view ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>

      <StickyHeader showActions />

      <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">

        {/* ── Qué muestra esta página ── */}
        <InfoBox>
          Análisis confirmatorio: se contó cuántas veces aparecen los 16 factores predefinidos en los{' '}
          <strong>{docCount || '—'} documentos</strong> del corpus. Los factores provienen de la revisión de
          literatura sobre transformación digital en instituciones de educación superior.
        </InfoBox>

        {/* ── Metric cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            icon={<Database className="w-7 h-7 sm:w-8 sm:h-8" />}
            label="Documentos analizados"
            value={docCount || '—'}
            accent="border-blue-500"
          />
          <MetricCard
            icon={<Layers className="w-7 h-7 sm:w-8 sm:h-8" />}
            label="Factores detectados"
            value={factorCount}
            sub="16 factores, 8 categorías"
            accent="border-violet-500"
          />
          <MetricCard
            icon={<Users className="w-7 h-7 sm:w-8 sm:h-8" />}
            label="Categorías cubiertas"
            value={categoryCount}
            accent="border-emerald-500"
          />
          <MetricCard
            icon={<TrendingUp className="w-7 h-7 sm:w-8 sm:h-8" />}
            label="Factor dominante"
            value={topFactor ? topFactor.factor_name.split(' ')[0] : '—'}
            sub={topFactor ? categoryMeta(topFactor.category).label : undefined}
            accent="border-amber-500"
          />
        </div>

        {/* ── Consolidated ranking ── */}
        {consolidated.length > 0 && (
          <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-blue-500 shrink-0" />
                Ranking consolidado de factores
              </h2>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Score 0–1 normalizado respecto al factor más dominante.
              Pondera: <strong>50%</strong> frecuencia global · <strong>30%</strong> cobertura de documentos · <strong>20%</strong> relevancia.
            </p>
            <div className="space-y-1">
              {consolidated.map((item: any) => {
                const factor = factors.find((f: any) => f.factor_id === item.factor_id);
                return (
                  <HBar
                    key={item.factor_id}
                    label={item.factor_name}
                    value={item.consolidated_score ?? 0}
                    maxValue={maxConsolidated}
                    category={factor?.category ?? 'tecnologico'}
                    rank={item.rank}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ── Relevance ranking (fallback when no consolidated) ── */}
        {consolidated.length === 0 && factors.length > 0 && (
          <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-500" />
              Factores por relevancia
            </h2>
            <div className="space-y-1">
              {[...factors]
                .sort((a: any, b: any) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0))
                .map((f: any, i: number) => (
                  <HBar
                    key={f.factor_id}
                    label={f.factor_name}
                    value={f.relevance_score ?? 0}
                    maxValue={maxRelevance}
                    category={f.category}
                    rank={i + 1}
                  />
                ))}
            </div>
          </div>
        )}

        {/* ── Category breakdown ── */}
        <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h2 className="text-base font-semibold text-slate-800 mb-1">Desglose por categoría</h2>
          <p className="text-xs text-slate-400 mb-4">
            Cada categoría agrupa 2 factores. Las menciones son la suma de todas las ocurrencias
            de ambos factores en el corpus. Haz clic en una categoría para ver sus factores individuales.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(byCategory).map(([cat, catFactors]) => {
              const meta = categoryMeta(cat);
              const fList = catFactors as any[];
              const isExpanded = expandedCategories[cat];
              const catStat = categoryStats[cat];
              return (
                <div key={cat} className={`rounded-xl border p-4 ${meta.bg}`}>
                  <button
                    className="w-full flex items-center justify-between"
                    onClick={() => toggleCategory(cat)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-sm font-semibold ${meta.color} shrink-0`}>{meta.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-white border ${meta.color} font-medium shrink-0`}>
                        {fList.length} factores
                      </span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                      {catStat && (
                        <span className="text-xs text-slate-500 font-mono">
                          {(catStat.total_frequency ?? 0).toLocaleString()} menciones
                        </span>
                      )}
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-slate-400" />
                        : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-2 border-t border-white/60 pt-3">
                      {fList.map((f: any) => {
                        const fullFactor = factors.find((ff: any) => ff.factor_id === f.factor_id);
                        const rel = fullFactor?.relevance_score ?? f.relevance_score ?? 0;
                        const freq = fullFactor?.global_frequency ?? f.global_frequency ?? 0;
                        return (
                          <div key={f.factor_id} className="flex items-center justify-between gap-2">
                            <span className="text-sm text-slate-700 min-w-0 truncate" title={f.factor_name}>{f.factor_name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-16 sm:w-20 bg-white/70 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`${barColor(cat)} h-full rounded-full`}
                                  style={{ width: `${pct(rel, maxRelevance)}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-500 w-16 sm:w-20 text-right font-mono">
                                {freq > 0 ? freq.toLocaleString() + ' v.' : '—'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {catStat && (
                        <p className="text-xs text-slate-400 pt-1">
                          Relevancia promedio: {(catStat.avg_relevance ?? 0).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Co-occurrence Graph ── */}
        <FactorCooccurrenceGraph
          nodes={graphData?.nodes ?? []}
          edges={graphData?.edges ?? []}
        />

        {/* ── Co-occurrence Table ── */}
        {coOccurrence.length > 0 && (
          <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h2 className="text-base font-semibold text-slate-800 mb-1">
              Co-ocurrencia de factores
              <span className="ml-2 text-xs font-normal text-slate-400">(top 20 pares)</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Número de documentos donde ambos factores aparecen simultáneamente.
              La tasa indica en qué porcentaje del total de documentos ({docCount}) coinciden.
              Un valor alto sugiere que esos factores están temáticamente relacionados en el corpus.
            </p>
            <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4">Factor A</th>
                    <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4">Factor B</th>
                    <th className="text-right text-xs font-medium text-slate-500 py-2 pr-4">Docs en común</th>
                    <th className="text-right text-xs font-medium text-slate-500 py-2">Tasa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {coOccurrence.map((pair: any, i: number) => {
                    const tasa = docCount > 0
                      ? ((pair.co_occurrence_count / docCount) * 100).toFixed(1) + '%'
                      : '—';
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 pr-4 text-slate-700 text-xs sm:text-sm">
                          <span className={`inline-block text-xs px-1.5 py-0.5 rounded border mr-1 ${categoryMeta(pair.factor1_category).bg} ${categoryMeta(pair.factor1_category).color}`}>
                            {categoryMeta(pair.factor1_category).label}
                          </span>
                          {pair.factor1_name}
                        </td>
                        <td className="py-2 pr-4 text-slate-700 text-xs sm:text-sm">
                          <span className={`inline-block text-xs px-1.5 py-0.5 rounded border mr-1 ${categoryMeta(pair.factor2_category).bg} ${categoryMeta(pair.factor2_category).color}`}>
                            {categoryMeta(pair.factor2_category).label}
                          </span>
                          {pair.factor2_name}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono text-slate-600 text-sm">{pair.co_occurrence_count}</td>
                        <td className="py-2 text-right font-mono text-slate-600 text-sm font-semibold">{tasa}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── All factors table ── */}
        <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h2 className="text-base font-semibold text-slate-800 mb-1">Tabla completa de factores</h2>
          <p className="text-xs text-slate-400 mb-4">
            <strong>Frecuencia:</strong> total de menciones en todo el corpus ·{' '}
            <strong>Cobertura:</strong> % de documentos donde aparece ·{' '}
            <strong>Relevancia:</strong> frecuencia × cobertura (penaliza factores presentes en pocos documentos)
          </p>
          <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
            <table className="w-full text-sm min-w-[540px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 py-2 pr-3">#</th>
                  <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4">Factor</th>
                  <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4">Categoría</th>
                  <th className="text-right text-xs font-medium text-slate-500 py-2 pr-4">Frecuencia</th>
                  <th className="text-right text-xs font-medium text-slate-500 py-2 pr-4">Cobertura</th>
                  <th className="text-right text-xs font-medium text-slate-500 py-2">Relevancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[...factors]
                  .sort((a: any, b: any) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0))
                  .map((f: any, i: number) => {
                    const meta = categoryMeta(f.category);
                    const hasData = (f.relevance_score ?? 0) > 0;
                    return (
                      <tr key={f.factor_id} className="hover:bg-slate-50">
                        <td className="py-2 pr-3 text-slate-400 text-xs">{i + 1}</td>
                        <td className="py-2 pr-4 font-medium text-slate-800 text-sm">{f.factor_name}</td>
                        <td className="py-2 pr-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-right font-mono text-slate-600 text-sm">
                          {hasData ? (f.global_frequency ?? 0).toLocaleString() : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono text-slate-600 text-sm">
                          {hasData && f.document_coverage != null
                            ? `${(f.document_coverage * 100).toFixed(1)}%`
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-2 text-right font-mono text-slate-600 text-sm">
                          {hasData
                            ? <span className="font-semibold">{(f.relevance_score ?? 0).toLocaleString()}</span>
                            : <span className="text-slate-300">sin datos</span>}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {!hasResults && (
            <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg px-4 py-3">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Los factores existen en la base de datos pero aún no se ha ejecutado el análisis sobre el corpus.
              Usa el botón "Ejecutar" para calcular las métricas de relevancia.
            </div>
          )}

          {hasResults && (
            <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-4 py-3">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Análisis completado. Los scores reflejan la frecuencia y relevancia en el corpus preprocesado.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
