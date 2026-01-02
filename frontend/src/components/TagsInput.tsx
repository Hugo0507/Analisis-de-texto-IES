/**
 * TagsInput Component
 *
 * Input que convierte palabras en chips/tags visuales.
 * - Enter para agregar
 * - X para eliminar
 * - Chips con estilo profesional
 */

import React, { useState, KeyboardEvent, ChangeEvent } from 'react';
import { X } from 'lucide-react';

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  label?: string;
  helperText?: string;
}

export const TagsInput: React.FC<TagsInputProps> = ({
  value = [],
  onChange,
  placeholder = 'Escribe una palabra y presiona Enter',
  maxTags,
  label,
  helperText,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();

      // Validar si ya existe el tag
      if (value.includes(inputValue.trim().toLowerCase())) {
        setInputValue('');
        return;
      }

      // Validar límite de tags
      if (maxTags && value.length >= maxTags) {
        return;
      }

      // Agregar nuevo tag
      onChange([...value, inputValue.trim().toLowerCase()]);
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Eliminar último tag si presiona backspace con input vacío
      onChange(value.slice(0, -1));
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      <div className="relative">
        {/* Container de tags y input */}
        <div className="min-h-[42px] w-full px-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
          <div className="flex flex-wrap gap-2">
            {/* Tags existentes */}
            {value.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium hover:bg-blue-200 transition-colors"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-300 transition-colors"
                  aria-label={`Eliminar ${tag}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {/* Input para nuevos tags */}
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={value.length === 0 ? placeholder : ''}
              disabled={maxTags ? value.length >= maxTags : false}
              className="flex-1 min-w-[120px] outline-none bg-transparent text-sm disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Contador de tags si hay límite */}
        {maxTags && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
            {value.length} / {maxTags}
          </div>
        )}
      </div>

      {/* Helper text */}
      {helperText && (
        <p className="mt-1.5 text-sm text-gray-500">
          {helperText}
        </p>
      )}

      {/* Advertencia si alcanzó el límite */}
      {maxTags && value.length >= maxTags && (
        <p className="mt-1.5 text-sm text-amber-600">
          Has alcanzado el límite de {maxTags} palabras
        </p>
      )}
    </div>
  );
};
