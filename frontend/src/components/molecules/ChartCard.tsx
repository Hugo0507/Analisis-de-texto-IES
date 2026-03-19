/**
 * ChartCard - Card for dashboard visualizations
 *
 * Light WCAG-compliant theme with accent colors. Supports cross-filtering interactions.
 */

import React, { useRef, useCallback, useState } from 'react';

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
  headerExtra?: React.ReactNode;
  downloadable?: boolean;
  downloadTitle?: string;
}

const accentColorClasses = {
  emerald: {
    gradient: 'from-emerald-50 to-white',
    border: 'border-emerald-300',
    glow: 'shadow-emerald-100',
    text: 'text-emerald-700',
    ring: 'ring-emerald-300/60',
  },
  cyan: {
    gradient: 'from-cyan-50 to-white',
    border: 'border-cyan-300',
    glow: 'shadow-cyan-100',
    text: 'text-cyan-700',
    ring: 'ring-cyan-300/60',
  },
  purple: {
    gradient: 'from-purple-50 to-white',
    border: 'border-purple-300',
    glow: 'shadow-purple-100',
    text: 'text-purple-700',
    ring: 'ring-purple-300/60',
  },
  amber: {
    gradient: 'from-amber-50 to-white',
    border: 'border-amber-300',
    glow: 'shadow-amber-100',
    text: 'text-amber-700',
    ring: 'ring-amber-300/60',
  },
  rose: {
    gradient: 'from-rose-50 to-white',
    border: 'border-rose-300',
    glow: 'shadow-rose-100',
    text: 'text-rose-700',
    ring: 'ring-rose-300/60',
  },
  blue: {
    gradient: 'from-blue-50 to-white',
    border: 'border-blue-300',
    glow: 'shadow-blue-100',
    text: 'text-blue-700',
    ring: 'ring-blue-300/60',
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
  headerExtra,
  downloadable = false,
  downloadTitle,
}) => {
  const colors = accentColorClasses[accentColor];
  const contentRef = useRef<HTMLDivElement>(null);
  const [dlState, setDlState] = useState<'idle' | 'loading' | 'error'>('idle');

  const handleDownload = useCallback(async () => {
    const el = contentRef.current;
    if (!el) return;
    const svg = el.querySelector('svg');
    if (!svg) { setDlState('error'); setTimeout(() => setDlState('idle'), 2000); return; }
    setDlState('loading');
    try {
      const rect = svg.getBoundingClientRect();
      const w = Math.max(rect.width, 400);
      const h = Math.max(rect.height, 200);
      const clone = svg.cloneNode(true) as SVGElement;
      clone.setAttribute('width', String(w));
      clone.setAttribute('height', String(h));
      const svgStr = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const fname = `${(downloadTitle || title).replace(/[^a-z0-9áéíóúñ]/gi, '_').toLowerCase()}`;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = w * dpr; canvas.height = h * dpr;
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.scale(dpr, dpr); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h); }
        URL.revokeObjectURL(svgUrl);
        canvas.toBlob(blob => {
          if (!blob) return;
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${fname}.png`; a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          setDlState('idle');
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml' })); a.download = `${fname}.svg`; a.click();
        setDlState('idle');
      };
      img.src = svgUrl;
    } catch { setDlState('error'); setTimeout(() => setDlState('idle'), 2000); }
  }, [title, downloadTitle]);

  return (
    <div
      className={`
        group relative overflow-hidden rounded-2xl
        bg-white
        border ${isActive ? colors.border : 'border-gray-200'}
        shadow-sm ${isActive ? colors.glow : 'shadow-gray-100'}
        ${isActive ? `ring-1 ${colors.ring}` : ''}
        transition-all duration-300
        hover:border-gray-300 hover:shadow-md
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
            <div className={`p-2 rounded-lg bg-gray-100 ${colors.text}`}>
              {icon}
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {headerExtra && <div className="flex items-center mr-1">{headerExtra}</div>}
          {downloadable && (
            <button
              onClick={handleDownload}
              title={dlState === 'loading' ? 'Descargando…' : dlState === 'error' ? 'Sin gráfico exportable' : 'Descargar imagen'}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-all opacity-0 group-hover:opacity-100 duration-200"
            >
              {dlState === 'loading' ? (
                <svg className="w-4 h-4 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : dlState === 'error' ? (
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          )}
          {onRefreshClick && (
            <button
              onClick={onRefreshClick}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Actualizar"
            >
              <svg
                className={`w-4 h-4 text-gray-400 hover:text-gray-600 ${isLoading ? 'animate-spin' : ''}`}
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
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Expandir"
            >
              <svg
                className="w-4 h-4 text-gray-400 hover:text-gray-600"
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
      <div ref={contentRef} className="relative flex-1 p-4 pt-2">
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
        <div className="relative px-4 py-3 border-t border-gray-100">
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
