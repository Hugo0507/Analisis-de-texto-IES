/**
 * StageHeading - Título de una sección del dashboard público.
 *
 * Muestra la etapa del pipeline (con su tono) sobre el título, un subtítulo
 * opcional y, a la derecha, las acciones de la página.
 */

import React from 'react';
import { STAGE_BY_KEY, StageKey } from '../../utils/dashboardStages';

export interface StageHeadingProps {
  stage: StageKey;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const StageHeading: React.FC<StageHeadingProps> = ({
  stage,
  title,
  subtitle,
  actions,
  className = '',
}) => {
  const etapa = STAGE_BY_KEY[stage];
  return (
    <div className={`flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <p className={`font-mono text-[11px] font-medium uppercase tracking-[0.14em] ${etapa.tone.text}`}>
          {etapa.eyebrow}
        </p>
        <h2 className="mt-1 font-display text-[26px] sm:text-[30px] font-semibold leading-tight tracking-[-0.02em] text-paper">
          {title}
        </h2>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-mist">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
};
