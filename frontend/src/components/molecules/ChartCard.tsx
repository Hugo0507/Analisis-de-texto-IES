/**
 * ChartCard - Glassmorphism card for dashboard visualizations
 *
 * Dark theme with neon accent colors. Supports cross-filtering interactions.
 */

import React from 'react';

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  isActive?: boolean;
  isLoading?: boolean;
  accentColor?: 'emerald' | 'cyan' | 'purple' | 'amber' | 'rose' | 'blue';
  onExpandClick?: () => void;
  onRefreshClick?: () => void;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const accentColorClasses = {
  emerald: {
    gradient: 'from-emerald-500/20 to-emerald-600/5',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/10',
    text: 'text-emerald-400',
    ring: 'ring-emerald-500/30',
  },
  cyan: {
    gradient: 'from-cyan-500/20 to-cyan-600/5',
    border: 'border-cyan-500/30',
    glow: 'shadow-cyan-500/10',
    text: 'text-cyan-400',
    ring: 'ring-cyan-500/30',
  },
  purple: {
    gradient: 'from-purple-500/20 to-purple-600/5',
    border: 'border-purple-500/30',
    glow: 'shadow-purple-500/10',
    text: 'text-purple-400',
    ring: 'ring-purple-500/30',
  },
  amber: {
    gradient: 'from-amber-500/20 to-amber-600/5',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/10',
    text: 'text-amber-400',
    ring: 'ring-amber-500/30',
  },
  rose: {
    gradient: 'from-rose-500/20 to-rose-600/5',
    border: 'border-rose-500/30',
    glow: 'shadow-rose-500/10',
    text: 'text-rose-400',
    ring: 'ring-rose-500/30',
  },
  blue: {
    gradient: 'from-blue-500/20 to-blue-600/5',
    border: 'border-blue-500/30',
    glow: 'shadow-blue-500/10',
    text: 'text-blue-400',
    ring: 'ring-blue-500/30',
  },
};

const sizeClasses = {
  sm: 'min-h-[180px]',
  md: 'min-h-[280px]',
  lg: 'min-h-[380px]',
  xl: 'min-h-[480px]',
};

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  icon,
  children,
  className = '',
  isActive = false,
  isLoading = false,
  accentColor = 'emerald',
  onExpandClick,
  onRefreshClick,
  footer,
  size = 'md',
}) => {
  const colors = accentColorClasses[accentColor];

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        bg-slate-800/40 backdrop-blur-xl
        border ${isActive ? colors.border : 'border-slate-700/50'}
        shadow-xl ${isActive ? colors.glow : 'shadow-black/20'}
        ${isActive ? `ring-1 ${colors.ring}` : ''}
        transition-all duration-300
        hover:border-slate-600/60
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {/* Gradient overlay for glassmorphism effect */}
      <div
        className={`
          absolute inset-0 opacity-50
          bg-gradient-to-br ${colors.gradient}
          pointer-events-none
        `}
      />

      {/* Header */}
      <div className="relative flex items-start justify-between p-4 pb-2">
        <div className="flex items-start gap-3">
          {icon && (
            <div className={`p-2 rounded-lg bg-slate-800/50 ${colors.text}`}>
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {onRefreshClick && (
            <button
              onClick={onRefreshClick}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
              title="Actualizar"
            >
              <svg
                className={`w-4 h-4 text-slate-400 hover:text-slate-300 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}
          {onExpandClick && (
            <button
              onClick={onExpandClick}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
              title="Expandir"
            >
              <svg
                className="w-4 h-4 text-slate-400 hover:text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1 p-4 pt-2">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin ${colors.border}`} />
          </div>
        ) : (
          children
        )}
      </div>

      {/* Footer */}
      {footer && (
        <div className="relative px-4 py-3 border-t border-slate-700/30">
          {footer}
        </div>
      )}

      {/* Active indicator glow */}
      {isActive && (
        <div
          className={`
            absolute -bottom-1 left-1/2 -translate-x-1/2 w-1/2 h-1
            rounded-full bg-gradient-to-r ${colors.gradient.replace('/20', '').replace('/5', '')}
            blur-sm
          `}
        />
      )}
    </div>
  );
};
