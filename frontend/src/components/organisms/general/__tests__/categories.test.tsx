/**
 * El Resumen ya no clasifica factores: los toma del backend. Estas pruebas
 * fijan que el helper lea esa clasificacion y que el marco tenga los nombres
 * del informe.
 */

import { FACTOR_CATEGORIES, categoryFromClassification } from '../categories';
import type { TopicClassification } from '../types';

const clasificacion = (topic_id: number, primary_category: string): TopicClassification => ({
  topic_id,
  primary_category,
  primary_category_label: primary_category,
  secondary_category: null,
  confidence_score: 0.1,
  matched_keywords: [],
});

describe('categoryFromClassification', () => {
  it('devuelve la categoria que asigno el backend al tema', () => {
    const lista = [clasificacion(0, 'docencia'), clasificacion(1, 'calidad')];
    expect(categoryFromClassification(lista, 1)).toBe('calidad');
  });

  it('cae en infraestructura si el tema no esta clasificado', () => {
    expect(categoryFromClassification([clasificacion(0, 'docencia')], 7)).toBe('infraestructura');
  });

  it('tolera que el API no traiga clasificaciones', () => {
    expect(categoryFromClassification(null, 0)).toBe('infraestructura');
    expect(categoryFromClassification(undefined, 0)).toBe('infraestructura');
  });
});

describe('FACTOR_CATEGORIES', () => {
  it('usa los mismos seis factores y nombres que el backend y el informe', () => {
    expect(FACTOR_CATEGORIES.map(c => [c.id, c.label])).toEqual([
      ['infraestructura', 'Infraestructura Tecnológica'],
      ['gobernanza', 'Gobernanza y Estrategia'],
      ['docencia', 'Docencia y Formación'],
      ['estudiante', 'Experiencia del Estudiante'],
      ['cultura', 'Cultura e Innovación'],
      ['calidad', 'Calidad y Evaluación'],
    ]);
  });

  it('ya no lleva un lexico propio que pueda divergir del backend', () => {
    FACTOR_CATEGORIES.forEach(c => expect(c).not.toHaveProperty('keywords'));
  });
});
