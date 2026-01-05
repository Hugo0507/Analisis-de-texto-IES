/**
 * TF-IDF Analysis Page (Dashboard Public)
 *
 * REDIRECT: Esta es la página antigua del dashboard público.
 * Ahora redirige a la interfaz de administración completa.
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '../components/atoms';

export const TfIdf: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🟣 [TfIdf] Página de redirección montada');
    console.log('🟣 [TfIdf] Redirigiendo a: /admin/vectorizacion/tf-idf');

    // Redirigir automáticamente a la interfaz de admin
    navigate('/admin/vectorizacion/tf-idf', { replace: true });
  }, [navigate]);

  console.log('🟣 [TfIdf] Renderizando página de redirección...');

  return (
    <div className="min-h-screen flex items-center justify-center bg-purple-50">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="ml-4 text-gray-900 font-semibold mt-4">Redirigiendo a Matriz TF-IDF...</p>
        <p className="text-sm text-gray-600 mt-2">Si no redirige, revisa la consola del navegador</p>
      </div>
    </div>
  );
};
