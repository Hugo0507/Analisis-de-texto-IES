/**
 * MultiSelect - Multi-selection dropdown/chips component
 *
 * Displays selected items as chips and provides a dropdown for selection.
 */

import React, { useState, useRef, useEffect } from 'react';

export interface MultiSelectOption {
  value: string | number;
  label: string;
  count?: number;
  color?: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  showChips?: boolean;
  maxChipsVisible?: number;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  label,
  disabled = false,
  className = '',
  showChips = true,
  maxChipsVisible = 3,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (optionValue: string | number) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const removeOption = (optionValue: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optionValue));
  };

  const selectedOptions = options.filter((opt) => value.includes(opt.value));
  const visibleChips = selectedOptions.slice(0, maxChipsVisible);
  const hiddenCount = selectedOptions.length - maxChipsVisible;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>}

      {/* Trigger button */}
      <div
        className={`
          flex flex-wrap items-center gap-1 min-h-[40px] p-2
          bg-slate-800/50 border border-slate-600/50 rounded-lg
          cursor-pointer transition-all duration-200
          ${isOpen ? 'ring-2 ring-emerald-500/50 border-emerald-500/50' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-500'}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {showChips && visibleChips.length > 0 ? (
          <>
            {visibleChips.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              >
                {opt.label}
                <button
                  type="button"
                  className="hover:text-emerald-300"
                  onClick={(e) => removeOption(opt.value, e)}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            {hiddenCount > 0 && (
              <span className="text-xs text-slate-400">+{hiddenCount} más</span>
            )}
          </>
        ) : (
          <span className="text-slate-400 text-sm">{placeholder}</span>
        )}

        {/* Dropdown arrow */}
        <svg
          className={`ml-auto w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600/50 rounded-lg shadow-xl overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-slate-700">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full px-3 py-1.5 text-sm bg-slate-700/50 border border-slate-600/50 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-slate-400">No se encontraron resultados</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value.includes(opt.value);
                return (
                  <div
                    key={opt.value}
                    className={`
                      flex items-center justify-between px-3 py-2 cursor-pointer transition-colors
                      ${isSelected ? 'bg-emerald-500/10' : 'hover:bg-slate-700/50'}
                    `}
                    onClick={() => toggleOption(opt.value)}
                  >
                    <div className="flex items-center gap-2">
                      {/* Checkbox */}
                      <div
                        className={`
                          w-4 h-4 rounded border flex items-center justify-center transition-colors
                          ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500'}
                        `}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {opt.label}
                      </span>
                    </div>
                    {opt.count !== undefined && (
                      <span className="text-xs text-slate-500">{opt.count}</span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Actions */}
          {value.length > 0 && (
            <div className="p-2 border-t border-slate-700">
              <button
                type="button"
                className="text-xs text-slate-400 hover:text-slate-300"
                onClick={() => onChange([])}
              >
                Limpiar selección
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
