/**
 * AIComparacionPage
 *
 * Comparación entre los 3 LLMs (Claude, Gemini, ChatGPT) y el análisis NLP tradicional.
 * Muestra tabla comparativa, gráfico de barras, consenso y divergencias.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  GitCompare,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Info,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import aiAnalysisService from '../services/aiAnalysisService';
import type { AIComparisonSummary, AIFactorComparison } from '../services/aiAnalysisService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

// ── Helpers ──────────────────────────────────────────────────────────────────

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface CheckCellProps {
  value: boolean;
}
const CheckCell: React.FC<CheckCellProps> = ({ value }) =>
  value ? (
    <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" aria-label="Sí" />
  ) : (
    <XCircle className="w-4 h-4 text-slate-300 mx-auto" aria-label="No" />
  );

interface FreqBarProps {
  value: number;
  max: number;
  color: string;
}
const FreqBar: React.FC<FreqBarProps> = ({ value, max, color }) => (
  <div className="flex items-center gap-1.5">
    <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
      <div
        className={`${color} h-full rounded-full transition-all duration-500`}
        style={{ width: max > 0 ? `${Math.max((value / max) * 100, value > 0 ? 4 : 0)}%` : '0%' }}
      />
    </div>
    <span className="text-xs font-mono text-slate-500 w-6 text-right shrink-0">{value}</span>
  </div>
);

interface AgreementCardProps {
  provider: string;
  value: number;
  color: string;
  bg: string;
}
const AgreementCard: React.FC<AgreementCardProps> = ({ provider, value, color, bg }) => (
  <div className={`rounded-xl border p-4 ${bg}`}>
    <p className={`text-sm font-semibold ${color} mb-1`}>{provider}</p>
    <p className="text-2xl font-bold text-slate-800">{pct(value)}</p>
    <p className="text-xs text-slate-500 mt-1">acuerdo con NLP tradicional</p>
    <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color.replace('text', 'bg')}`} style={{ width: pct(value) }} />
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

export const AIComparacionPage: React.FC = () => {
  const { showError } = useToast();

  const [summary, setSummary] = useState<AIComparisonSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await aiAnalysisService.getComparisonSummary();
      if (data.success) setSummary(data.summary);
    } catch (err: any) {
      const msg: string = err.response?.data?.error ?? err.message ?? '';
      // Si no hay análisis ejecutados todavía, es un estado vacío esperado
      if (!msg.toLowerCase().includes('no analysis')) {
        showError('Error al cargar la comparación: ' + msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // ── Compute max frequencies for bar charts ────────────────────────────────

  const maxFrequency = summary
    ? Math.max(
        ...summary.factor_comparison.flatMap((f) => [
          f.claude_frequency,
          f.gemini_frequency,
          f.chatgpt_frequency,
          f.nlp_frequency,
        ]),
        1
      )
    : 1;

  // ── Loading state ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4F7FE' }}>
        <Spinner />
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!summary || summary.factor_comparison.length === 0) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>
        <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div className="flex items-center gap-3 px-4 sm:px-8 py-4">
            <GitCompare className="w-5 h-5 text-amber-600 shrink-0" />
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Comparación Multi-LLM</h1>
          </div>
        </div>
        <div className="p-4 sm:p-8">
          <div className="bg-white p-8 sm:p-10 text-center" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <GitCompare className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sin datos de comparación</h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto mb-1">
              Ejecuta al menos un análisis con Claude, Gemini o ChatGPT para ver la comparación entre modelos.
            </p>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Ve a las secciones individuales de IA para iniciar los análisis.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>

      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div className="flex items-center justify-between px-4 sm:px-8 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <GitCompare className="w-5 h-5 text-amber-600 shrink-0" />
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Comparación Multi-LLM</h1>
          </div>
          <button
            onClick={loadSummary}
            className="p-2 sm:p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            title="Actualizar comparación"
          >
            <RefreshCw className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">

        {/* Info */}
        <div className="flex gap-2.5 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
          <span className="leading-relaxed">
            Comparación entre <strong>Claude</strong>, <strong>Gemini</strong>, <strong>ChatGPT</strong>
            y el <strong>análisis NLP tradicional</strong>. Se muestra qué factores identificó cada modelo
            y el porcentaje de acuerdo con la metodología NLP.
          </span>
        </div>

        {/* Métricas de acuerdo con NLP */}
        <div>
          <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            Acuerdo con NLP Tradicional
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <AgreementCard
              provider="Claude"
              value={summary.agreement_with_nlp.claude}
              color="text-violet-700"
              bg="bg-violet-50 border-violet-200"
            />
            <AgreementCard
              provider="Gemini"
              value={summary.agreement_with_nlp.gemini}
              color="text-blue-700"
              bg="bg-blue-50 border-blue-200"
            />
            <AgreementCard
              provider="ChatGPT"
              value={summary.agreement_with_nlp.chatgpt}
              color="text-emerald-700"
              bg="bg-emerald-50 border-emerald-200"
            />
          </div>
        </div>

        {/* Consenso */}
        {summary.consensus_factors.length > 0 && (
          <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h2 className="text-base font-semibold text-slate-800 mb-1 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Factores en consenso
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              Factores identificados por los tres LLMs simultáneamente.
            </p>
            <div className="flex flex-wrap gap-2">
              {summary.consensus_factors.map((f) => (
                <span key={f} className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Divergencias */}
        {summary.divergent_factors.length > 0 && (
          <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <h2 className="text-base font-semibold text-slate-800 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Factores con divergencias
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              Factores donde los LLMs no coinciden entre sí.
            </p>
            <div className="flex flex-wrap gap-2">
              {summary.divergent_factors.map((f) => (
                <span key={f} className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tabla comparativa */}
        <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <h2 className="text-base font-semibold text-slate-800 mb-1">Tabla comparativa de factores</h2>
          <p className="text-xs text-slate-400 mb-4">
            Presencia del factor en cada modelo (check = identificado).
            Las barras muestran la frecuencia absoluta de menciones.
          </p>
          <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
            <table className="w-full text-sm min-w-[640px]" role="table" aria-label="Comparación de factores por modelo">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 py-2 pr-4 w-40">Factor</th>
                  <th className="text-center text-xs font-medium text-violet-600 py-2 px-2 w-14">Claude</th>
                  <th className="text-center text-xs font-medium text-blue-600 py-2 px-2 w-14">Gemini</th>
                  <th className="text-center text-xs font-medium text-emerald-600 py-2 px-2 w-16">ChatGPT</th>
                  <th className="text-center text-xs font-medium text-slate-600 py-2 px-2 w-16">NLP</th>
                  <th className="text-left text-xs font-medium text-violet-500 py-2 px-2">Frec. Claude</th>
                  <th className="text-left text-xs font-medium text-blue-500 py-2 px-2">Frec. Gemini</th>
                  <th className="text-left text-xs font-medium text-emerald-500 py-2 px-2">Frec. ChatGPT</th>
                  <th className="text-left text-xs font-medium text-slate-500 py-2 pl-2">Frec. NLP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {summary.factor_comparison.map((row: AIFactorComparison) => {
                  const allAgree = row.claude && row.gemini && row.chatgpt;
                  return (
                    <tr
                      key={row.factor_name}
                      className={`hover:bg-slate-50 ${allAgree ? 'bg-emerald-50/30' : ''}`}
                    >
                      <td className="py-2.5 pr-4 font-medium text-slate-800 text-xs sm:text-sm">
                        <div className="flex items-center gap-1.5">
                          {allAgree && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />}
                          <span>{row.factor_name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-center"><CheckCell value={row.claude} /></td>
                      <td className="py-2.5 px-2 text-center"><CheckCell value={row.gemini} /></td>
                      <td className="py-2.5 px-2 text-center"><CheckCell value={row.chatgpt} /></td>
                      <td className="py-2.5 px-2 text-center"><CheckCell value={row.nlp_traditional} /></td>
                      <td className="py-2.5 px-2">
                        <FreqBar value={row.claude_frequency} max={maxFrequency} color="bg-violet-400" />
                      </td>
                      <td className="py-2.5 px-2">
                        <FreqBar value={row.gemini_frequency} max={maxFrequency} color="bg-blue-400" />
                      </td>
                      <td className="py-2.5 px-2">
                        <FreqBar value={row.chatgpt_frequency} max={maxFrequency} color="bg-emerald-400" />
                      </td>
                      <td className="py-2.5 pl-2">
                        <FreqBar value={row.nlp_frequency} max={maxFrequency} color="bg-slate-400" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumen de casos de éxito por modelo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['claude', 'gemini', 'chatgpt', 'consensus'] as const).map((key) => {
            const labels: Record<string, string> = {
              claude: 'Claude', gemini: 'Gemini', chatgpt: 'ChatGPT', consensus: 'Consenso',
            };
            const colors: Record<string, string> = {
              claude: 'border-violet-500', gemini: 'border-blue-500',
              chatgpt: 'border-emerald-500', consensus: 'border-amber-500',
            };
            return (
              <div key={key} className={`bg-white rounded-xl border-l-4 ${colors[key]} shadow-sm p-4`}>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{labels[key]}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">
                  {summary.total_success_cases[key]}
                </p>
                <p className="text-xs text-slate-400 mt-1">casos de éxito</p>
              </div>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 px-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Factor identificado por el modelo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-slate-300" />
            <span>Factor no identificado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-50 border border-emerald-200" />
            <span>Consenso (los 3 LLMs coinciden)</span>
          </div>
        </div>

      </div>
    </div>
  );
};
