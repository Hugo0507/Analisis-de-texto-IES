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
} from 'lucide-react';
import analysisService from '../services/analysisService';
import type { FactorAnalysisResponse } from '../services/analysisService';
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
  <div className={`bg-white rounded-xl border-l-4 ${accent} shadow-sm p-5`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      <div className="text-slate-300 mt-1">{icon}</div>
    </div>
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
    <div className="flex items-center gap-3 py-1.5">
      {rank !== undefined && (
        <span className="w-5 text-xs text-slate-400 text-right shrink-0">{rank}</span>
      )}
      <span className="w-44 text-sm text-slate-700 truncate shrink-0" title={label}>{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
        <div
          className={`${barColor(category)} h-full rounded-full transition-all duration-500`}
          style={{ width: `${Math.max(width, 2)}%` }}
        />
      </div>
      <span className="w-12 text-xs text-slate-500 text-right shrink-0">
        {value > 0 ? value.toFixed(3) : '—'}
      </span>
      <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color} shrink-0`}>
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
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Determine if analysis has been run by checking if any factor has relevance_score > 0
  const hasResults = stats?.factors?.some((f: any) => f.relevance_score > 0) ?? false;
  const displayData = analysisResult ?? null;

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    try {
      const data = await analysisService.getFactorStatistics();
      if (data.success) setStats(data);
    } catch {
      // No analysis yet — not an error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ── Run analysis ──────────────────────────────────────────────────────────

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
        showError((result as any).error ?? 'Error en el análisis');
      }
    } catch (err: any) {
      showError('Error al ejecutar el análisis: ' + (err.response?.data?.error ?? err.message));
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

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!hasResults && !analysisResult) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <BarChart2 className="w-10 h-10 text-blue-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-3">Análisis de Factores de TD</h1>
        <p className="text-slate-500 mb-2">
          Identifica y cuantifica los 16 factores de transformación digital en el corpus.
        </p>
        <p className="text-slate-400 text-sm mb-8">
          El análisis requiere que existan documentos preprocesados con texto en inglés.
          Asegúrate de haber ejecutado la preparación de datos antes de continuar.
        </p>

        {stats && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-8 text-left">
            <p className="text-sm font-medium text-slate-600 mb-2">Factores disponibles en base de datos</p>
            <div className="flex flex-wrap gap-2">
              {stats.factors?.map((f: any) => {
                const meta = categoryMeta(f.category);
                return (
                  <span key={f.factor_id} className={`text-xs px-2 py-1 rounded-full border ${meta.bg} ${meta.color}`}>
                    {f.factor_name}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={runAnalysis}
          disabled={isRunning}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isRunning ? (
            <>
              <Spinner />
              Analizando corpus...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Ejecutar análisis de factores
            </>
          )}
        </button>
      </div>
    );
  }

  // ── Build display data from analysisResult OR stats ───────────────────────

  const factors: any[] = displayData?.global_statistics ?? stats?.factors ?? [];
  const categoryStats = displayData?.category_statistics ?? {};
  const consolidated = displayData?.consolidated_ranking ?? [];
  const coOccurrence = displayData?.co_occurrence ?? [];
  const docCount = displayData?.document_count ?? '—';
  const factorCount = displayData?.factor_count ?? stats?.total_factors ?? 16;

  const maxRelevance = Math.max(...factors.map((f: any) => f.relevance_score ?? 0), 0.001);
  const maxConsolidated = Math.max(...consolidated.map((c: any) => c.consolidated_score ?? 0), 0.001);

  // Group factors by category
  const byCategory = stats?.by_category ?? {};

  const topFactor = factors.reduce((best: any, f: any) =>
    (f.relevance_score ?? 0) > (best?.relevance_score ?? 0) ? f : best, null
  );

  const categoryCount = Object.keys(byCategory).length || 8;

  // ── Results view ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 px-1">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Factores de Transformación Digital</h1>
          <p className="text-slate-500 text-sm mt-1">
            Análisis de los 16 factores en 8 categorías sobre el corpus en inglés
          </p>
        </div>
        <button
          onClick={refreshAnalysis}
          disabled={isRunning}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isRunning ? <Spinner /> : <RefreshCw className="w-4 h-4" />}
          {isRunning ? 'Analizando...' : 'Re-ejecutar'}
        </button>
      </div>

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Database className="w-8 h-8" />}
          label="Documentos analizados"
          value={docCount}
          accent="border-blue-500"
        />
        <MetricCard
          icon={<Layers className="w-8 h-8" />}
          label="Factores identificados"
          value={factorCount}
          sub="16 factores, 8 categorías"
          accent="border-violet-500"
        />
        <MetricCard
          icon={<Users className="w-8 h-8" />}
          label="Categorías cubiertas"
          value={categoryCount}
          accent="border-emerald-500"
        />
        <MetricCard
          icon={<TrendingUp className="w-8 h-8" />}
          label="Factor dominante"
          value={topFactor ? topFactor.factor_name.split(' ')[0] : '—'}
          sub={topFactor ? categoryMeta(topFactor.category).label : undefined}
          accent="border-amber-500"
        />
      </div>

      {/* ── Consolidated ranking ── */}
      {consolidated.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-500" />
            Ranking consolidado de factores
          </h2>
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
          <p className="text-xs text-slate-400 mt-3">
            Score consolidado = 50% frecuencia global + 30% cobertura + 20% relevancia
          </p>
        </div>
      )}

      {/* ── Relevance ranking (when no consolidated data) ── */}
      {consolidated.length === 0 && factors.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
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
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Desglose por categoría</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-white border ${meta.color} font-medium`}>
                      {fList.length} factores
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {catStat && (
                      <span className="text-xs text-slate-500">
                        {catStat.total_mentions ?? 0} menciones
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-3 space-y-2 border-t border-white/60 pt-3">
                    {fList.map((f: any) => (
                      <div key={f.factor_id} className="flex items-center justify-between">
                        <span className="text-sm text-slate-700">{f.factor_name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-white/70 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`${barColor(cat)} h-full rounded-full`}
                              style={{ width: `${pct(f.relevance_score ?? 0, maxRelevance)}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 w-10 text-right">
                            {f.relevance_score > 0 ? f.relevance_score.toFixed(3) : '—'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Co-occurrence ── */}
      {coOccurrence.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">
            Co-ocurrencia de factores
            <span className="ml-2 text-xs font-normal text-slate-400">(top 20 pares)</span>
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4">Factor A</th>
                  <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4">Factor B</th>
                  <th className="text-right text-xs font-medium text-slate-500 py-2 pr-4">Co-ocurrencias</th>
                  <th className="text-right text-xs font-medium text-slate-500 py-2">Correlación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {coOccurrence.map((pair: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 pr-4 text-slate-700">{pair.factor1}</td>
                    <td className="py-2 pr-4 text-slate-700">{pair.factor2}</td>
                    <td className="py-2 pr-4 text-right font-mono text-slate-600">{pair.co_occurrence_count}</td>
                    <td className="py-2 text-right font-mono text-slate-600">
                      {pair.correlation?.toFixed(3) ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── All factors table ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Tabla completa de factores</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4">#</th>
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
                      <td className="py-2 pr-4 text-slate-400 text-xs">{i + 1}</td>
                      <td className="py-2 pr-4 font-medium text-slate-800">{f.factor_name}</td>
                      <td className="py-2 pr-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-slate-600">
                        {hasData ? (f.global_frequency ?? 0) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-slate-600">
                        {hasData && f.document_coverage != null
                          ? `${(f.document_coverage * 100).toFixed(1)}%`
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2 text-right font-mono text-slate-600">
                        {hasData
                          ? <span className="font-semibold">{(f.relevance_score ?? 0).toFixed(4)}</span>
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
            Usa el botón "Re-ejecutar" para calcular las métricas de relevancia.
          </div>
        )}

        {hasResults && (
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-4 py-3">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Análisis completado. Los scores reflejan la frecuencia y relevancia en el corpus en inglés.
          </div>
        )}
      </div>

    </div>
  );
};
