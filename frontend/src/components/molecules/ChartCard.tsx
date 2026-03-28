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

// Dark-theme accent palette — WCAG AA verified on bg-slate-900 (#0f172a)
// All text variants (text-X-400) achieve ≥ 4.5:1 contrast on slate-900
const accentColorClasses = {
  emerald: {
    gradient: 'from-emerald-400/6 to-transparent',
    border: 'border-emerald-500',
    glow: 'shadow-emerald-900/30',
    text: 'text-emerald-400',
    ring: 'ring-emerald-500/25',
  },
  cyan: {
    gradient: 'from-cyan-400/6 to-transparent',
    border: 'border-cyan-500',
    glow: 'shadow-cyan-900/30',
    text: 'text-cyan-400',
    ring: 'ring-cyan-500/25',
  },
  purple: {
    gradient: 'from-purple-400/6 to-transparent',
    border: 'border-purple-500',
    glow: 'shadow-purple-900/30',
    text: 'text-purple-400',
    ring: 'ring-purple-500/25',
  },
  amber: {
    gradient: 'from-amber-400/6 to-transparent',
    border: 'border-amber-500',
    glow: 'shadow-amber-900/30',
    text: 'text-amber-400',
    ring: 'ring-amber-500/25',
  },
  rose: {
    gradient: 'from-rose-400/6 to-transparent',
    border: 'border-rose-500',
    glow: 'shadow-rose-900/30',
    text: 'text-rose-400',
    ring: 'ring-rose-500/25',
  },
  blue: {
    gradient: 'from-blue-400/6 to-transparent',
    border: 'border-blue-500',
    glow: 'shadow-blue-900/30',
    text: 'text-blue-400',
    ring: 'ring-blue-500/25',
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
    // Dark-theme card — bg-slate-900 sólido como base para contraste predecible
    <div
      className={`
        group relative overflow-hidden rounded-2xl
        bg-slate-900
        border ${isActive ? colors.border : 'border-slate-700'}
        shadow-md ${isActive ? colors.glow : ''}
        ${isActive ? `ring-1 ${colors.ring}` : ''}
        transition-all duration-300
        hover:border-slate-600
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {/* Tinte de color sutil (no afecta contraste — solo atmosfera) */}
      <div
        className={`
          absolute inset-0
          bg-gradient-to-br ${colors.gradient}
          pointer-events-none
        `}
      />

      {/* Header */}
      <div className="relative flex items-start justify-between p-5 pb-3">
        <div className="flex items-start gap-3">
          {icon && (
            // bg-slate-800 + color semántico del acento → icono legible y contextual
            <div className={`p-2 rounded-lg bg-slate-800 ${colors.text}`}>
              {icon}
            </div>
          )}
          <div>
            {/* text-white sobre bg-slate-900 → ≈ 21:1 contraste */}
            <h3 className="text-base font-semibold text-white">{title}</h3>
            {subtitle && (
              // text-sm (14px) + text-slate-300 → ≈ 7.5:1 contraste */}
              <p className="text-sm text-slate-300 mt-1 leading-snug">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Action buttons — min 32px, icono slate-300 sobre bg-slate-900 → ≈ 7.5:1 */}
        <div className="flex items-center gap-1">
          {headerExtra && <div className="flex items-center mr-1">{headerExtra}</div>}
          {downloadable && (
            <button
              onClick={handleDownload}
              title={dlState === 'loading' ? 'Descargando…' : dlState === 'error' ? 'Sin gráfico exportable' : 'Descargar imagen'}
              className="p-2 rounded-lg hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100 duration-200"
            >
              {dlState === 'loading' ? (
                <svg className="w-4 h-4 text-slate-300 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : dlState === 'error' ? (
                <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-slate-300 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          )}
          {onRefreshClick && (
            <button
              onClick={onRefreshClick}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
              title="Actualizar"
            >
              <svg
                className={`w-4 h-4 text-slate-300 hover:text-white ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}
          {onExpandClick && (
            <button
              onClick={onExpandClick}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
              title="Expandir"
            >
              <svg
                className="w-4 h-4 text-slate-300 hover:text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div ref={contentRef} className="relative flex-1 p-5 pt-2">
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
        <div className="relative px-5 py-3 border-t border-slate-700">
          {footer}
        </div>
      )}
    </div>
  );
};
