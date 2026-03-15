/**
 * FactorsCreate Page
 *
 * Formulario para crear un nuevo análisis de factores.
 * Permite: seleccionar preprocesamiento, ver factores con keywords, añadir nuevos factores.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Play, Plus, X, ChevronDown, ChevronUp,
  Info, Loader2, Database, Tag,
} from 'lucide-react';
import analysisService from '../services/analysisService';
import type { FactorCatalogItem } from '../services/analysisService';
import dataPreparationService from '../services/dataPreparationService';
import type { DataPreparationListItem } from '../services/dataPreparationService';
import { Spinner } from '../components/atoms';
import { useToast } from '../contexts/ToastContext';

// ── Category metadata ──────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'tecnologico',    label: 'Tecnológico',    color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
  { value: 'organizacional', label: 'Organizacional', color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200' },
  { value: 'humano',         label: 'Humano',         color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  { value: 'estrategico',    label: 'Estratégico',    color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
  { value: 'financiero',     label: 'Financiero',     color: 'text-green-700',   bg: 'bg-green-50 border-green-200' },
  { value: 'pedagogico',     label: 'Pedagógico',     color: 'text-rose-700',    bg: 'bg-rose-50 border-rose-200' },
  { value: 'infraestructura',label: 'Infraestructura',color: 'text-slate-700',   bg: 'bg-slate-50 border-slate-200' },
  { value: 'seguridad',      label: 'Seguridad',      color: 'text-red-700',     bg: 'bg-red-50 border-red-200' },
];

function getCatMeta(cat: string) {
  return CATEGORIES.find(c => c.value === cat) ?? { label: cat, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' };
}

// ── FactorCard ─────────────────────────────────────────────────────────────

interface FactorCardProps {
  factor: FactorCatalogItem;
  expanded: boolean;
  onToggle: () => void;
  onDelete: (id: number) => void;
  isDefault: boolean;
}

const FactorCard: React.FC<FactorCardProps> = ({ factor, expanded, onToggle, onDelete, isDefault }) => {
  const meta = getCatMeta(factor.category);
  return (
    <div className={`rounded-xl border p-3 ${meta.bg}`}>
      <button className="w-full flex items-center justify-between" onClick={onToggle}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-sm font-semibold ${meta.color} truncate`}>{factor.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full bg-white border ${meta.color} shrink-0`}>
            {meta.label}
          </span>
          <span className="text-xs text-slate-400 shrink-0">{factor.keyword_count} palabras</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {!isDefault && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(factor.id); }}
              className="p-1 text-slate-400 hover:text-red-500 transition-colors rounded"
              title="Eliminar factor"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-white/60">
          <div className="flex flex-wrap gap-1">
            {(factor.keywords ?? []).map((kw, i) => (
              <span key={i} className={`text-xs px-2 py-0.5 rounded-full bg-white border ${meta.color}`}>
                {kw}
              </span>
            ))}
            {factor.keywords?.length === 0 && (
              <span className="text-xs text-slate-400 italic">Sin palabras clave</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── AddFactorForm ──────────────────────────────────────────────────────────

interface AddFactorFormProps {
  onAdd: (factor: { name: string; category: string; keywords: string[] }) => Promise<void>;
  onCancel: () => void;
}

const AddFactorForm: React.FC<AddFactorFormProps> = ({ onAdd, onCancel }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('tecnologico');
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const addKeyword = () => {
    const kw = keywordInput.trim().toLowerCase();
    if (kw && !keywords.includes(kw)) {
      setKeywords(prev => [...prev, kw]);
    }
    setKeywordInput('');
  };

  const removeKeyword = (kw: string) => setKeywords(prev => prev.filter(k => k !== kw));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addKeyword(); }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onAdd({ name: name.trim(), category, keywords });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border-2 border-emerald-200 bg-emerald-50 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-emerald-800">Nuevo factor</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del factor</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Accesibilidad Digital"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Categoría</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Palabras clave (escribe y presiona Enter o el botón +)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={keywordInput}
            onChange={e => setKeywordInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: digital access"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
          />
          <button
            onClick={addKeyword}
            className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {keywords.map(kw => (
              <span key={kw} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white border border-emerald-300 text-emerald-700">
                {kw}
                <button onClick={() => removeKeyword(kw)} className="hover:text-red-500">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-white">
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || isSaving}
          className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Añadir factor
        </button>
      </div>
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────

export const FactorsCreate: React.FC = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [name, setName] = useState('');
  const [selectedPrep, setSelectedPrep] = useState<number | null>(null);
  const [preparations, setPreparations] = useState<DataPreparationListItem[]>([]);
  const [factors, setFactors] = useState<FactorCatalogItem[]>([]);
  const [expandedFactors, setExpandedFactors] = useState<Record<number, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [noFactors, setNoFactors] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // IDs de los factores que existían antes de crear la página (los "por defecto")
  const [defaultFactorIds, setDefaultFactorIds] = useState<Set<number>>(new Set());

  const loadData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [prepsData, factorsData] = await Promise.all([
        dataPreparationService.getPreparations(),
        analysisService.listFactors(),
      ]);
      setPreparations(prepsData.filter(p => p.status === 'completed'));

      if (factorsData.factors && factorsData.factors.length > 0) {
        setFactors(factorsData.factors);
        setDefaultFactorIds(new Set(factorsData.factors.map(f => f.id)));
        setNoFactors(false);
      } else {
        setNoFactors(true);
      }
    } catch (err: any) {
      showError('Error al cargar datos: ' + (err.response?.data?.error ?? err.message));
    } finally {
      setIsLoadingData(false);
    }
  }, [showError]);

  useEffect(() => { loadData(); }, [loadData]);

  const seedAndReload = async () => {
    setIsSeeding(true);
    try {
      await analysisService.seedFactors();
      showSuccess('Catálogo de factores inicializado');
      await loadData();
    } catch {
      showError('No se pudo inicializar el catálogo');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleAddFactor = async (data: { name: string; category: string; keywords: string[] }) => {
    try {
      const result = await analysisService.createFactor(data);
      if (result.success) {
        showSuccess(`Factor "${data.name}" añadido`);
        setShowAddForm(false);
        // Add to local list without re-fetching
        const newFactor: FactorCatalogItem = {
          id: result.factor.id,
          name: result.factor.name,
          category: result.factor.category,
          keywords: result.factor.keywords,
          keyword_count: result.factor.keywords.length,
          global_frequency: 0,
          relevance_score: null,
        };
        setFactors(prev => [...prev, newFactor]);
      }
    } catch (err: any) {
      showError('Error al añadir factor: ' + (err.response?.data?.error ?? err.message));
    }
  };

  const handleDeleteFactor = async (id: number) => {
    try {
      await analysisService.deleteFactor(id);
      setFactors(prev => prev.filter(f => f.id !== id));
      showSuccess('Factor eliminado');
    } catch (err: any) {
      showError('Error al eliminar factor: ' + (err.response?.data?.error ?? err.message));
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      showError('Escribe un nombre para el análisis.');
      return;
    }
    setIsRunning(true);
    try {
      const result = await analysisService.createFactorRun({
        name: name.trim(),
        data_preparation_id: selectedPrep ?? null,
      });
      if (result.success) {
        showSuccess('Análisis completado');
        navigate(`/admin/analisis/analisis-de-factores/${result.run.id}`);
      } else {
        showError(result.error ?? 'Error al ejecutar el análisis');
      }
    } catch (err: any) {
      showError('Error: ' + (err.response?.data?.error ?? err.message));
    } finally {
      setIsRunning(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4F7FE' }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>

      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div className="flex items-center justify-between px-4 sm:px-8 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/admin/analisis/analisis-de-factores')}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">Nuevo análisis de factores</h1>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isRunning || !name.trim() || noFactors}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-full text-white text-sm font-medium shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? 'Analizando...' : 'Ejecutar análisis'}
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-8 space-y-5 max-w-4xl mx-auto">

        {/* Nombre */}
        <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <label className="block text-sm font-semibold text-slate-800 mb-2">Nombre del análisis</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Análisis factores corpus completo"
            className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* Selección de preprocesamiento */}
        <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-800">Preparación de datos</h2>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Selecciona sobre cuál preprocesamiento correr el análisis. Si no seleccionas ninguno,
            se usarán todos los documentos preprocesados disponibles.
          </p>
          <div className="space-y-2">
            <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedPrep === null ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
              <input
                type="radio"
                name="prep"
                checked={selectedPrep === null}
                onChange={() => setSelectedPrep(null)}
                className="accent-emerald-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-800">Todos los documentos</p>
                <p className="text-xs text-slate-400">Usa todos los documentos con texto preprocesado disponibles</p>
              </div>
            </label>
            {preparations.map(prep => (
              <label key={prep.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedPrep === prep.id ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                <input
                  type="radio"
                  name="prep"
                  checked={selectedPrep === prep.id}
                  onChange={() => setSelectedPrep(prep.id)}
                  className="accent-emerald-500"
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{prep.name}</p>
                  <p className="text-xs text-slate-400">{prep.dataset_name}</p>
                </div>
              </label>
            ))}
            {preparations.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <Info className="w-4 h-4 shrink-0" />
                No hay preparaciones completadas. Se usarán todos los documentos preprocesados.
              </div>
            )}
          </div>
        </div>

        {/* Factores */}
        <div className="bg-white p-5 sm:p-6" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-800">Factores de búsqueda</h2>
            </div>
            {!showAddForm && !noFactors && (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full hover:bg-emerald-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Añadir factor
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-4">
            El análisis buscará estas palabras clave en los textos preprocesados.
            Los factores por defecto tienen keywords en español e inglés.
            Puedes añadir factores personalizados o eliminar los que no necesites.
          </p>

          {noFactors ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-600 mb-4">
                El catálogo de factores no está inicializado. Cárgalo primero.
              </p>
              <button
                onClick={seedAndReload}
                disabled={isSeeding}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-sm font-medium shadow-md disabled:opacity-50"
              >
                {isSeeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                Inicializar catálogo de factores
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {showAddForm && (
                <AddFactorForm
                  onAdd={handleAddFactor}
                  onCancel={() => setShowAddForm(false)}
                />
              )}

              {/* Group by category */}
              {CATEGORIES.map(cat => {
                const catFactors = factors.filter(f => f.category === cat.value);
                if (catFactors.length === 0) return null;
                return (
                  <div key={cat.value}>
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1.5 ${cat.color}`}>{cat.label}</p>
                    <div className="space-y-1.5 mb-3">
                      {catFactors.map(f => (
                        <FactorCard
                          key={f.id}
                          factor={f}
                          expanded={!!expandedFactors[f.id]}
                          onToggle={() => setExpandedFactors(prev => ({ ...prev, [f.id]: !prev[f.id] }))}
                          onDelete={handleDeleteFactor}
                          isDefault={defaultFactorIds.has(f.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              <p className="text-xs text-slate-400 pt-1">
                Total: {factors.length} factores · {factors.reduce((s, f) => s + (f.keyword_count ?? 0), 0)} palabras clave
              </p>
            </div>
          )}
        </div>

        {/* Botón ejecutar (abajo) */}
        <div className="flex justify-end pb-8">
          <button
            onClick={handleSubmit}
            disabled={isRunning || !name.trim() || noFactors}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-full text-white font-medium shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
            {isRunning ? 'Analizando corpus...' : 'Ejecutar análisis'}
          </button>
        </div>

      </div>
    </div>
  );
};
