/**
 * LoadingPanel Component (Molecule)
 *
 * Panel centrado con un spinner grande, el "cargando" a pantalla parcial que
 * estaba copiado literalmente en quince paginas:
 *
 *   <div className="flex items-center justify-center h-96">
 *     <Spinner size="lg" />
 *   </div>
 *
 * Admite un mensaje opcional, porque varias paginas lo pedian y acababan
 * escribiendo su propia variante en lugar de reutilizar el bloque.
 */

import React from 'react';
import { Spinner } from '../atoms';

export interface LoadingPanelProps {
  /** Alto del panel. Por defecto h-96, que es el que usaban las paginas. */
  height?: string;
  /** Mensaje opcional bajo el spinner. */
  message?: string;
  className?: string;
}

export const LoadingPanel: React.FC<LoadingPanelProps> = ({
  height = 'h-96',
  message,
  className = '',
}) => (
  <div className={`flex items-center justify-center ${height} ${className}`.trim()}>
    {message ? (
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    ) : (
      <Spinner size="lg" />
    )}
  </div>
);
