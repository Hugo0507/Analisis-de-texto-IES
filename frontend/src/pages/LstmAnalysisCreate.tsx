/**
 * LstmAnalysisCreate — Formulario para entrenar un nuevo modelo LSTM.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import lstmService from '../services/lstmService';
import dataPreparationService from '../services/dataPreparationService';
import type { DataPreparationListItem } from '../services/dataPreparationService';
import topicModelingService from '../services/topicModelingService';
import type { TopicModelingListItem } from '../services/topicModelingService';
import { useToast } from '../contexts/ToastContext';
import { Spinner } from '../components/atoms';

// ── Helper ────────────────────────────────────────────────────────────────────

const InfoBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-700">
    <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span>{children}</span>
  </div>
);

const SectionHeader: React.FC<{ number: string; title: string; subtitle?: string }> = ({ number, title, subtitle }) => (
  <div className="flex items-center gap-3 mb-5">
    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
      {number}
    </div>
    <div>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

// ── Component ────────────────────────────────────────────────────────────────

export const LstmAnalysisCreate: React.FC = () => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();

  // Sources
  const [preparations, setPreparations] = useState<DataPreparationListItem[]>([]);
  const [topicModels, setTopicModels] = useState<TopicModelingListItem[]>([]);
  const [loadingSources, setLoadingSources] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dpId, setDpId] = useState<number | ''>('');
  const [tmId, setTmId] = useState<number | ''>('');

  // Hyperparameters
  const [embeddingDim, setEmbeddingDim] = useState(64);
  const [hiddenDim, setHiddenDim] = useState(128);
  const [numLayers, setNumLayers] = useState(1);
  const [numEpochs, setNumEpochs] = useState(20);
  const [learningRate, setLearningRate] = useState(0.001);
  const [batchSize, setBatchSize] = useState(16);
  const [trainSplit, setTrainSplit] = useState(0.8);
  const [maxVocabSize, setMaxVocabSize] = useState(5000);
  const [maxSeqLength, setMaxSeqLength] = useState(500);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    setLoadingSources(true);
    try {
      const [dps, tms] = await Promise.all([
        dataPreparationService.getPreparations(),
        topicModelingService.getTopicModelings(),
      ]);
      const doneDps = dps.filter(d => d.status === 'completed');
      const doneTms = tms.filter(t => t.status === 'completed');
      setPreparations(doneDps);
      setTopicModels(doneTms);
      if (doneDps.length === 1) setDpId(doneDps[0].id);
      if (doneTms.length === 1) setTmId(doneTms[0].id);
    } catch {
      showError('Error al cargar las fuentes de datos');
    } finally {
      setLoadingSources(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { showError('El nombre es obligatorio'); return; }
    if (!dpId) { showError('Selecciona una Preparación de Datos'); return; }
    if (!tmId) { showError('Selecciona un Modelo de Temas'); return; }

    setIsSubmitting(true);
    try {
      const analysis = await lstmService.create({
        name: name.trim(),
        description: description.trim() || undefined,
        data_preparation: dpId as number,
        topic_modeling: tmId as number,
        embedding_dim: embeddingDim,
        hidden_dim: hiddenDim,
        num_layers: numLayers,
        num_epochs: numEpochs,
        learning_rate: learningRate,
        batch_size: batchSize,
        train_split: trainSplit,
        max_vocab_size: maxVocabSize,
        max_seq_length: maxSeqLength,
      });
      showSuccess('Entrenamiento LSTM iniciado');
      navigate(`/admin/modelado/lstm/${analysis.id}`);
    } catch (err: any) {
      const msg = err.response?.data
        ? Object.values(err.response.data).flat().join(' ')
        : err.message;
      showError('Error al crear el análisis: ' + msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div className="flex items-center justify-between px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/modelado/lstm')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Volver"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Nuevo Análisis LSTM</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/modelado/lstm')}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="lstm-form"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? <Spinner size="sm" /> : null}
              {isSubmitting ? 'Iniciando...' : 'Iniciar Entrenamiento'}
            </button>
          </div>
        </div>
      </div>

      <form id="lstm-form" onSubmit={handleSubmit} className="p-8 max-w-3xl mx-auto space-y-6">

        {/* ── Sección A: Información básica ── */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <SectionHeader number="A" title="Información Básica" />
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ej: LSTM Clasificador Tema — Corpus 2024"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                placeholder="Descripción opcional del experimento..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
              />
            </div>
          </div>
        </div>

        {/* ── Sección B: Fuentes de datos ── */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <SectionHeader
            number="B"
            title="Fuentes de Datos"
            subtitle="El LSTM necesita textos preprocesados y etiquetas de tema dominante"
          />
          {loadingSources ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
              <Spinner size="sm" /> Cargando fuentes...
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preparación de Datos <span className="text-red-500">*</span>
                </label>
                <select
                  value={dpId}
                  onChange={e => setDpId(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="">Seleccionar preparación...</option>
                  {preparations.map(dp => (
                    <option key={dp.id} value={dp.id}>{dp.name}</option>
                  ))}
                </select>
                {preparations.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No hay preparaciones completadas. Completa una en Preprocesamiento → Preparación de Datos.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modelo de Temas <span className="text-red-500">*</span>
                </label>
                <select
                  value={tmId}
                  onChange={e => setTmId(Number(e.target.value))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  <option value="">Seleccionar modelo de temas...</option>
                  {topicModels.map(tm => (
                    <option key={tm.id} value={tm.id}>
                      {tm.name} [{(tm as any).algorithm_display ?? tm.algorithm}]
                    </option>
                  ))}
                </select>
                {topicModels.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No hay modelos de temas completados. Crea uno en Modelado → Modelado de Temas.
                  </p>
                )}
              </div>

              <InfoBox>
                El LSTM usará los textos del DataPreparation como entrada y los temas dominantes del
                Modelo de Temas como etiquetas de clase. Solo se usan los documentos que aparecen
                en ambas fuentes.
              </InfoBox>
            </div>
          )}
        </div>

        {/* ── Sección C: Arquitectura ── */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <SectionHeader
            number="C"
            title="Arquitectura del Modelo"
            subtitle="Embedding → LSTM → Linear → Softmax"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dimensión de Embeddings
              </label>
              <input
                type="number"
                value={embeddingDim}
                onChange={e => setEmbeddingDim(Number(e.target.value))}
                min={16} max={512} step={16}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <p className="text-xs text-gray-400 mt-1">Representación vectorial por palabra (16–512)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dimensión Oculta LSTM
              </label>
              <input
                type="number"
                value={hiddenDim}
                onChange={e => setHiddenDim(Number(e.target.value))}
                min={32} max={512} step={32}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <p className="text-xs text-gray-400 mt-1">Memoria interna de la celda LSTM (32–512)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capas LSTM</label>
              <input
                type="number"
                value={numLayers}
                onChange={e => setNumLayers(Number(e.target.value))}
                min={1} max={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <p className="text-xs text-gray-400 mt-1">Capas apiladas (1–4, recomendado: 1–2)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vocabulario Máximo</label>
              <input
                type="number"
                value={maxVocabSize}
                onChange={e => setMaxVocabSize(Number(e.target.value))}
                min={500} max={20000} step={500}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <p className="text-xs text-gray-400 mt-1">Top-N palabras más frecuentes (500–20 000)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitud de Secuencia</label>
              <input
                type="number"
                value={maxSeqLength}
                onChange={e => setMaxSeqLength(Number(e.target.value))}
                min={50} max={2000} step={50}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <p className="text-xs text-gray-400 mt-1">Tokens por documento (trunca o rellena con 0)</p>
            </div>
          </div>
        </div>

        {/* ── Sección D: Entrenamiento ── */}
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <SectionHeader number="D" title="Parámetros de Entrenamiento" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Épocas</label>
              <input
                type="number"
                value={numEpochs}
                onChange={e => setNumEpochs(Number(e.target.value))}
                min={1} max={200}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tasa de Aprendizaje</label>
              <input
                type="number"
                value={learningRate}
                onChange={e => setLearningRate(Number(e.target.value))}
                min={0.0001} max={0.1} step={0.0001}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño de Lote</label>
              <select
                value={batchSize}
                onChange={e => setBatchSize(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {[8, 16, 32, 64].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                División Train/Test ({Math.round(trainSplit * 100)}% / {Math.round((1 - trainSplit) * 100)}%)
              </label>
              <input
                type="range"
                value={trainSplit}
                onChange={e => setTrainSplit(Number(e.target.value))}
                min={0.5} max={0.95} step={0.05}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>

          <div className="mt-4">
            <InfoBox>
              El entrenamiento se ejecuta en CPU. Con el corpus estándar (~274 docs) y los
              valores por defecto, el entrenamiento demora aproximadamente 1–3 minutos.
              Optimizador: Adam. Función de pérdida: CrossEntropyLoss.
            </InfoBox>
          </div>
        </div>

      </form>
    </div>
  );
};

export default LstmAnalysisCreate;
