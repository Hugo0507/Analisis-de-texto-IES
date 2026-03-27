/**
 * FactorsView Page
 *
 * Vista de resultados de un análisis de factores específico.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, BarChart2, Layers, TrendingUp, Users, Database,
  CheckCircle2, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import analysisService from '../services/analysisService';
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
  tecnologico: 'bg-blue-500', organizacional: 'bg-violet-500', humano: 'bg-emerald-500',
  estrategico: 'bg-amber-500', financiero: 'bg-green-500', pedagogico: 'bg-rose-500',
  infraestructura: 'bg-slate-500', seguridad: 'bg-red-500',
};

function catMeta(cat: string) {
  return CATEGORY_META[cat] ?? { label: cat, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' };
}
function barColor(cat: string) { return BAR_COLORS[cat] ?? 'bg-slate-400'; }
function pct(v: number, max: number) { return max ? Math.round((v / max) * 100) : 0; }

// ── Sub-components ─────────────────────────────────────────────────────────

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string }> = (
  { icon, label, value, sub, accent = 'border-blue-500' }
) => (
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

const HBar: React.FC<{ label: string; value: number; maxValue: number; category: string; rank?: number }> = (
  { label, value, maxValue, category, rank }
) => {
  const width = pct(value, maxValue);
  const meta = catMeta(category);
  return (
    <div className="flex items-center gap-2 py-1.5 min-w-0">
      {rank !== undefined && <span className="w-5 text-xs text-slate-400 text-right shrink-0">{rank}</span>}
      <span className="w-28 sm:w-44 text-xs sm:text-sm text-slate-700 truncate shrink-0" title={label}>{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-4 sm:h-5 overflow-hidden min-w-0">
        <div className={`${barColor(category)} h-full rounded-full transition-all duration-500`} style={{ width: `${Math.max(width, 2)}%` }} />
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

export const FactorsView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError } = useToast();

  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const result = await analysisService.getFactorRun(Number(id));
      if (result.success) {
        setData(result);
      } else {
        showError(result.error ?? 'No se pudo cargar el análisis');
      }
    } catch (err: any) {
      showError('Error: ' + (err.response?.data?.error ?? err.message));
    } finally {
      setIsLoading(false);
    }
  }, [id, showError]);

  useEffect(() => { load(); }, [load]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4F7FE' }}>
        <Spinner />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4F7FE' }}>
        <p className="text-slate-500">Análisis no encontrado.</p>
      </div>
    );
  }

  const factors: any[] = data.global_statistics ?? [];
  const categoryStats = data.category_statistics ?? {};
  const consolidated = data.consolidated_ranking ?? [];
  const coOccurrence = data.co_occurrence ?? [];
  const docCount = data.document_count ?? 0;
  const factorCount = data.factor_count ?? factors.length;

  const maxRelevance = Math.max(...factors.map((f: any) => f.relevance_score ?? 0), 0.001);
  const maxConsolidated = Math.max(...consolidated.map((c: any) => c.consolidated_score ?? 0), 0.001);

  const topFactor = factors.reduce((best: any, f: any) =>
    (f.relevance_score ?? 0) > (best?.relevance_score ?? 0) ? f : best, null);

  // Group factors by category for the breakdown section
  const byCategory: Record<string, any[]> = {};
  factors.forEach((f: any) => {
    if (!byCategory[f.category]) byCategory[f.category] = [];
    byCategory[f.category].push(f);
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div className="flex items-center justify-between px-4 sm:px-8 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate('/admin/analisis/analisis-de-factores')} className="p-2 rounded-full hover:bg-gray-100">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{data.name}</h1>
              {data.data_preparation_name && (
                <p className="text-xs text-slate-400 truncate">Preprocesamiento: {data.data_preparation_name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />Completado
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">

        {/* Info */}
        <div className="flex gap-2.5 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
          <span className="leading-relaxed">
            Análisis confirmatorio: se contó cuántas veces aparecen los {factorCount} factores en los{' '}
            <strong>{docCount} documentos</strong> del corpus preprocesado.
          </span>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard icon={<Database className="w-7 h-7 sm:w-8 sm:h-8" />} label="Documentos" value={docCount} accent="border-blue-500" />
          <MetricCard icon={<Layers className="w-7 h-7 sm:w-8 sm:h-8" />} label="Factores" value={factorCount} sub={`${Object.keys(byCategory).length} categorías`} accent="border-violet-500" />
          <MetricCard icon={<Users className="w-7 h-7 sm:w-8 sm:h-8" />} label="Categorías" value={Object.keys(byCategory).length} accent="border-emerald-500" />
          <MetricCard
            icon={<TrendingUp className="w-7 h-7 sm:w-8 sm:h-8" />}
            label="Factor dominante"
            value={topFactor ? topFactor.factor_name?.split(' ')[0] ?? '—' : '—'}
            sub={topFactor ? catMeta(topFactor.category).label : undefined}
            accent="border-amber-500"
          />
        </div>

        {/* Consolidated ranking */}
        {consolidated.length > 0 && (
          <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2 mb-1">
              <BarChart2 className="w-5 h-5 text-blue-500 shrink-0" />
              Ranking consolidado de factores
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Score 0–1 normalizado. Pondera: <strong>50%</strong> frecuencia · <strong>30%</strong> cobertura · <strong>20%</strong> relevancia.
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

        {/* Category breakdown */}
        <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h2 className="text-base font-semibold text-slate-800 mb-1">Desglose por categoría</h2>
          <p className="text-xs text-slate-400 mb-4">
            Haz clic en una categoría para ver sus factores individuales.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(byCategory).map(([cat, catFactors]) => {
              const meta = catMeta(cat);
              const isExpanded = expandedCategories[cat];
              const catStat = categoryStats[cat];
              const fList = catFactors as any[];
              return (
                <div key={cat} className={`rounded-xl border p-4 ${meta.bg}`}>
                  <button className="w-full flex items-center justify-between" onClick={() => setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-sm font-semibold ${meta.color} shrink-0`}>{meta.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-white border ${meta.color} font-medium shrink-0`}>{fList.length} factores</span>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                      {catStat && <span className="text-xs text-slate-500 font-mono">{(catStat.total_frequency ?? 0).toLocaleString()} menciones</span>}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="mt-3 space-y-2 border-t border-white/60 pt-3">
                      {fList.map((f: any) => (
                        <div key={f.factor_id} className="flex items-center justify-between gap-2">
                          <span className="text-sm text-slate-700 min-w-0 truncate">{f.factor_name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="w-16 sm:w-20 bg-white/70 rounded-full h-1.5 overflow-hidden">
                              <div className={`${barColor(cat)} h-full rounded-full`} style={{ width: `${pct(f.relevance_score ?? 0, maxRelevance)}%` }} />
                            </div>
                            <span className="text-xs text-slate-500 w-20 text-right font-mono">
                              {(f.global_frequency ?? 0) > 0 ? (f.global_frequency ?? 0).toLocaleString() + ' v.' : '—'}
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

        {/* Co-occurrence */}
        {coOccurrence.length > 0 && (
          <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h2 className="text-base font-semibold text-slate-800 mb-1">
              Co-ocurrencia de factores
              <span className="ml-2 text-xs font-normal text-slate-400">(top 20 pares)</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Número de documentos donde ambos factores aparecen simultáneamente ({docCount} total).
              Un valor alto sugiere relación temática en el corpus.
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
                    const tasa = docCount > 0 ? ((pair.co_occurrence_count / docCount) * 100).toFixed(1) + '%' : '—';
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 pr-4 text-xs sm:text-sm text-slate-700">
                          <span className={`inline-block text-xs px-1.5 py-0.5 rounded border mr-1 ${catMeta(pair.factor1_category).bg} ${catMeta(pair.factor1_category).color}`}>
                            {catMeta(pair.factor1_category).label}
                          </span>
                          {pair.factor1_name}
                        </td>
                        <td className="py-2 pr-4 text-xs sm:text-sm text-slate-700">
                          <span className={`inline-block text-xs px-1.5 py-0.5 rounded border mr-1 ${catMeta(pair.factor2_category).bg} ${catMeta(pair.factor2_category).color}`}>
                            {catMeta(pair.factor2_category).label}
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

        {/* Complete factors table */}
        <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h2 className="text-base font-semibold text-slate-800 mb-1">Tabla completa de factores</h2>
          <p className="text-xs text-slate-400 mb-4">
            <strong>Frecuencia:</strong> total de menciones · <strong>Cobertura:</strong> % de documentos · <strong>Relevancia:</strong> frecuencia × cobertura
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
                    const meta = catMeta(f.category);
                    return (
                      <tr key={f.factor_id} className="hover:bg-slate-50">
                        <td className="py-2 pr-3 text-slate-400 text-xs">{i + 1}</td>
                        <td className="py-2 pr-4 font-medium text-slate-800 text-sm">{f.factor_name}</td>
                        <td className="py-2 pr-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>{meta.label}</span>
                        </td>
                        <td className="py-2 pr-4 text-right font-mono text-slate-600 text-sm">
                          {(f.global_frequency ?? 0) > 0 ? (f.global_frequency ?? 0).toLocaleString() : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-2 pr-4 text-right font-mono text-slate-600 text-sm">
                          {f.document_coverage != null ? `${(f.document_coverage * 100).toFixed(1)}%` : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="py-2 text-right font-mono text-slate-600 text-sm font-semibold">
                          {(f.relevance_score ?? 0) > 0 ? (f.relevance_score ?? 0).toLocaleString() : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
