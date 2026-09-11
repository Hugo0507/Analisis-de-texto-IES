/**
 * Tests de las utilidades de descarga y CSV.
 *
 * Son funciones pequenas pero con dos detalles faciles de romper al
 * refactorizar: el BOM que Excel necesita para los acentos y el anexado al
 * DOM que Firefox exige antes del click.
 */

import { downloadBlob, downloadFile, escapeCsvField, buildCsv } from '../download';

describe('escapeCsvField', () => {
  it('deja el valor tal cual cuando no necesita comillas', () => {
    expect(escapeCsvField('transformacion')).toBe('transformacion');
    expect(escapeCsvField(42)).toBe('42');
  });

  it('entrecomilla cuando hay una coma', () => {
    expect(escapeCsvField('digital, educacion')).toBe('"digital, educacion"');
  });

  it('duplica las comillas internas', () => {
    expect(escapeCsvField('el termino "digital"')).toBe('"el termino ""digital"""');
  });

  it('entrecomilla cuando hay un salto de linea', () => {
    expect(escapeCsvField('linea1\nlinea2')).toBe('"linea1\nlinea2"');
  });

  it('convierte null y undefined en cadena vacia', () => {
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
  });
});

describe('buildCsv', () => {
  it('une cabeceras y filas con saltos de linea', () => {
    const csv = buildCsv(['termino', 'frecuencia'], [['digital', 10], ['educacion', 5]]);

    expect(csv).toBe('termino,frecuencia\ndigital,10\neducacion,5');
  });

  it('escapa tambien las cabeceras', () => {
    const csv = buildCsv(['termino, principal'], [['digital']]);

    expect(csv.split('\n')[0]).toBe('"termino, principal"');
  });

  it('produce solo la cabecera cuando no hay filas', () => {
    expect(buildCsv(['a', 'b'], [])).toBe('a,b');
  });
});

describe('downloadFile', () => {
  const RealBlob = global.Blob;
  let createdAnchor: HTMLAnchorElement;
  let clickSpy: jest.Mock;
  let blobContent: string;

  beforeEach(() => {
    blobContent = '';
    clickSpy = jest.fn();

    // jsdom no implementa Blob.text(), asi que interceptamos el constructor
    // para quedarnos con lo que recibe.
    const blobSpy: any = jest.fn((parts: any[], opts: any) => {
      blobContent = (parts || []).map(String).join('');
      return new RealBlob(parts, opts);
    });
    (global as any).Blob = blobSpy;

    (window.URL.createObjectURL as any) = jest.fn(() => 'blob:mock-url');
    (window.URL.revokeObjectURL as any) = jest.fn();

    const realCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: any) => {
      const el = realCreate(tag);
      if (tag === 'a') {
        createdAnchor = el as HTMLAnchorElement;
        (el as HTMLAnchorElement).click = clickSpy;
      }
      return el;
    });
  });

  afterEach(() => {
    (global as any).Blob = RealBlob;
    jest.restoreAllMocks();
  });

  it('asigna el nombre de archivo al enlace y lo pulsa', () => {
    downloadFile('contenido', 'reporte.txt', 'text/plain');

    expect(createdAnchor.download).toBe('reporte.txt');
    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('antepone el BOM UTF-8 en los CSV para que Excel respete los acentos', () => {
    downloadFile('termino,frecuencia', 'datos.csv', 'text/csv');

    expect(blobContent.startsWith('﻿')).toBe(true);
  });

  it('no antepone BOM cuando no es CSV', () => {
    downloadFile('{"a":1}', 'datos.json', 'application/json');

    expect(blobContent).toBe('{"a":1}');
  });

  it('libera la URL del objeto tras la descarga', () => {
    downloadFile('x', 'a.txt', 'text/plain');

    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('no deja el enlace colgando en el documento', () => {
    downloadFile('x', 'a.txt', 'text/plain');

    expect(document.body.contains(createdAnchor)).toBe(false);
  });
});

describe('downloadBlob', () => {
  it('pasa el blob recibido sin envolverlo ni recrearlo', () => {
    let captured: Blob | undefined;
    (window.URL.createObjectURL as any) = jest.fn((b: Blob) => {
      captured = b;
      return 'blob:mock-url';
    });
    (window.URL.revokeObjectURL as any) = jest.fn();

    const original = new Blob(['datos crudos'], { type: 'application/octet-stream' });
    downloadBlob(original, 'export.xlsx');

    expect(captured).toBe(original);
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });
});
