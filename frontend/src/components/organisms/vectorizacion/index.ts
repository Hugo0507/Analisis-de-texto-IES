/**
 * Componentes del dashboard de Vectorizacion.
 *
 * Extraidos de VectorizacionDashboard.tsx, que los definia en linea y
 * superaba las 2.500 lineas. Cada uno recibe sus datos por props y no sabe
 * nada de fetching.
 */

export * from './types';
export * from './icons';
export { SimpleWordCloud } from './SimpleWordCloud';
export { VocabularyTable } from './VocabularyTable';
export { HorizontalBarChart } from './HorizontalBarChart';
export { TfIdfScatter } from './TfIdfScatter';
export { TermHeatmap } from './TermHeatmap';
export { CooccurrenceGraph } from './CooccurrenceGraph';
export { ComparacionView } from './ComparacionView';
export { WordDetailPanel } from './WordDetailPanel';
export { ExportModal } from './ExportModal';
export * from './exports';
