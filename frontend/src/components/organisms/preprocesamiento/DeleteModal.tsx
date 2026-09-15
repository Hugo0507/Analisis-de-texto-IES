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
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="titulo-eliminar-archivo">
    <div className="bg-ink-900 rounded-2xl shadow-2xl shadow-black/50 border border-ink-600 p-6 max-w-sm w-full mx-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-stage-lab/10 text-stage-lab flex items-center justify-center flex-shrink-0">
          <TrashIcon />
        </div>
        <div>
          <h3 id="titulo-eliminar-archivo" className="font-display text-base font-semibold text-paper">Eliminar archivo</h3>
          <p className="text-xs text-mist">Esta acción no se puede deshacer.</p>
        </div>
      </div>
      <p className="text-sm text-haze mb-5 bg-ink-850 border border-ink-700 rounded-lg p-3 font-mono break-all">
        {file.original_filename}
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-sm font-medium text-paper bg-ink-850 border border-ink-600 rounded-xl hover:bg-ink-800 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-xl hover:bg-rose-500 transition-colors"
        >
          Eliminar
        </button>
      </div>
    </div>
  </div>
);
