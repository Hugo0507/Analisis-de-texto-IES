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

const metricAccentColors = {
  emerald: 'from-emerald-500 to-emerald-600',
  cyan: 'from-cyan-500 to-cyan-600',
  purple: 'from-purple-500 to-purple-600',
  amber: 'from-amber-500 to-amber-600',
  rose: 'from-rose-500 to-rose-600',
  blue: 'from-blue-500 to-blue-600',
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
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        bg-white
        border border-gray-200
        p-5 transition-all duration-300
        hover:border-gray-300 hover:shadow-md
        ${className}
      `}
    >
      {/* Background gradient accent */}
      <div
        className={`
          absolute top-0 right-0 w-24 h-24 opacity-10
          bg-gradient-to-br ${metricAccentColors[accentColor]}
          rounded-full blur-2xl -translate-y-1/2 translate-x-1/2
        `}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 tracking-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={`
                  inline-flex items-center text-xs font-medium
                  ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}
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
              <span className="text-xs text-gray-400">vs anterior</span>
            </div>
          )}
        </div>

        {icon && (
          <div
            className={`
              p-3 rounded-xl
              bg-gradient-to-br ${metricAccentColors[accentColor]}
              text-white shadow-lg
            `}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
