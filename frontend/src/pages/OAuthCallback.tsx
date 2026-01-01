/**
 * OAuth Callback Page
 *
 * This page is opened in a popup window during the OAuth flow.
 * It receives the authorization code from Google and sends it back
 * to the parent window via postMessage, then closes automatically.
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

type CallbackStatus = 'processing' | 'success' | 'error';

export const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Extract parameters from URL
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    // Handle error from Google
    if (errorParam) {
      setStatus('error');
      setError(errorParam === 'access_denied'
        ? 'You denied access to Google Drive'
        : `Authorization failed: ${errorParam}`
      );

      // Notify parent window of error
      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'GOOGLE_DRIVE_OAUTH_ERROR',
            error: errorParam,
          },
          window.location.origin
        );
      }

      return;
    }

    // Validate required parameters
    if (!code || !state) {
      setStatus('error');
      setError('Missing authorization code or state parameter');

      if (window.opener) {
        window.opener.postMessage(
          {
            type: 'GOOGLE_DRIVE_OAUTH_ERROR',
            error: 'Missing authorization parameters',
          },
          window.location.origin
        );
      }

      return;
    }

    // Success - send code to parent window
    setStatus('success');

    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'GOOGLE_DRIVE_OAUTH_SUCCESS',
          code,
          state,
        },
        window.location.origin
      );
    }

    // Close window after short delay
    setTimeout(() => {
      window.close();
    }, 1000);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4"></div>
            <p className="text-gray-700 font-medium">Procesando autorización...</p>
            <p className="text-sm text-gray-500 mt-2">Por favor espera un momento</p>
          </>
        )}

        {status === 'success' && (
          <>
            <svg
              className="w-16 h-16 text-green-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <p className="text-gray-700 font-medium">Autorización exitosa</p>
            <p className="text-sm text-gray-500 mt-2">
              Esta ventana se cerrará automáticamente...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <svg
              className="w-16 h-16 text-red-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            <p className="text-red-700 font-medium">Error en autorización</p>
            <p className="text-sm text-gray-600 mt-2">{error}</p>
            <button
              onClick={() => window.close()}
              className="mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm transition-colors"
            >
              Cerrar ventana
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;
