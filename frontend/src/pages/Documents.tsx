/**
 * Documents Page
 *
 * Document management and upload interface.
 */

import React, { useState, useEffect } from 'react';
import { Button, Badge, Spinner } from '../components/atoms';
import { MetricCard } from '../components/molecules';
import { documentsService } from '../services';
import type { Document } from '../services/documentsService';

export const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchDocuments();
  }, [page]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      const response = await documentsService.list(page, 20);
      setDocuments(response.results);
      setTotalCount(response.count);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: Document['status']) => {
    const variants = {
      pending: 'default' as const,
      processing: 'warning' as const,
      completed: 'success' as const,
      error: 'danger' as const,
    };

    return <Badge variant={variants[status]} size="sm">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-navy-900 mb-2">
          Gestión de Documentos
        </h1>
        <p className="text-gray-600">
          Administra los documentos del corpus académico
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Documentos"
          value={totalCount}
          icon="📄"
          variant="primary"
          isLoading={isLoading}
        />
        <MetricCard
          title="Completados"
          value={documents.filter((d) => d.status === 'completed').length}
          icon="✅"
          variant="success"
          isLoading={isLoading}
        />
        <MetricCard
          title="En Proceso"
          value={documents.filter((d) => d.status === 'processing').length}
          icon="⏳"
          variant="warning"
          isLoading={isLoading}
        />
        <MetricCard
          title="Con Errores"
          value={documents.filter((d) => d.status === 'error').length}
          icon="❌"
          variant="danger"
          isLoading={isLoading}
        />
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex space-x-4">
          <Button variant="primary" size="md">
            📤 Subir desde Drive
          </Button>
          <Button variant="secondary" size="md">
            🔄 Refrescar Lista
          </Button>
          <Button variant="ghost" size="md">
            🗑️ Limpiar Cache
          </Button>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre del Archivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Idioma
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Spinner size="lg" />
                    <p className="text-gray-600 mt-4">Cargando documentos...</p>
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="text-6xl mb-4">📄</div>
                    <p className="text-gray-600">No hay documentos disponibles</p>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{doc.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {doc.filename}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {doc.language_code ? (
                        <span>
                          {doc.language_code.toUpperCase()}
                          {doc.language_confidence && ` (${(doc.language_confidence * 100).toFixed(0)}%)`}
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(doc.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalCount > 20 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            ← Anterior
          </Button>
          <span className="px-4 py-2 text-sm text-gray-700">
            Página {page} de {Math.ceil(totalCount / 20)}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= Math.ceil(totalCount / 20)}
            onClick={() => setPage(page + 1)}
          >
            Siguiente →
          </Button>
        </div>
      )}
    </div>
  );
};
