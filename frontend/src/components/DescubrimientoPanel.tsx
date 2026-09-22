/**
 * Panel de descubrimiento automático de artículos (Organism)
 *
 * Busca en OpenAlex literatura sobre el tema de la tesis, muestra los
 * candidatos con su relevancia y disponibilidad de PDF en acceso abierto, y
 * permite descargar en segundo plano los que la investigadora elija.
 *
 * Solo se descargan copias legales en acceso abierto (OpenAlex + Unpaywall);
 * ver services/descubrimiento.py en el backend para el porqué.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { AxiosError } from 'axios';
import { Search, ChevronDown, ChevronUp, ExternalLink, Info, X } from 'lucide-react';
import { Spinner } from './atoms';
import datasetsService, {
  CandidatoDescubrimiento,
  Dataset,
  DescubrirResponse,
} from '../services/datasetsService';

// ─── Helpers ────────────────────────────────────────────────────────────────

const nf = (n: number) => n.toLocaleString('es-ES');

const aTexto = (valor: unknown): string => Array.isArray(valor) ? valor.join(' ') : String(valor);

const extraerMensajeError = (err: unknown, fallback: string): string => {
  const axiosErr = err as AxiosError;
  const data = axiosErr?.response?.data as unknown;
  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object') {
    const registro = data as Record<string, unknown>;
    if (typeof registro.error === 'string') return registro.error;
    if (registro.non_field_errors !== undefined) return aTexto(registro.non_field_errors);
    const primeraClave = Object.keys(registro)[0];
    if (primeraClave) return aTexto(registro[primeraClave]);
  }
  return axiosErr?.message || fallback;
};

const puedeSeleccionarse = (c: CandidatoDescubrimiento) => c.pdf_abierto && !c.duplicado;

// ─── Insignias ──────────────────────────────────────────────────────────────

const Insignias: React.FC<{ candidato: CandidatoDescubrimiento }> = ({ candidato }) => (
  <div className="flex flex-wrap gap-1">
    {candidato.pdf_abierto ? (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        PDF abierto
      </span>
    ) : (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        Sin PDF abierto
      </span>
    )}
    {candidato.duplicado && (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        Ya en el dataset
      </span>
    )}
    {!candidato.relevante && (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
        No relevante
      </span>
    )}
  </div>
);

// ─── Fila de candidato ──────────────────────────────────────────────────────

interface FilaCandidatoProps {
  candidato: CandidatoDescubrimiento;
  seleccionado: boolean;
  onToggle: (id: string) => void;
  expandido: boolean;
  onToggleExpandido: (id: string) => void;
}

const FilaCandidato: React.FC<FilaCandidatoProps> = ({
  candidato, seleccionado, onToggle, expandido, onToggleExpandido,
}) => {
  const disponible = puedeSeleccionarse(candidato);
  const checkboxId = `candidato-${candidato.openalex_id}`;

  return (
    <>
      <tr className={`hover:bg-gray-50 transition-colors ${!disponible ? 'opacity-60' : ''}`}>
        <td className="px-3 py-2.5 align-top">
          <input
            id={checkboxId}
            type="checkbox"
            checked={seleccionado}
            disabled={!disponible}
            onChange={() => onToggle(candidato.openalex_id)}
            aria-label={`Seleccionar "${candidato.titulo || 'artículo sin título'}"`}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500 disabled:opacity-40"
          />
        </td>
        <td className="px-3 py-2.5 max-w-sm align-top">
          <label htmlFor={checkboxId} className={`font-medium text-gray-900 ${disponible ? 'cursor-pointer' : ''}`}>
            {candidato.titulo || <span className="italic text-gray-400">Sin título</span>}
          </label>
          <p className="text-xs text-gray-500 mt-0.5">{candidato.motivo_relevancia}</p>
          {candidato.resumen && (
            <>
              <button
                type="button"
                onClick={() => onToggleExpandido(candidato.openalex_id)}
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
                aria-expanded={expandido}
              >
                {expandido ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {expandido ? 'Ocultar resumen' : 'Mostrar resumen'}
              </button>
              {expandido && (
                <p className="mt-1 text-xs text-gray-600 leading-relaxed">{candidato.resumen}</p>
              )}
            </>
          )}
        </td>
        <td className="px-3 py-2.5 text-center align-top">
          <span className="text-xs font-medium text-gray-700">{candidato.anio ?? '—'}</span>
        </td>
        <td className="px-3 py-2.5 max-w-[160px] align-top">
          <p className="text-xs text-gray-600 truncate" title={candidato.revista}>{candidato.revista || '—'}</p>
        </td>
        <td className="px-3 py-2.5 align-top">
          {candidato.doi ? (
            <a
              href={`https://doi.org/${candidato.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            >
              {candidato.doi}
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
        </td>
        <td className="px-3 py-2.5 align-top">
          <Insignias candidato={candidato} />
        </td>
      </tr>
    </>
  );
};

// ─── Panel principal ────────────────────────────────────────────────────────

export interface DescubrimientoPanelProps {
  datasetId: number;
  dataset: Dataset;
  onRefresh: () => Promise<void>;
  onClose: () => void;
}

export const DescubrimientoPanel: React.FC<DescubrimientoPanelProps> = ({
  datasetId, dataset, onRefresh, onClose,
}) => {
  const [consulta, setConsulta] = useState('');
  const [desdeAnio, setDesdeAnio] = useState('');
  const [hastaAnio, setHastaAnio] = useState('');
  const [maxResultados, setMaxResultados] = useState(50);

  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [resultado, setResultado] = useState<DescubrirResponse | null>(null);

  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const [descargando, setDescargando] = useState(false);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);
  const [seguimiento, setSeguimiento] = useState<{ archivosAntes: number; solicitados: number } | null>(null);
  const [resultadoDescarga, setResultadoDescarga] = useState<{ anadidos: number; solicitados: number } | null>(null);

  const tituloRef = useRef<HTMLHeadingElement>(null);
  const prevStatusRef = useRef(dataset.status);

  // Foco en el título al abrir el panel, para quien navega con teclado o lector de pantalla.
  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  // Detectar el fin de la descarga en segundo plano comparando con el status
  // del dataset, que ya se refresca por polling desde la página contenedora.
  useEffect(() => {
    if (seguimiento && prevStatusRef.current === 'processing' && dataset.status !== 'processing') {
      const anadidos = Math.max(0, dataset.total_files - seguimiento.archivosAntes);
      setResultadoDescarga({ anadidos, solicitados: seguimiento.solicitados });
      setSeguimiento(null);
    }
    prevStatusRef.current = dataset.status;
  }, [dataset.status, dataset.total_files, seguimiento]);

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBusqueda(null);
    setResultadoDescarga(null);
    setBuscando(true);
    try {
      const data = await datasetsService.descubrirCandidatos(datasetId, {
        consulta: consulta.trim() || undefined,
        desde_anio: desdeAnio ? Number(desdeAnio) : undefined,
        hasta_anio: hastaAnio ? Number(hastaAnio) : undefined,
        max_resultados: maxResultados,
      });
      setResultado(data);
      setExpandidos(new Set());
      setSeleccionados(new Set(
        data.candidatos
          .filter(c => c.relevante && c.pdf_abierto && !c.duplicado)
          .map(c => c.openalex_id),
      ));
    } catch (err: unknown) {
      setResultado(null);
      const status = (err as AxiosError)?.response?.status;
      setErrorBusqueda(extraerMensajeError(
        err,
        status === 502
          ? 'No se pudo consultar OpenAlex. Inténtalo de nuevo en unos minutos.'
          : 'No se pudo completar la búsqueda.',
      ));
    } finally {
      setBuscando(false);
    }
  };

  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id); else siguiente.add(id);
      return siguiente;
    });
  };

  const toggleExpandido = (id: string) => {
    setExpandidos(prev => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id); else siguiente.add(id);
      return siguiente;
    });
  };

  const seleccionarDescargables = () => {
    if (!resultado) return;
    setSeleccionados(new Set(resultado.candidatos.filter(puedeSeleccionarse).map(c => c.openalex_id)));
  };

  const quitarSeleccion = () => setSeleccionados(new Set());

  const handleDescargar = async () => {
    if (!resultado || seleccionados.size === 0) return;
    setErrorDescarga(null);
    setDescargando(true);
    try {
      const ids = Array.from(seleccionados);
      const resp = await datasetsService.descargarCandidatos(datasetId, ids);
      prevStatusRef.current = dataset.status; // 'processing' llega en el próximo refresh
      setSeguimiento({ archivosAntes: resp.archivos_antes, solicitados: resp.solicitados });
      setResultadoDescarga(null);
      await onRefresh();
    } catch (err: unknown) {
      setErrorDescarga(extraerMensajeError(err, 'No se pudo iniciar la descarga.'));
    } finally {
      setDescargando(false);
    }
  };

  const totalDescargables = useMemo(
    () => resultado?.candidatos.filter(puedeSeleccionarse).length ?? 0,
    [resultado],
  );

  const metaSeguimiento = seguimiento ? seguimiento.archivosAntes + seguimiento.solicitados : 0;
  const enSeguimiento = Boolean(seguimiento);

  return (
    <div className="bg-white rounded-2xl border border-emerald-100" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {/* Encabezado del panel */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h2
          ref={tituloRef}
          tabIndex={-1}
          className="text-sm font-semibold text-gray-900 focus:outline-none"
        >
          Buscar artículos en acceso abierto
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar panel de búsqueda"
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Nota legal */}
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            Solo se descargan copias legales en acceso abierto, a través de OpenAlex y Unpaywall.
          </p>
        </div>

        {/* Formulario de búsqueda */}
        <form onSubmit={handleBuscar} className="space-y-3">
          <div>
            <label htmlFor="descubrimiento-consulta" className="block text-xs font-medium text-gray-700 mb-1">
              Consulta
            </label>
            <input
              id="descubrimiento-consulta"
              type="text"
              value={consulta}
              onChange={e => setConsulta(e.target.value)}
              placeholder="Vacía: usa el tema de la tesis (transformación digital en educación superior)"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="descubrimiento-desde" className="block text-xs font-medium text-gray-700 mb-1">
                Año desde
              </label>
              <input
                id="descubrimiento-desde"
                type="number"
                value={desdeAnio}
                onChange={e => setDesdeAnio(e.target.value)}
                min={1900}
                max={2100}
                placeholder="2018"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="descubrimiento-hasta" className="block text-xs font-medium text-gray-700 mb-1">
                Año hasta
              </label>
              <input
                id="descubrimiento-hasta"
                type="number"
                value={hastaAnio}
                onChange={e => setHastaAnio(e.target.value)}
                min={1900}
                max={2100}
                placeholder="2026"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="descubrimiento-max" className="block text-xs font-medium text-gray-700 mb-1">
                Máximo de resultados
              </label>
              <input
                id="descubrimiento-max"
                type="number"
                value={maxResultados}
                onChange={e => setMaxResultados(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
                min={1}
                max={200}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={buscando}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
          >
            {buscando ? <Spinner size="sm" /> : <Search className="w-4 h-4" />}
            Buscar
          </button>
        </form>

        {/* Estado: buscando */}
        <div aria-live="polite" role="status">
          {buscando && (
            <p className="text-sm text-gray-500 flex items-center gap-2">
              <Spinner size="sm" /> Buscando en OpenAlex…
            </p>
          )}
          {errorBusqueda && !buscando && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <p className="text-sm text-red-700">{errorBusqueda}</p>
            </div>
          )}
        </div>

        {/* Resultado de la descarga */}
        {resultadoDescarga && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5" aria-live="polite" role="status">
            <p className="text-sm text-emerald-800">
              Se añadieron {nf(resultadoDescarga.anadidos)} de {nf(resultadoDescarga.solicitados)} artículos solicitados.
              Algunos pueden no descargarse porque la editorial bloquea la descarga directa del PDF.
            </p>
          </div>
        )}

        {/* Progreso de la descarga en curso */}
        {enSeguimiento && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 flex items-center gap-3" aria-live="polite" role="status">
            <Spinner size="sm" />
            <p className="text-sm text-blue-800">
              Descargando en segundo plano… {nf(dataset.total_files)} de {nf(metaSeguimiento)} artículos en el dataset.
            </p>
          </div>
        )}

        {errorDescarga && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            <p className="text-sm text-red-700">{errorDescarga}</p>
          </div>
        )}

        {/* Resumen y tabla de resultados */}
        {resultado && !buscando && (
          <div className="space-y-3">
            {/* Resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-live="polite">
              {[
                { label: 'Total encontrados', value: resultado.total, bg: 'bg-gray-50', color: 'text-gray-900' },
                { label: 'Relevantes', value: resultado.relevantes, bg: 'bg-emerald-50', color: 'text-emerald-700' },
                { label: 'Con PDF abierto', value: resultado.con_pdf_abierto, bg: 'bg-blue-50', color: 'text-blue-700' },
                { label: 'Ya en el dataset', value: resultado.duplicados, bg: 'bg-amber-50', color: 'text-amber-700' },
              ].map(row => (
                <div key={row.label} className={`px-3 py-2 rounded-lg ${row.bg}`}>
                  <p className="text-xs text-gray-600">{row.label}</p>
                  <p className={`text-lg font-bold ${row.color}`}>{nf(row.value)}</p>
                </div>
              ))}
            </div>

            {resultado.candidatos.length === 0 ? (
              <p className="text-sm text-gray-400 italic py-6 text-center">
                No se encontraron artículos con estos criterios. Prueba con otra consulta o un rango de años más amplio.
              </p>
            ) : (
              <>
                {/* Acciones de selección */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={seleccionarDescargables}
                      disabled={totalDescargables === 0}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      Seleccionar todos los descargables ({nf(totalDescargables)})
                    </button>
                    <button
                      type="button"
                      onClick={quitarSeleccion}
                      disabled={seleccionados.size === 0}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                    >
                      Quitar selección
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">{nf(seleccionados.size)} seleccionados</span>
                </div>

                {/* Tabla de candidatos */}
                <div style={{ maxHeight: '420px', overflowY: 'auto' }} className="border border-gray-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr className="border-b border-gray-200">
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase w-8">
                          <span className="sr-only">Seleccionar</span>
                        </th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Título</th>
                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase">Año</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Revista</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">DOI</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {resultado.candidatos.map(candidato => (
                        <FilaCandidato
                          key={candidato.openalex_id}
                          candidato={candidato}
                          seleccionado={seleccionados.has(candidato.openalex_id)}
                          onToggle={toggleSeleccion}
                          expandido={expandidos.has(candidato.openalex_id)}
                          onToggleExpandido={toggleExpandido}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Botón de descarga */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleDescargar}
                    disabled={seleccionados.size === 0 || descargando || enSeguimiento}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500"
                  >
                    {descargando && <Spinner size="sm" />}
                    Descargar {nf(seleccionados.size)} seleccionados
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DescubrimientoPanel;
