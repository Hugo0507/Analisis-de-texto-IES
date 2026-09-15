/**
 * DashboardGrid - Responsive grid layout for dashboard cards
 *
 * Manages the layout of ChartCard components in the dashboard.
 */

import React from 'react';

export interface DashboardGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
}

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
};

const gapClasses = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
};

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  children,
  className = '',
  columns = 3,
  gap = 'md',
}) => {
  return (
    <div className={`grid ${columnClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
};

// Metric card variant for KPIs
export interface MetricCardDarkProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  accentColor?: 'emerald' | 'cyan' | 'purple' | 'amber' | 'rose' | 'blue';
  className?: string;
}

// El acento se reduce a un punto junto al título: indica la naturaleza del
// dato (correcto, descartado…) sin teñir toda la ficha.
const metricAccentDots = {
  emerald: 'bg-stage-sum',
  cyan: 'bg-stage-prep',
  purple: 'bg-stage-vec',
  amber: 'bg-stage-mod',
  rose: 'bg-stage-lab',
  blue: 'bg-sky-400',
};

export const MetricCardDark: React.FC<MetricCardDarkProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  accentColor = 'emerald',
  className = '',
}) => {
  const texto = typeof value === 'number' ? value.toLocaleString() : value;
  // Valores textuales largos (p. ej. un nombre de modelo) bajan de tamaño
  // para no desbordar la ficha.
  const valorLargo = String(texto).length > 14;

  return (
    <div
      className={`
        relative flex flex-col rounded-2xl
        bg-ink-900 border border-ink-700
        p-5 transition-colors duration-200
        hover:border-ink-600
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-start gap-2 text-sm leading-snug text-mist">
            <span aria-hidden="true" className={`mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full ${metricAccentDots[accentColor]}`} />
            <span>{title}</span>
          </p>
          <p
            className={`
              num mt-3 font-display font-semibold leading-none text-paper break-words
              ${valorLargo ? 'text-xl tracking-[-0.01em]' : 'text-[28px] tracking-[-0.02em]'}
            `}
          >
            {texto}
          </p>
          {subtitle && (
            <p className="mt-2.5 text-sm leading-snug text-mist">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={`
                  inline-flex items-center text-xs font-medium
                  ${trend.isPositive ? 'text-stage-sum' : 'text-stage-lab'}
                `}
              >
                <svg
                  className={`w-3 h-3 mr-0.5 ${trend.isPositive ? '' : 'rotate-180'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
                {Math.abs(trend.value)}%
              </span>
              <span className="text-sm text-mist">vs anterior</span>
            </div>
          )}
        </div>

        {icon && (
          <div aria-hidden="true" className="shrink-0 rounded-lg p-2 text-fog [&_svg]:h-5 [&_svg]:w-5">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
