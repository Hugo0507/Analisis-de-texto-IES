/**
 * Modal de exportacion de los datos completos del dashboard.
 */

import React, { useState } from 'react';
import type { VectorizationDashboardData } from '../../../services/dashboardService';
import {
  exportBowCompleteCsv,
  exportTfidfCompleteCsv,
  exportNgramCompleteCsv,
  exportJsonComplete,
  exportPythonDictComplete,
  exportJupyterNotebook,
} from './exports';
import { DownloadIcon, CloseIcon, CheckboxIcon } from './icons';

export type ExportOption = 'bow_csv' | 'tfidf_csv' | 'ngram_csv' | 'all_json' | 'python_dict' | 'jupyter_notebook';

export interface ExportModalProps {
  data: VectorizationDashboardData;
  onClose: () => void;
}

export const EXPORT_OPTIONS: Array<{ id: ExportOption; label: string; desc: string; icon: string; color: string }> = [
  { id: 'bow_csv',     label: 'Vocabulario completo BoW (.csv)',    desc: 'Todos los términos del corpus con su frecuencia — no solo top N', icon: '📊', color: 'cyan'   },
  { id: 'tfidf_csv',  label: 'TF-IDF completo (.csv)',             desc: 'Todos los términos: TF, IDF y score TF-IDF',                    icon: '📈', color: 'blue'   },
  { id: 'ngram_csv',  label: 'N-gramas completos (.csv)',          desc: 'Todas las configuraciones: bigramas, trigramas, etc.',           icon: '🔗', color: 'purple' },
  { id: 'all_json',   label: 'Exportación completa (.json)',       desc: 'Todos los análisis con vocabulario completo + metadatos',        icon: '📦', color: 'amber'  },
  { id: 'python_dict',     label: 'Diccionario Python (.py)',       desc: 'Listo para Pandas, scikit-learn o spaCy — con uso sugerido',           icon: '🐍', color: 'emerald'},
  { id: 'jupyter_notebook', label: 'Jupyter Notebook (.ipynb)',    desc: 'Análisis completo con visualizaciones listas para ejecutar en Jupyter', icon: '📓', color: 'amber' },
];

export const exportColorMap: Record<string, string> = {
  cyan:    'border-cyan-500/40   bg-cyan-500/10   text-cyan-400',
  blue:    'border-blue-500/40   bg-blue-500/10   text-blue-400',
  purple:  'border-purple-500/40 bg-purple-500/10 text-purple-400',
  amber:   'border-amber-500/40  bg-amber-500/10  text-amber-400',
  emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
};

export const ExportModal: React.FC<ExportModalProps> = ({ data, onClose }) => {
  const [selected, setSelected] = useState<Set<ExportOption>>(new Set(['bow_csv', 'tfidf_csv']));
  const [exporting, setExporting] = useState(false);

  const toggle = (id: ExportOption) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleExport = async () => {
    setExporting(true);
    try {
      const bowName   = data.selectedBow?.name   || 'bow';
      const tfidfName = data.selectedTfidf?.name || 'tfidf';
      const ngramName = data.selectedNgram?.name || 'ngrams';
      if (selected.has('bow_csv')    && data.selectedBow)   exportBowCompleteCsv(data.selectedBow, bowName);
      if (selected.has('tfidf_csv')  && data.selectedTfidf) exportTfidfCompleteCsv(data.selectedTfidf, tfidfName);
      if (selected.has('ngram_csv')  && data.selectedNgram) exportNgramCompleteCsv(data.selectedNgram, ngramName);
      if (selected.has('all_json'))    exportJsonComplete(data);
      if (selected.has('python_dict'))     exportPythonDictComplete(data);
      if (selected.has('jupyter_notebook')) exportJupyterNotebook(data);
    } finally {
      setExporting(false);
      onClose();
    }
  };

  const isAvailable = (id: ExportOption) => {
    if (id === 'bow_csv')    return !!data.selectedBow;
    if (id === 'tfidf_csv')  return !!data.selectedTfidf;
    if (id === 'ngram_csv')  return !!data.selectedNgram;
    return true;
  };

  const sizeHint = (id: ExportOption): string | null => {
    if (id === 'bow_csv' && data.selectedBow)   return `${(data.selectedBow.vocabulary_size || 0).toLocaleString()} términos`;
    if (id === 'tfidf_csv' && data.selectedTfidf) {
      const n = Object.keys(data.selectedTfidf.idf_vector?.idf_values || {}).length;
      return `${n > 0 ? n.toLocaleString() : data.selectedTfidf.vocabulary_size.toLocaleString()} términos`;
    }
    if (id === 'ngram_csv' && data.selectedNgram) {
      const total = Object.values(data.selectedNgram.results || {}).reduce((s, r) => s + (r.top_terms?.length || 0), 0);
      return `${total.toLocaleString()} n-gramas`;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-700/50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><DownloadIcon />Exportar Datos Completos</h2>
            <p className="text-xs text-slate-400 mt-0.5">Se exporta el vocabulario completo, no solo los top términos</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"><CloseIcon /></button>
        </div>

        <div className="px-6 py-4 space-y-2.5">
          {EXPORT_OPTIONS.map(opt => {
            const available = isAvailable(opt.id);
            const checked   = selected.has(opt.id);
            const hint      = sizeHint(opt.id);
            return (
              <button key={opt.id} onClick={() => available && toggle(opt.id)} disabled={!available}
                className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  !available ? 'opacity-40 cursor-not-allowed border-slate-700/30 bg-slate-800/20'
                  : checked  ? `border ${exportColorMap[opt.color]}`
                  : 'border-slate-700/40 bg-slate-800/20 hover:bg-slate-800/40'
                }`}
              >
                <CheckboxIcon checked={checked && available} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>{opt.icon}</span>
                    <span className="text-sm font-medium text-slate-200">{opt.label}</span>
                    {!available && <span className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">Sin datos</span>}
                    {hint && available && <span className="text-xs text-slate-400 bg-slate-700/30 px-1.5 py-0.5 rounded">{hint}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-slate-700/50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-slate-400 border border-slate-700/50 rounded-xl hover:bg-slate-800/40 transition-colors">Cancelar</button>
          <button onClick={handleExport} disabled={selected.size === 0 || exporting}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {exporting
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Descargando…</>
              : <><DownloadIcon />Descargar {selected.size > 0 ? `(${selected.size})` : ''}</>}
          </button>
        </div>
      </div>
    </div>
  );
};
