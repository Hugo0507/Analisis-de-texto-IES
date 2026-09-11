/**
 * Tipos del dashboard de Preprocesamiento.
 */


// ─── File Entry for cross-filtering ─────────────────────────────────────────
export interface FileEntry {
  directory: string;
  extension: string;
  language: string | null;
  size: number;
}

export const FILES_PER_PAGE = 12;
