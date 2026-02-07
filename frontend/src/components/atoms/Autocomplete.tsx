/**
 * Autocomplete - Search input with suggestions
 *
 * Used for searching within the dashboard filters.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface AutocompleteOption {
  value: string;
  label: string;
  type?: string;
  icon?: React.ReactNode;
}

export interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (option: AutocompleteOption) => void;
  options?: AutocompleteOption[];
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  debounceMs?: number;
  loading?: boolean;
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  options = [],
  placeholder = 'Buscar...',
  label,
  disabled = false,
  className = '',
  debounceMs = 300,
  loading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Sync external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

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

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      setIsOpen(true);
      setHighlightedIndex(-1);

      // Debounce the external onChange
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  const handleSelect = (option: AutocompleteOption) => {
    setLocalValue(option.label);
    onChange(option.value);
    onSelect?.(option);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && options[highlightedIndex]) {
          handleSelect(options[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
    inputRef.current?.focus();
  };

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(localValue.toLowerCase())
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>}

      <div className="relative">
        {/* Search icon */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full pl-10 pr-10 py-2 text-sm
            bg-slate-800/50 border border-slate-600/50 rounded-lg
            text-white placeholder-slate-400
            focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50
            transition-all duration-200
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />

        {/* Loading spinner or clear button */}
        {loading ? (
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : localValue ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>

      {/* Suggestions dropdown */}
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-600/50 rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.map((opt, index) => (
              <div
                key={opt.value}
                className={`
                  flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors
                  ${index === highlightedIndex ? 'bg-emerald-500/10' : 'hover:bg-slate-700/50'}
                `}
                onClick={() => handleSelect(opt)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {opt.icon}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{opt.label}</div>
                  {opt.type && <div className="text-xs text-slate-400">{opt.type}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
