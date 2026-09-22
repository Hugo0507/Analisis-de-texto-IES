/**
 * Secciones del dashboard público y su identidad visual.
 *
 * Preprocesamiento → Vectorización → Modelado → Clasificación son etapas en
 * orden: cada una usa lo que produjo la anterior (Clasificación entrena la
 * LSTM sobre los temas o factores OE3 de Modelado), por eso llevan índice.
 * Laboratorio aplica los modelos a PDFs nuevos y Resumen sintetiza el OE3; no
 * son etapas de la secuencia y se muestran aparte, sin índice.
 *
 * Cada sección tiene un tono propio (colores `stage-*` de tailwind.config.js).
 * Las clases van escritas completas para que Tailwind las incluya en el CSS.
 */

export type StageKey = 'prep' | 'vec' | 'mod' | 'cls' | 'lab' | 'sum';

export interface DashboardStage {
  key: StageKey;
  path: string;
  label: string;
  /** Índice en el pipeline ("01"…); ausente en las secciones fuera de la secuencia. */
  index?: string;
  /** Texto corto sobre el título de la página. */
  eyebrow: string;
  end?: boolean;
  tone: {
    text: string;
    activeTab: string;
    rule: string;
    dot: string;
  };
}

export const DASHBOARD_STAGES: DashboardStage[] = [
  {
    key: 'prep',
    path: '/dashboard',
    label: 'Preprocesamiento',
    index: '01',
    eyebrow: 'Etapa 01',
    end: true,
    tone: {
      text: 'text-stage-prep',
      activeTab: 'bg-ink-800 ring-1 ring-stage-prep/40',
      rule: 'via-stage-prep/60',
      dot: 'bg-stage-prep',
    },
  },
  {
    key: 'vec',
    path: '/dashboard/vectorizacion',
    label: 'Vectorización',
    index: '02',
    eyebrow: 'Etapa 02',
    tone: {
      text: 'text-stage-vec',
      activeTab: 'bg-ink-800 ring-1 ring-stage-vec/40',
      rule: 'via-stage-vec/60',
      dot: 'bg-stage-vec',
    },
  },
  {
    key: 'mod',
    path: '/dashboard/modelado',
    label: 'Modelado',
    index: '03',
    eyebrow: 'Etapa 03',
    tone: {
      text: 'text-stage-mod',
      activeTab: 'bg-ink-800 ring-1 ring-stage-mod/40',
      rule: 'via-stage-mod/60',
      dot: 'bg-stage-mod',
    },
  },
  {
    key: 'cls',
    path: '/dashboard/clasificacion',
    label: 'Clasificación',
    index: '04',
    eyebrow: 'Etapa 04',
    tone: {
      text: 'text-stage-cls',
      activeTab: 'bg-ink-800 ring-1 ring-stage-cls/40',
      rule: 'via-stage-cls/60',
      dot: 'bg-stage-cls',
    },
  },
  {
    key: 'lab',
    path: '/dashboard/laboratorio',
    label: 'Laboratorio',
    eyebrow: 'Aplicación de los modelos',
    tone: {
      text: 'text-stage-lab',
      activeTab: 'bg-ink-800 ring-1 ring-stage-lab/40',
      rule: 'via-stage-lab/60',
      dot: 'bg-stage-lab',
    },
  },
  {
    key: 'sum',
    path: '/dashboard/resumen',
    label: 'Resumen',
    eyebrow: 'Síntesis · OE3',
    tone: {
      text: 'text-stage-sum',
      activeTab: 'bg-ink-800 ring-1 ring-stage-sum/40',
      rule: 'via-stage-sum/60',
      dot: 'bg-stage-sum',
    },
  },
];

export const STAGE_BY_KEY: Record<StageKey, DashboardStage> = DASHBOARD_STAGES.reduce(
  (acc, stage) => ({ ...acc, [stage.key]: stage }),
  {} as Record<StageKey, DashboardStage>,
);

/** Sección correspondiente a una ruta del dashboard. */
export function stageForPath(pathname: string): DashboardStage {
  const normalizada = pathname.replace(/\/+$/, '');
  return (
    DASHBOARD_STAGES.find((s) => !s.end && normalizada.startsWith(s.path)) ??
    STAGE_BY_KEY.prep
  );
}
