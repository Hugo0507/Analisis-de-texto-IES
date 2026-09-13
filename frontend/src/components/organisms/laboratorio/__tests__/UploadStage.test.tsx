/**
 * El Laboratorio rechaza los documentos que no estan en el idioma del corpus.
 * Estas pruebas fijan que la pantalla de subida lo avise antes de subir.
 */

// Clientes HTTP simulados, igual que en services/__tests__/listServices.test.ts:
// sin la factory, jest carga axios v1 (modulo ES) y react-scripts no lo
// transforma. Se simula solo el cliente, no los servicios, para que
// LANGUAGE_NAMES siga siendo el real.
const clienteSimulado = () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
});
jest.mock('../../../../services/api', () => clienteSimulado());
jest.mock('../../../../services/publicApi', () => clienteSimulado());

import { render, screen } from '@testing-library/react';
import { UploadStage, avisoIdioma } from '../UploadStage';

describe('avisoIdioma', () => {
  it('nombra el idioma del corpus cuando se conoce', () => {
    expect(avisoIdioma('en')).toMatch(/inglés/);
  });

  it('usa el codigo en mayusculas si el idioma no esta en la tabla', () => {
    expect(avisoIdioma('xx')).toMatch(/xx/i);
  });

  it('da un aviso generico si no se conoce el idioma', () => {
    expect(avisoIdioma(null)).toMatch(/mismo idioma del corpus/);
  });
});

describe('UploadStage', () => {
  it('muestra el aviso de idioma antes de subir documentos', () => {
    render(<UploadStage workspaceId="ws-1" onNext={() => {}} onBack={() => {}} corpusLanguage="en" />);
    expect(screen.getByTestId('aviso-idioma')).toHaveTextContent(/inglés/);
  });
});
