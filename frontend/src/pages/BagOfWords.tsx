/**
 * Bag of Words Analysis Page (Dashboard Public)
 *
 * REDIRECT: Esta es la página antigua del dashboard público.
 * Ahora redirige a la interfaz de administración completa.
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../components/atoms';

export const BagOfWords: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {

    // Redirigir automáticamente a la interfaz de admin
    navigate('/admin/vectorizacion/bolsa-palabras', { replace: true });
  }, [navigate]);


  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="ml-4 text-gray-900 font-semibold mt-4">Redirigiendo a Bolsa de Palabras...</p>
        <p className="text-sm text-gray-600 mt-2">Si no redirige, revisa la consola del navegador</p>
      </div>
    </div>
  );
};
