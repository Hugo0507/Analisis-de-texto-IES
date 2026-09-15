/**
 * Etapa de procesamiento: sondea el estado del workspace.
 */

import React, { useState, useEffect, useRef } from 'react';
import publicWorkspaceService, {
  Workspace,
} from '../../../services/publicWorkspaceService';


export interface ProcessingStageProps {
  workspaceId: string;
  onDone: (workspace: Workspace) => void;
  /** Recibe el motivo concreto del fallo para que el Laboratorio lo muestre. */
  onError: (message: string) => void;
}

export const POLL_INTERVAL_MS = 2500;

export const MAX_POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

// Pasos del pipeline de inferencia (umbral superior de cada paso)

export const PIPELINE_STEPS = [
  { label: 'Extrayendo texto de los PDFs',   maxPct: 20  },
  { label: 'Validando idioma',               maxPct: 30  },
  { label: 'Preparando inferencia',          maxPct: 40  },
  { label: 'Bolsa de Palabras',              maxPct: 55  },
  { label: 'TF-IDF',                         maxPct: 65  },
  { label: 'Asignando temas',               maxPct: 75  },
  { label: 'Entidades NER',                  maxPct: 88  },
  { label: 'Similitud BERTopic',             maxPct: 99  },
  { label: 'Completado',                     maxPct: 100 },
];

export const ProcessingStage: React.FC<ProcessingStageProps> = ({ workspaceId, onDone, onError }) => {
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    // Kick off inference
    publicWorkspaceService.runInference(workspaceId).catch(() => {
      const mensaje = 'No se pudo iniciar la inferencia. Intenta de nuevo.';
      setErrorMsg(mensaje);
      onError(mensaje);
    });

    // Poll for status with timeout
    intervalRef.current = setInterval(async () => {
      const elapsedMs = Date.now() - startTimeRef.current;
      setElapsed(Math.floor(elapsedMs / 1000));

      // Timeout — dejar de hacer polling
      if (elapsedMs > MAX_POLL_TIMEOUT_MS) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        const mensaje =
          'La inferencia excedió el tiempo máximo de 5 minutos. '
          + 'El servidor puede estar sobrecargado. Intenta de nuevo más tarde.';
        setErrorMsg(mensaje);
        onError(mensaje);
        return;
      }

      try {
        const ws = await publicWorkspaceService.getWorkspace(workspaceId);
        setProgress(ws.progress_percentage);

        if (ws.status === 'completed') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          onDone(ws);
        } else if (ws.status === 'error') {
          if (intervalRef.current) clearInterval(intervalRef.current);
          const mensaje = ws.error_message || 'Ocurrió un error durante la inferencia.';
          setErrorMsg(mensaje);
          onError(mensaje);
        }
      } catch {
        // Polling error — seguir intentando (puede ser un blip de red)
      }
    }, POLL_INTERVAL_MS);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [workspaceId]);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  // Determinar qué paso está activo según el progreso actual
  const activeStepIdx = PIPELINE_STEPS.findIndex(s => progress < s.maxPct);

  return (
    <div className="py-8 flex flex-col sm:flex-row items-center sm:items-start gap-8 sm:gap-10 justify-center">

      {/* Círculo de progreso */}
      <div className="flex flex-col items-center gap-3 shrink-0">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={errorMsg ? '#ef4444' : '#8b5cf6'} strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
              style={{ transition: 'stroke-dashoffset 0.4s ease' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
            {progress}%
          </span>
        </div>

        {errorMsg ? (
          <div className="text-center max-w-[200px]">
            <p className="text-red-400 font-semibold text-sm">Error en la inferencia</p>
            <p className="text-red-300 text-xs mt-1">{errorMsg}</p>
          </div>
        ) : (
          <p className="text-mist text-xs text-center">
            {formatElapsed(elapsed)}
          </p>
        )}
      </div>

      {/* Pasos del pipeline */}
      {!errorMsg && (
        <div className="w-full sm:w-auto space-y-2 max-w-xs">
          <p className="text-xs font-semibold text-mist uppercase tracking-wider mb-3">
            Pipeline de inferencia
          </p>
          {PIPELINE_STEPS.map((step, i) => {
            const done   = progress >= step.maxPct;
            const active = !done && i === activeStepIdx;
            return (
              <div key={i} className="flex items-center gap-3">
                {/* Indicador */}
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  done   ? 'bg-emerald-500/20 border border-emerald-500/60' :
                  active ? 'bg-violet-500/20 border border-violet-400'      :
                           'bg-ink-850 border border-ink-700'
                }`}>
                  {done ? (
                    <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : active ? (
                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-700" />
                  )}
                </div>
                {/* Label */}
                <span className={`text-sm transition-colors ${
                  done   ? 'text-emerald-400' :
                  active ? 'text-white font-medium' :
                           'text-fog'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Mensaje de error expandido en mobile */}
      {errorMsg && (
        <div className="w-full max-w-sm sm:hidden p-4 rounded-xl bg-red-500/10 border border-red-500/30">
          <p className="text-red-400 font-semibold text-sm">Error en la inferencia</p>
          <p className="text-red-300 text-sm mt-1">{errorMsg}</p>
        </div>
      )}
    </div>
  );
};

// ── BoW Word Cloud ─────────────────────────────────────────────────────────────
