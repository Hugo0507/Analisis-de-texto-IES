/**
 * Google Drive Connect Component
 *
 * Displays the current Google Drive connection status and provides
 * buttons to connect or disconnect the user's Google Drive account.
 */

import React, { useState, useEffect } from 'react';
import googleDriveService, { GoogleDriveConnection } from '../services/googleDriveService';

interface GoogleDriveConnectProps {
  /** Callback when connection status changes */
  onConnectionChange?: (connection: GoogleDriveConnection) => void;
  /** Show as compact card (optional) */
  compact?: boolean;
}

export const GoogleDriveConnect: React.FC<GoogleDriveConnectProps> = ({
  onConnectionChange,
  compact = false,
}) => {
  const [connection, setConnection] = useState<GoogleDriveConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadConnectionStatus();
  }, []);

  const loadConnectionStatus = async () => {
    try {
      setError('');
      const status = await googleDriveService.getConnectionStatus();
      setConnection(status);
      onConnectionChange?.(status);
    } catch (error: any) {
      setError('Error al cargar el estado de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError('');

    try {
      const newConnection = await googleDriveService.connect();
      setConnection(newConnection);
      onConnectionChange?.(newConnection);
    } catch (error: any) {

      // User-friendly error messages
      let errorMessage = 'Error al conectar con Google Drive';

      if (error.message.includes('Popup blocked')) {
        errorMessage = 'Por favor permite ventanas emergentes para este sitio';
      } else if (error.message.includes('closed')) {
        errorMessage = 'Ventana de autorización cerrada';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const confirmed = window.confirm(
      '¿Estás seguro de desconectar tu cuenta de Google Drive? ' +
      'No podrás importar documentos desde Drive hasta que vuelvas a conectarte.'
    );

    if (!confirmed) {
      return;
    }

    setIsDisconnecting(true);
    setError('');

    try {
      await googleDriveService.disconnect();
      const newConnection: GoogleDriveConnection = { is_connected: false };
      setConnection(newConnection);
      onConnectionChange?.(newConnection);
    } catch (error: any) {
      setError('Error al desconectar Google Drive');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
        <span className="text-sm">Verificando conexión...</span>
      </div>
    );
  }

  if (connection?.is_connected) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {/* Google Drive Icon */}
            <svg
              className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} text-green-600 flex-shrink-0`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
            </svg>

            <div>
              <p className={`font-medium text-gray-900 ${compact ? 'text-sm' : ''}`}>
                Conectado a Google Drive
              </p>
              <p className={`text-gray-600 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
                {connection.email}
              </p>
              {!compact && connection.connected_at && (
                <p className="text-xs text-gray-500 mt-1">
                  Conectado el {new Date(connection.connected_at).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className={`px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 ${compact ? 'text-xs' : 'text-sm'}`}
          >
            {isDisconnecting ? 'Desconectando...' : 'Desconectar'}
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start gap-3">
        {/* Google Drive Icon */}
        <svg
          className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} text-blue-600 flex-shrink-0`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z" />
        </svg>

        <div className="flex-1">
          <p className={`font-medium text-gray-900 ${compact ? 'text-sm' : ''}`}>
            Conectar Google Drive
          </p>
          <p className={`text-gray-600 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
            Conecta tu cuenta de Google Drive para importar documentos directamente desde tus carpetas.
          </p>

          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className={`mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}
          >
            {isConnecting ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Conectando...</span>
              </>
            ) : (
              'Conectar con Google Drive'
            )}
          </button>

          {error && (
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleDriveConnect;
