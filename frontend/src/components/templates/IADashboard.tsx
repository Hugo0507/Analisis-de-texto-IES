/**
 * IADashboard - AI/ML visualization dashboard
 *
 * Coming Soon page with attractive design showcasing future AI features.
 */

import React from 'react';
import { ChartCard } from '../molecules';

export const IADashboard: React.FC = () => {
  const upcomingFeatures = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      ),
      title: 'Análisis de Sentimiento',
      description: 'Clasificación automática de opiniones y emociones en documentos',
      color: 'from-rose-500 to-pink-500',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: 'Resúmenes Automáticos',
      description: 'Generación de resúmenes concisos usando modelos de lenguaje',
      color: 'from-emerald-500 to-teal-500',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
        </svg>
      ),
      title: 'Clasificación de Documentos',
      description: 'Categorización automática basada en contenido semántico',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      title: 'Embeddings Semánticos',
      description: 'Representaciones vectoriales para búsqueda por similitud',
      color: 'from-purple-500 to-violet-500',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      title: 'Question Answering',
      description: 'Respuestas automáticas a preguntas sobre el corpus',
      color: 'from-amber-500 to-orange-500',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
      title: 'Extracción de Conocimiento',
      description: 'Identificación de relaciones y grafos de conocimiento',
      color: 'from-cyan-500 to-blue-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 p-8">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          {/* Icon */}
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
            <svg className="w-12 h-12 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-white mb-3">
            Inteligencia Artificial
          </h2>
          <p className="text-lg text-slate-400 mb-6">
            Análisis avanzado impulsado por modelos de lenguaje y aprendizaje automático
          </p>

          {/* Coming Soon Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm font-medium text-amber-400">En Desarrollo</span>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Próximas Funcionalidades</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingFeatures.map((feature, index) => (
            <div
              key={index}
              className="group p-5 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-300"
            >
              <div className={`w-12 h-12 mb-4 rounded-xl bg-gradient-to-br ${feature.color} bg-opacity-20 flex items-center justify-center text-white opacity-80 group-hover:opacity-100 transition-opacity`}>
                {feature.icon}
              </div>
              <h4 className="text-white font-medium mb-2">{feature.title}</h4>
              <p className="text-sm text-slate-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack Preview */}
      <ChartCard
        title="Tecnologías Planificadas"
        subtitle="Stack de IA y ML para análisis avanzado"
        accentColor="amber"
        size="md"
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        }
      >
        <div className="flex flex-wrap gap-3 p-2">
          {['OpenAI GPT-4', 'Hugging Face', 'LangChain', 'Sentence Transformers', 'spaCy', 'FAISS', 'ChromaDB', 'LlamaIndex'].map((tech) => (
            <span
              key={tech}
              className="px-3 py-1.5 text-sm rounded-lg bg-slate-800/50 text-slate-300 border border-slate-700/50"
            >
              {tech}
            </span>
          ))}
        </div>
      </ChartCard>
    </div>
  );
};
