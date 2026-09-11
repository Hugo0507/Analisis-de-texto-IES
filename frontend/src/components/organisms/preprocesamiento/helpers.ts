/**
 * Formateo de nombres, tamanos, extensiones y directorios de archivo.
 */

import type { DatasetFile } from '../../../services/datasetsService';
import { LANGUAGE_NAMES } from '../../../services/dataPreparationService';

// ─── Helpers ────────────────────────────────────────────────────────────────
export const getLanguageName = (code: string): string =>
  LANGUAGE_NAMES[code]?.name || code.toUpperCase();

export const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const getFileExtension = (filename: string) =>
  filename.split('.').pop()?.toLowerCase() || 'unknown';

/**
 * FIX: Extract directory using directory_name first.
 * The backend groups files by directory_name in DirectoryStats,
 * so matching on directory_name avoids the directory_path root-split mismatch.
 */

export const getFileDirectory = (f: DatasetFile): string =>
  f.directory_name || f.directory_path?.split('/').filter(Boolean)[0] || 'root';
