/**
 * Datasets Page
 *
 * Management of datasets for NLP analysis.
 * Only accessible by authenticated users.
 */

import React from 'react';

export const Datasets: React.FC = () => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F7FE' }}>
      {/* Fixed Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200" style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
        <div className="flex items-center justify-between px-8 py-4">
          {/* Left: Icon + Title */}
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <h1 className="text-xl font-semibold text-gray-900">Conjunto de Datos</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <div className="bg-white p-12 text-center" style={{ borderRadius: '20px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}>
          <div className="text-8xl mb-6">🎓</div>
          <h2 className="text-4xl font-bold text-emerald-600 mb-4">
            Vamos a graduarnos
          </h2>
          <p className="text-gray-600 text-lg">
            Sección en construcción - Gestión de conjuntos de datos
          </p>
        </div>
      </div>
    </div>
  );
};
