/**
 * Upload Summary Modal
 *
 * Displays final report after dataset upload completes.
 * Shows successful and failed files with detailed information.
 */

import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

interface UploadSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    failedBatches: Array<{
      batchNumber: number;
      files: string[];
      error: string;
    }>;
  };
}

const UploadSummaryModal: React.FC<UploadSummaryModalProps> = ({
  isOpen,
  onClose,
  summary
}) => {
  const [expandedBatches, setExpandedBatches] = useState<Set<number>>(new Set());

  if (!isOpen) return null;

  const hasFailures = summary.failedFiles > 0;
  const successRate = Math.round((summary.successfulFiles / summary.totalFiles) * 100);

  const toggleBatch = (batchNumber: number) => {
    const newExpanded = new Set(expandedBatches);
    if (newExpanded.has(batchNumber)) {
      newExpanded.delete(batchNumber);
    } else {
      newExpanded.add(batchNumber);
    }
    setExpandedBatches(newExpanded);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`px-6 py-4 border-b ${hasFailures ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-3">
            {hasFailures ? (
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            ) : (
              <CheckCircle className="w-8 h-8 text-green-600" />
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {hasFailures ? 'Carga finalizada con observaciones' : 'Carga completada exitosamente'}
              </h2>
              <p className="text-sm text-gray-600">
                {hasFailures
                  ? 'Algunos archivos no pudieron cargarse debido a problemas de conexión'
                  : 'Todos los archivos se cargaron correctamente'}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="grid grid-cols-3 gap-4">
            {/* Total Files */}
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{summary.totalFiles}</div>
              <div className="text-sm text-gray-600">Total de archivos</div>
            </div>

            {/* Successful */}
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{summary.successfulFiles}</div>
              <div className="text-sm text-gray-600">Cargados correctamente</div>
            </div>

            {/* Failed */}
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{summary.failedFiles}</div>
              <div className="text-sm text-gray-600">No procesados</div>
            </div>
          </div>

          {/* Success Rate Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>Tasa de éxito</span>
              <span className="font-semibold">{successRate}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${successRate === 100 ? 'bg-green-600' : 'bg-yellow-500'}`}
                style={{ width: `${successRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Failed Files Details (if any) */}
        {hasFailures && (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              Archivos no procesados ({summary.failedBatches.length} lotes)
            </h3>

            <div className="space-y-2">
              {summary.failedBatches.map((batch) => {
                const isExpanded = expandedBatches.has(batch.batchNumber);

                return (
                  <div
                    key={batch.batchNumber}
                    className="border border-red-200 rounded-lg bg-red-50"
                  >
                    {/* Batch Header (clickable) */}
                    <button
                      onClick={() => toggleBatch(batch.batchNumber)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-red-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-600" />
                        )}
                        <span className="font-medium text-gray-900">
                          Lote #{batch.batchNumber}
                        </span>
                        <span className="text-sm text-gray-600">
                          ({batch.files.length} archivos)
                        </span>
                      </div>
                    </button>

                    {/* Batch Details (expandable) */}
                    {isExpanded && (
                      <div className="px-4 pb-3 border-t border-red-200">
                        {/* Error Message */}
                        <div className="mb-2 p-2 bg-white rounded text-sm">
                          <span className="font-semibold text-gray-700">Error:</span>{' '}
                          <span className="text-gray-600">{batch.error}</span>
                        </div>

                        {/* File List */}
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-gray-700 mb-1">Archivos:</div>
                          {batch.files.map((fileName, idx) => (
                            <div
                              key={idx}
                              className="text-sm text-gray-600 pl-4 py-1 bg-white rounded truncate"
                              title={fileName}
                            >
                              • {fileName}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Recommendation */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">💡 Recomendación</h4>
              <p className="text-sm text-blue-800">
                Los archivos no procesados probablemente excedieron el límite de tasa de conexión del servidor.
                Puedes intentar cargarlos nuevamente en lotes más pequeños o esperar unos minutos antes de reintentar.
              </p>
            </div>
          </div>
        )}

        {/* Success Message (if no failures) */}
        {!hasFailures && (
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <p className="text-lg text-gray-700">
                Todos los archivos se cargaron correctamente y están listos para ser procesados.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadSummaryModal;
