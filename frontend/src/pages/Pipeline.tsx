/**
 * Pipeline Page
 *
 * Complete pipeline execution interface:
 * 1. Connect to Google Drive
 * 2. Select folder
 * 3. Execute full NLP/ML pipeline
 * 4. Monitor progress in real-time
 */

import React, { useState, useEffect } from 'react';
import { Button, Badge, Spinner } from '../components/atoms';
import { pipelineService, documentsService } from '../services';

interface PipelineStage {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  message?: string;
}

interface DriveFolder {
  id: string;
  name: string;
  file_count: number;
}

export const Pipeline: React.FC = () => {
  // Drive Configuration
  const [driveConnected, setDriveConnected] = useState(false);
  const [folderId, setFolderId] = useState('');
  const [folderInfo, setFolderInfo] = useState<DriveFolder | null>(null);
  const [isLoadingFolder, setIsLoadingFolder] = useState(false);

  // Pipeline Execution
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);

  // WebSocket for real-time updates
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Initialize pipeline stages
  useEffect(() => {
    initializeStages();
  }, []);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  const initializeStages = () => {
    const pipelineStages: PipelineStage[] = [
      { name: '1. Detección de Idiomas', status: 'pending', progress: 0 },
      { name: '2. Conversión PDF→TXT', status: 'pending', progress: 0 },
      { name: '3. Preprocesamiento de Texto', status: 'pending', progress: 0 },
      { name: '4. Bolsa de Palabras (BoW)', status: 'pending', progress: 0 },
      { name: '5. TF-IDF', status: 'pending', progress: 0 },
      { name: '6. Análisis de N-gramas', status: 'pending', progress: 0 },
      { name: '7. Named Entity Recognition', status: 'pending', progress: 0 },
      { name: '8. Topic Modeling', status: 'pending', progress: 0 },
      { name: '9. BERTopic', status: 'pending', progress: 0 },
      { name: '10. Reducción de Dimensionalidad', status: 'pending', progress: 0 },
      { name: '11. Clasificación de Textos', status: 'pending', progress: 0 },
      { name: '12. Análisis de Factores', status: 'pending', progress: 0 },
      { name: '13. Consolidación', status: 'pending', progress: 0 },
      { name: '14. Visualizaciones', status: 'pending', progress: 0 },
    ];
    setStages(pipelineStages);
  };

  const handleConnectDrive = async () => {
    if (!folderId.trim()) {
      alert('Por favor ingresa el ID de la carpeta de Google Drive');
      return;
    }

    setIsLoadingFolder(true);
    try {
      // Upload documents from Google Drive folder
      const response = await documentsService.upload({
        folder_id: folderId,
        mime_type: 'application/pdf',
        max_files: 100,
      });

      if (response.success) {
        setFolderInfo({
          id: folderId,
          name: `Carpeta de Drive`,
          file_count: response.uploaded_count + response.skipped_count,
        });
        setDriveConnected(true);

        alert(
          `✅ Conexión exitosa!\n\n` +
          `Documentos cargados: ${response.uploaded_count}\n` +
          `Ya existentes: ${response.skipped_count}\n` +
          `Errores: ${response.failed_count}`
        );
      } else {
        alert('Error al cargar documentos desde Drive');
      }
    } catch (error: any) {
      console.error('Error connecting to Drive:', error);
      const errorMsg = error.response?.data?.error || 'Error al conectar con Google Drive. Verifica el ID de la carpeta.';
      alert(errorMsg);
    } finally {
      setIsLoadingFolder(false);
    }
  };

  const handleExecutePipeline = async () => {
    if (!driveConnected || !folderId) {
      alert('Primero debes conectar una carpeta de Google Drive');
      return;
    }

    setIsExecuting(true);

    try {
      // Execute pipeline (processes all loaded documents)
      const response = await pipelineService.execute({
        use_cache: true,
      });

      if (response.success && response.execution_id) {
        setExecutionId(response.execution_id);

        // Connect WebSocket for real-time updates
        connectWebSocket(response.execution_id);
      }
    } catch (error) {
      console.error('Error executing pipeline:', error);
      alert('Error al iniciar el pipeline');
      setIsExecuting(false);
    }
  };

  const connectWebSocket = (execId: string) => {
    const wsUrl = process.env.REACT_APP_WS_BASE_URL || 'ws://localhost:8000/ws';
    const socket = new WebSocket(`${wsUrl}/pipeline/${execId}/`);

    socket.onopen = () => {
      console.log('WebSocket connected');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Update stage status
      if (data.stage !== undefined) {
        setStages((prevStages) => {
          const newStages = [...prevStages];
          newStages[data.stage] = {
            ...newStages[data.stage],
            status: data.status,
            progress: data.progress || 0,
            message: data.message,
          };
          return newStages;
        });
      }

      // Update overall progress
      if (data.overall_progress !== undefined) {
        setOverallProgress(data.overall_progress);
      }

      // Pipeline completed
      if (data.completed) {
        setIsExecuting(false);
        socket.close();
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    setWs(socket);
  };

  const getStatusColor = (status: PipelineStage['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getStatusIcon = (status: PipelineStage['status']) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'running':
        return '⏳';
      case 'error':
        return '❌';
      default:
        return '⚪';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-navy-900 mb-2">
          Pipeline de Análisis Completo
        </h1>
        <p className="text-gray-600">
          Ejecuta el flujo completo de procesamiento NLP/ML desde Google Drive
        </p>
      </div>

      {/* Step 1: Connect to Google Drive */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            📁 Paso 1: Conectar con Google Drive
          </h2>
          {driveConnected && (
            <Badge variant="success" size="md">Conectado</Badge>
          )}
        </div>

        {!driveConnected ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID de Carpeta de Google Drive
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: 1a2b3c4d5e6f7g8h9i0j"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                disabled={isLoadingFolder}
              />
              <p className="mt-2 text-sm text-gray-500">
                💡 Encuentra el ID en la URL de tu carpeta de Drive:
                https://drive.google.com/drive/folders/<strong>ID_AQUI</strong>
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleConnectDrive}
              disabled={isLoadingFolder || !folderId.trim()}
            >
              {isLoadingFolder ? (
                <>
                  <Spinner size="sm" />
                  <span className="ml-2">Conectando...</span>
                </>
              ) : (
                '🔗 Conectar con Drive'
              )}
            </Button>
          </div>
        ) : (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
            <div className="flex items-start">
              <div className="text-2xl mr-3">✅</div>
              <div>
                <h3 className="font-semibold text-green-900">
                  Carpeta conectada exitosamente
                </h3>
                <p className="text-green-700 mt-1">
                  <strong>{folderInfo?.name}</strong>
                </p>
                <p className="text-sm text-green-600 mt-1">
                  {folderInfo?.file_count} archivos encontrados
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDriveConnected(false);
                    setFolderInfo(null);
                    setFolderId('');
                  }}
                  className="mt-2"
                >
                  🔄 Cambiar carpeta
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Execute Pipeline */}
      {driveConnected && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              ⚙️ Paso 2: Ejecutar Pipeline
            </h2>
            {isExecuting && (
              <Badge variant="warning" size="md">Ejecutando...</Badge>
            )}
          </div>

          {!isExecuting && !executionId ? (
            <div>
              <p className="text-gray-600 mb-4">
                El pipeline procesará todos los documentos de la carpeta seleccionada
                a través de 14 etapas de análisis NLP/ML.
              </p>
              <Button
                variant="success"
                size="lg"
                onClick={handleExecutePipeline}
              >
                🚀 Iniciar Pipeline Completo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Overall Progress */}
              <div>
                <div className="flex justify-between text-sm text-gray-700 mb-2">
                  <span>Progreso General</span>
                  <span className="font-semibold">{overallProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>

              {/* Stages Progress */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {stages.map((stage, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-3 ${getStatusColor(stage.status)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getStatusIcon(stage.status)}</span>
                        <div>
                          <p className="font-medium">{stage.name}</p>
                          {stage.message && (
                            <p className="text-sm opacity-80">{stage.message}</p>
                          )}
                        </div>
                      </div>
                      {stage.status === 'running' && (
                        <Spinner size="sm" />
                      )}
                    </div>

                    {stage.progress > 0 && stage.progress < 100 && (
                      <div className="mt-2">
                        <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                          <div
                            className="bg-current h-2 rounded-full transition-all duration-300"
                            style={{ width: `${stage.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {!isExecuting && overallProgress === 100 && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mt-4">
                  <div className="flex items-center">
                    <span className="text-3xl mr-3">🎉</span>
                    <div>
                      <h3 className="font-semibold text-green-900">
                        ¡Pipeline completado exitosamente!
                      </h3>
                      <p className="text-green-700 mt-1">
                        Todos los análisis se han ejecutado correctamente.
                      </p>
                      <div className="mt-3 space-x-2">
                        <Button variant="primary" size="sm">
                          📊 Ver Resultados
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setIsExecuting(false);
                            setExecutionId(null);
                            setOverallProgress(0);
                            initializeStages();
                          }}
                        >
                          🔄 Ejecutar Nuevamente
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!driveConnected && (
        <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <div className="text-4xl">💡</div>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                ¿Cómo obtener el ID de tu carpeta de Google Drive?
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-blue-800">
                <li>Abre Google Drive en tu navegador</li>
                <li>Navega a la carpeta que contiene tus documentos académicos (PDF)</li>
                <li>Copia el ID de la URL:
                  <code className="bg-blue-100 px-2 py-1 rounded text-sm ml-2">
                    https://drive.google.com/drive/folders/<strong>1a2b3c4d...</strong>
                  </code>
                </li>
                <li>Pega el ID en el campo de arriba y haz click en "Conectar"</li>
              </ol>
              <p className="mt-4 text-sm text-blue-700">
                <strong>Nota:</strong> Asegúrate de que tu cuenta de Google Drive tenga acceso
                a la carpeta seleccionada.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
