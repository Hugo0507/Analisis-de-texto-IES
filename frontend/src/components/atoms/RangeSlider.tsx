/**
 * RangeSlider - Dual-handle range slider component
 *
 * Used for selecting date ranges or numeric ranges in filters.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

export interface RangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  step?: number;
  formatLabel?: (value: number) => string;
  className?: string;
  disabled?: boolean;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  value,
  onChange,
  step = 1,
  formatLabel = (v) => v.toString(),
  className = '',
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const getPercentage = (val: number) => ((val - min) / (max - min)) * 100;

  const getValueFromPosition = useCallback(
    (clientX: number): number => {
      if (!trackRef.current) return min;
      const rect = trackRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const rawValue = min + percentage * (max - min);
      return Math.round(rawValue / step) * step;
    },
    [min, max, step]
  );

  const handleMouseDown = (handle: 'min' | 'max') => (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    setIsDragging(handle);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || disabled) return;
      const newValue = getValueFromPosition(e.clientX);

      if (isDragging === 'min') {
        onChange([Math.min(newValue, value[1] - step), value[1]]);
      } else {
        onChange([value[0], Math.max(newValue, value[0] + step)]);
      }
    },
    [isDragging, disabled, getValueFromPosition, onChange, value, step]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
    return undefined;
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const minPercent = getPercentage(value[0]);
  const maxPercent = getPercentage(value[1]);

  return (
    <div className={`w-full ${className}`}>
      {/* Labels */}
      <div className="flex justify-between mb-2 text-xs text-slate-400">
        <span>{formatLabel(value[0])}</span>
        <span>{formatLabel(value[1])}</span>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className={`relative h-2 bg-slate-700 rounded-full ${disabled ? 'opacity-50' : ''}`}
      >
        {/* Active range */}
        <div
          className="absolute h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        />

        {/* Min handle */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-emerald-500 cursor-grab ${
            isDragging === 'min' ? 'cursor-grabbing scale-110' : ''
          } ${disabled ? 'cursor-not-allowed' : ''} transition-transform`}
          style={{ left: `calc(${minPercent}% - 8px)` }}
          onMouseDown={handleMouseDown('min')}
        />

        {/* Max handle */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-cyan-500 cursor-grab ${
            isDragging === 'max' ? 'cursor-grabbing scale-110' : ''
          } ${disabled ? 'cursor-not-allowed' : ''} transition-transform`}
          style={{ left: `calc(${maxPercent}% - 8px)` }}
          onMouseDown={handleMouseDown('max')}
        />
      </div>

      {/* Min/Max labels */}
      <div className="flex justify-between mt-1 text-xs text-slate-500">
        <span>{formatLabel(min)}</span>
        <span>{formatLabel(max)}</span>
      </div>
    </div>
  );
};
