/**
 * Tipos y etapas del flujo del Laboratorio.
 */


export type Stage = 'configure' | 'upload' | 'processing' | 'results';

export interface AnalysisOption {
  id: number;
  name: string;
  label?: string;
  selectedEntities?: string[];
}

// ── Stage indicator ───────────────────────────────────────────────────────────

export const STAGES: { key: Stage; label: string }[] = [
  { key: 'configure', label: 'Configurar' },
  { key: 'upload', label: 'Subir PDFs' },
  { key: 'processing', label: 'Procesar' },
  { key: 'results', label: 'Resultados' },
];
