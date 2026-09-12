/**
 * PageHeader Component (Molecule)
 *
 * Barra superior fija de las paginas de administracion: boton opcional de
 * volver, titulo, subtitulo y acciones a la derecha.
 *
 * Las veintiuna paginas de crear y ver repetian este bloque entero a mano,
 * con las mismas clases de Tailwind y la misma sombra escrita en linea. Al
 * estar copiado, cada arreglo de accesibilidad o de estilo habia que hacerlo
 * veintiuna veces -y en la practica se hacia en unas pocas, que es por lo que
 * unas paginas tenian anillo de foco visible y otras no.
 */

import React from 'react';
import { IconButton, BackIcon } from '../atoms';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Icono decorativo a la izquierda del titulo, en las paginas de listado. */
  icon?: React.ReactNode;
  /** Si se pasa, se muestra el boton de volver y se invoca al pulsarlo. */
  onBack?: () => void;
  backTitle?: string;
  /** Acciones alineadas a la derecha, normalmente un IconButton de guardar. */
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  onBack,
  backTitle = 'Volver',
  actions,
  className = '',
}) => (
  <div
    className={`sticky top-0 z-40 bg-white border-b border-gray-200 ${className}`.trim()}
    style={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)' }}
  >
    <div className="flex items-center justify-between px-8 py-4">
      <div className="flex items-center gap-3">
        {onBack && (
          <IconButton icon={<BackIcon />} onClick={onBack} title={backTitle} />
        )}
        {icon}
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>

      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  </div>
);
