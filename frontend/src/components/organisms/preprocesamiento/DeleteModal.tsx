/**
 * Confirmacion de borrado de un archivo del dataset.
 */

import React from 'react';
import type { DatasetFile } from '../../../services/datasetsService';
import { TrashIcon } from './icons';

// ─── Delete Confirmation Modal ────────────────────────────────────────────────
export interface DeleteModalProps {
  file: DatasetFile;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({ file, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 max-w-sm w-full mx-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
          <TrashIcon />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Eliminar archivo</h3>
          <p className="text-xs text-gray-500">Esta acción no se puede deshacer</p>
        </div>
      </div>
      <p className="text-sm text-gray-700 mb-5 bg-gray-50 rounded-lg p-3 font-mono break-all">
        {file.original_filename}
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-600 transition-colors"
        >
          Eliminar
        </button>
      </div>
    </div>
  </div>
);
