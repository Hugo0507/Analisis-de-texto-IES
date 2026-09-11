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
  { key: 'configure', label: '1. Configurar' },
  { key: 'upload', label: '2. Subir PDFs' },
  { key: 'processing', label: '3. Procesando' },
  { key: 'results', label: '4. Resultados' },
];
