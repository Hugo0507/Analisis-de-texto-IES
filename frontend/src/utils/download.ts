/**
 * Descarga de archivos y construcción de CSV.
 *
 * Reúne las variantes que estaban repartidas por los dashboards y los
 * servicios: `downloadFile` en VectorizacionDashboard, `triggerDownload` en
 * GeneralDashboard y `_triggerDownload` duplicado literal en
 * workspaceService y publicWorkspaceService.
 *
 * El anexado al DOM antes del click no es decorativo: Firefox ignora el
 * click sobre un <a> que no está en el documento.
 */

/** Descarga un Blob ya construido, típicamente la respuesta de la API. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Descarga contenido de texto como archivo.
 *
 * A los CSV se les antepone un BOM UTF-8 para que Excel respete los acentos;
 * sin él, "Vectorización" se abre como "VectorizaciÃ³n".
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const bom = mimeType.includes('csv') ? '﻿' : '';
  const blob = new Blob([bom + content], { type: `${mimeType};charset=utf-8;` });
  downloadBlob(blob, filename);
}

/**
 * Escapa un campo para CSV: solo entrecomilla cuando hace falta, es decir
 * cuando el valor contiene una coma, una comilla o un salto de línea.
 */
export function escapeCsvField(value: string | number | null | undefined): string {
  const s = String(value ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

/** Construye un CSV a partir de una fila de cabeceras y las filas de datos. */
export function buildCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][],
): string {
  return [
    headers.map(escapeCsvField).join(','),
    ...rows.map((row) => row.map(escapeCsvField).join(',')),
  ].join('\n');
}
