/**
 * IADashboard - Dashboard público de resultados IA
 *
 * Muestra los resultados consolidados de los análisis LLM (Claude, Gemini, ChatGPT)
 * comparados con el NLP tradicional. Si no hay resultados, muestra un estado vacío
 * informativo sin "Coming Soon".
 */

import React, { useState, useEffect } from 'react';
import { publicAIAnalysisService } from '../../services/aiAnalysisService';
import type { AIComparisonSummaryPublic, AIFactorComparison } from '../../services/aiAnalysisService';
import { ChartCard } from '../molecules';

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface FreqBarGroupProps {
  row: AIFactorComparison;
  maxVal: number;
}

const PROVIDER_COLORS = {
  claude:  { bar: 'bg-violet-500', label: 'Claude',  text: 'text-violet-600' },
  gemini:  { bar: 'bg-blue-500',   label: 'Gemini',  text: 'text-blue-600'   },
  chatgpt: { bar: 'bg-emerald-500',label: 'ChatGPT', text: 'text-emerald-600' },
  nlp:     { bar: 'bg-slate-400',  label: 'NLP',     text: 'text-slate-500'  },
};

const FreqBarGroup: React.FC<FreqBarGroupProps> = ({ row, maxVal }) => {
  const entries: Array<{ key: keyof typeof PROVIDER_COLORS; value: number }> = [
    { key: 'claude',  value: row.claude_frequency  },
    { key: 'gemini',  value: row.gemini_frequency  },
    { key: 'chatgpt', value: row.chatgpt_frequency },
    { key: 'nlp',     value: row.nlp_frequency     },
  ];
  return (
    <div className="space-y-1">
      {entries.map(({ key, value }) => {
        const meta = PROVIDER_COLORS[key];
        const width = maxVal > 0 ? Math.max((value / maxVal) * 100, value > 0 ? 3 : 0) : 0;
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`text-xs w-12 shrink-0 ${meta.text}`}>{meta.label}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div className={`${meta.bar} h-full rounded-full transition-all duration-500`} style={{ width: `${width}%` }} />
            </div>
            <span className="text-xs font-mono text-slate-500 w-5 text-right shrink-0">{value}</span>
          </div>
        );
      })}
    </div>
  );
};

// ── Loading skeleton ──────────────────────────────────────────────────────────

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-slate-700/30 rounded animate-pulse ${className}`} />
);

// ── Main Component ────────────────────────────────────────────────────────────

export const IADashboard: React.FC = () => {
  const [data, setData] = useState<AIComparisonSummaryPublic | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setIsLoading(true);
        const result = await publicAIAnalysisService.getPublicSummary();
        if (!cancelled) setData(result);
      } catch {
        if (!cancelled) {
          // Si el endpoint no existe aún o no hay datos, tratamos como sin resultados
          setData({ has_results: false, factor_comparison: [], consensus_factors: [], success_cases_consensus: [], agreement_with_nlp: { claude: 0, gemini: 0, chatgpt: 0 } });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // ── Empty / no results state ──────────────────────────────────────────────

  if (!data?.has_results || data.factor_comparison.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-white">Inteligencia Artificial</h2>
          <p className="text-slate-400 text-sm mt-1">
            Comparación de análisis LLM vs NLP tradicional
          </p>
        </div>

        {/* Empty state informativo */}
        <div className="p-8 rounded-2xl bg-slate-800/30 border border-slate-700/50">
          <div className="text-center max-w-lg mx-auto">
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/30 flex items-center justify-center">
              <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Análisis LLM pendiente
            </h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Aún no se han ejecutado análisis con Claude, Gemini o ChatGPT sobre el corpus.
              Los resultados aparecerán aquí una vez que el equipo de investigación ejecute los análisis.
            </p>

            {/* Qué se mostrará */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left mt-6">
              {[
                { title: 'Factores por LLM', desc: 'Qué factores identificó cada modelo y su frecuencia de mención' },
                { title: 'Consenso multi-LLM', desc: 'Factores donde Claude, Gemini y ChatGPT coinciden' },
                { title: 'Acuerdo con NLP', desc: 'Porcentaje de coincidencia de cada LLM con el análisis NLP tradicional' },
              ].map((item) => (
                <div key={item.title} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <p className="text-xs font-semibold text-slate-300 mb-1">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Compute max frequency ────────────────────────────────────────────────

  const maxFrequency = Math.max(
    ...data.factor_comparison.flatMap((f) => [
      f.claude_frequency, f.gemini_frequency, f.chatgpt_frequency, f.nlp_frequency,
    ]),
    1
  );

  return (
    <div className="space-y-6">

      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Inteligencia Artificial</h2>
          <p className="text-slate-400 text-sm mt-1">
            Comparación de análisis LLM (Claude, Gemini, ChatGPT) vs NLP tradicional
          </p>
        </div>
      </div>

      {/* Acuerdo con NLP */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(['claude', 'gemini', 'chatgpt'] as const).map((provider) => {
          const meta = PROVIDER_COLORS[provider];
          const value = data.agreement_with_nlp[provider];
          const accents: Record<string, string> = {
            claude: 'from-violet-500/20 to-purple-500/20 border-violet-500/30',
            gemini: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
            chatgpt: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
          };
          return (
            <div key={provider} className={`p-4 rounded-xl bg-gradient-to-br ${accents[provider]} border`}>
              <p className={`text-sm font-semibold ${meta.text} capitalize mb-1`}>{meta.label}</p>
              <p className="text-2xl font-bold text-white">{pct(value)}</p>
              <p className="text-xs text-slate-400 mt-1">acuerdo con NLP tradicional</p>
              <div className="mt-2 h-1 bg-slate-700/50 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${meta.bar}`} style={{ width: pct(value) }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Factores: gráfico de barras agrupadas */}
      <ChartCard
        title="Frecuencia de factores por modelo"
        subtitle="Menciones de cada factor de transformación digital identificadas por cada LLM"
        accentColor="amber"
        size="lg"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }
      >
        {/* Leyenda */}
        <div className="flex flex-wrap gap-3 px-2 pb-3">
          {(['claude', 'gemini', 'chatgpt', 'nlp'] as const).map((key) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${PROVIDER_COLORS[key].bar}`} />
              <span className="text-xs text-slate-400">{PROVIDER_COLORS[key].label}</span>
            </div>
          ))}
        </div>

        <div className="space-y-4 p-2">
          {data.factor_comparison.map((row) => (
            <div key={row.factor_name}>
              <p className="text-xs font-medium text-slate-300 mb-1.5">{row.factor_name}</p>
              <FreqBarGroup row={row} maxVal={maxFrequency} />
            </div>
          ))}
        </div>
      </ChartCard>

      {/* Consenso */}
      {data.consensus_factors.length > 0 && (
        <ChartCard
          title="Factores en consenso"
          subtitle="Identificados por los tres LLMs simultáneamente"
          accentColor="emerald"
          size="sm"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        >
          <div className="flex flex-wrap gap-2 p-2">
            {data.consensus_factors.map((f) => (
              <span key={f} className="text-sm px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                {f}
              </span>
            ))}
          </div>
        </ChartCard>
      )}

      {/* Casos de éxito en consenso */}
      {data.success_cases_consensus.length > 0 && (
        <ChartCard
          title="Casos de éxito (consenso)"
          subtitle="Identificados por los tres LLMs"
          accentColor="purple"
          size="lg"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        >
          <div className="divide-y divide-slate-700/50">
            {data.success_cases_consensus.map((caso) => (
              <div key={caso.id} className="py-3 px-2 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-sm font-medium text-white">{caso.institution}</p>
                  <span className="text-xs text-slate-500 shrink-0">{(caso.confidence * 100).toFixed(0)}%</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">{caso.transformation_type}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{caso.results}</p>
                {caso.factors.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {caso.factors.map((f) => (
                      <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/50">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ChartCard>
      )}

    </div>
  );
};
