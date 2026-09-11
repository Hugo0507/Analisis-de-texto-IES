/**
 * Contrato de los servicios de listado.
 *
 * Todos deben devolver un array, venga el backend paginado por DRF
 * ({ count, next, previous, results }) o como array plano. Este contrato ya
 * se rompió una vez: lstmService.list() devolvía res.data directamente y el
 * .map() de la vista reventaba con "analyses.map is not a function"
 * (arreglado en c465c7a).
 *
 * Hoy conviven tres idiomas distintos para resolver lo mismo —`?? res.data`,
 * `|| response.data` y una comprobación explícita de 'results' in data— más
 * dos servicios que devuelven response.data tal cual porque sus ViewSets
 * declaran pagination_class = None. Estos tests fijan el comportamiento de
 * cada uno para que un cambio en cualquiera de los dos lados falle aquí y no
 * en producción.
 */

// Factory explicita: sin ella jest carga el modulo real, que importa axios v1
// (ESM) y react-scripts no transforma node_modules.
jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import apiClient from '../api';
import lstmService from '../lstmService';
import bertopicService from '../bertopicService';
import topicModelingService from '../topicModelingService';
import bagOfWordsService from '../bagOfWordsService';
import ngramAnalysisService from '../ngramAnalysisService';
import tfIdfAnalysisService from '../tfidfAnalysisService';
import nerAnalysisService from '../nerAnalysisService';

const mockGet = apiClient.get as jest.Mock;

const ITEMS = [
  { id: 1, name: 'Analisis uno' },
  { id: 2, name: 'Analisis dos' },
];

/** Respuesta paginada tal como la emite DRF. */
const paginated = (results: unknown[]) => ({
  data: { count: results.length, next: null, previous: null, results },
});

/** Respuesta de un ViewSet con pagination_class = None. */
const plain = (results: unknown[]) => ({ data: results });

beforeEach(() => {
  mockGet.mockReset();
});

/** Servicios cuyo endpoint pagina: deben desenvolver `results`. */
const paginatedServices: Array<[string, () => Promise<unknown[]>, string]> = [
  ['lstmService.list', () => lstmService.list(), '/lstm-analysis/'],
  ['bertopicService.getBERTopicAnalyses', () => bertopicService.getBERTopicAnalyses(), '/bertopic/'],
  ['topicModelingService.getTopicModelings', () => topicModelingService.getTopicModelings(), '/topic-modeling/'],
  ['bagOfWordsService.getBagOfWords', () => bagOfWordsService.getBagOfWords(), '/bag-of-words/'],
  ['ngramAnalysisService.getNgramAnalyses', () => ngramAnalysisService.getNgramAnalyses(), '/ngram-analysis/'],
];

describe('servicios con endpoint paginado', () => {
  describe.each(paginatedServices)('%s', (_name, call, endpoint) => {
    it('desenvuelve results cuando la respuesta viene paginada', async () => {
      mockGet.mockResolvedValue(paginated(ITEMS));

      const result = await call();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(ITEMS);
    });

    it('devuelve el array tal cual si el backend deja de paginar', async () => {
      mockGet.mockResolvedValue(plain(ITEMS));

      const result = await call();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(ITEMS);
    });

    it('conserva la lista vacia en vez de convertirla en el objeto de paginacion', async () => {
      mockGet.mockResolvedValue(paginated([]));

      const result = await call();

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });

    it('consulta el endpoint esperado', async () => {
      mockGet.mockResolvedValue(paginated(ITEMS));

      await call();

      expect(mockGet).toHaveBeenCalledWith(endpoint);
    });
  });
});

/**
 * Estos dos ViewSets declaran pagination_class = None en el backend
 * (apps/tfidf_analysis/views.py y apps/ner_analysis/views.py), asi que la
 * respuesta es siempre un array plano. Si alguien reactiva la paginacion
 * ahi, estos tests siguen pasando pero las vistas romperian: el test que
 * protege ese caso es el de arriba, y habria que mover el servicio a esa
 * lista.
 */
describe('servicios con endpoint sin paginar', () => {
  it('tfIdfAnalysisService.getTfIdfAnalyses devuelve el array plano', async () => {
    mockGet.mockResolvedValue(plain(ITEMS));

    const result = await tfIdfAnalysisService.getTfIdfAnalyses();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(ITEMS);
  });

  it('nerAnalysisService.getNerAnalyses devuelve el array plano', async () => {
    mockGet.mockResolvedValue(plain(ITEMS));

    const result = await nerAnalysisService.getNerAnalyses();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(ITEMS);
  });
});

describe('propagacion de errores', () => {
  it('un fallo de red no se traga: la promesa rechaza', async () => {
    mockGet.mockRejectedValue(new Error('Network Error'));

    await expect(lstmService.list()).rejects.toThrow('Network Error');
  });
});
