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
    // Redirigir automáticamente a la interfaz de admin
    navigate('/admin/vectorizacion/tf-idf', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size="lg" />
      <p className="ml-4 text-gray-600">Redirigiendo a Matriz TF-IDF...</p>
    </div>
  );
};
