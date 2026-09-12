/**
 * IconButton Component (Atom)
 *
 * Boton circular con un solo icono. Es el boton de "volver" y el de "guardar"
 * que estaban copiados a mano en las paginas de creacion y de detalle: mismo
 * marcado, mismas clases de Tailwind y mismos anillos de foco, repetidos una
 * y otra vez con pequenas variaciones.
 *
 * Cuando `isLoading` esta activo muestra un Spinner en lugar del icono y se
 * deshabilita solo, que es lo que hacia a mano cada pagina al guardar.
 */

import React from 'react';
import { Spinner } from './Spinner';

export interface IconButtonProps {
  /** Icono a mostrar. Se ignora mientras isLoading esta activo. */
  icon: React.ReactNode;
  /** Recibe el evento, como cualquier boton: varias paginas pasan aqui su
   *  manejador de envio de formulario, que espera un SyntheticEvent. */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** neutral: gris, para navegar. success: verde, para confirmar. */
  variant?: 'neutral' | 'success';
  isLoading?: boolean;
  disabled?: boolean;
  /** Texto del tooltip; se usa tambien como etiqueta accesible. */
  title: string;
  type?: 'button' | 'submit';
  className?: string;
}

const variantStyles: Record<NonNullable<IconButtonProps['variant']>, string> = {
  neutral:
    'p-2.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors ' +
    'disabled:opacity-50 disabled:cursor-not-allowed ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400',
  success:
    'p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-all ' +
    'disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-400',
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  variant = 'neutral',
  isLoading = false,
  disabled = false,
  title,
  type = 'button',
  className = '',
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || isLoading}
    className={`${variantStyles[variant]} ${className}`.trim()}
    title={title}
    aria-label={title}
  >
    {isLoading ? <Spinner size="sm" /> : icon}
  </button>
);

/** Flecha hacia la izquierda: el icono de "volver" de todas las paginas. */
export const BackIcon: React.FC = () => (
  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

/** Marca de verificacion: el icono de "guardar" de todas las paginas. */
export const CheckIcon: React.FC = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

/** Flecha circular: el icono de "refrescar" de las paginas de listado. */
export const RefreshIcon: React.FC = () => (
  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

/** Signo mas: el icono de "crear" de las paginas de listado. */
export const PlusIcon: React.FC = () => (
  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
  </svg>
);
