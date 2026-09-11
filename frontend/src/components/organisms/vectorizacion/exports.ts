/**
 * Exportacion completa de los datos de vectorizacion en CSV, JSON, diccionario Python y notebook.
 */

import type { BagOfWords } from '../../../services/bagOfWordsService';
import type { NgramAnalysis } from '../../../services/ngramAnalysisService';
import type { TfIdfAnalysis } from '../../../services/tfidfAnalysisService';
import type { VectorizationDashboardData } from '../../../services/dashboardService';
import { downloadFile, buildCsv } from '../../../utils/download';

export const getNgramLabel = ([min, max]: [number, number]): string => {
  if (min === 1 && max === 1) return 'Unigramas';
  if (min === 2 && max === 2) return 'Bigramas';
  if (min === 3 && max === 3) return 'Trigramas';
  if (min === 4 && max === 4) return 'Cuatrigramas';
  if (min === max) return `${min}-gramas`;
  return `(${min},${max})-gramas`;
};

/** BoW: exports FULL vocabulary (all terms, not just top N) */
export const exportBowCompleteCsv = (bow: BagOfWords, analysisName: string) => {
  const slug = analysisName.replace(/\s+/g, '_');
  // vocabulary: Record<string, number> has ALL terms with frequencies
  const rows = Object.entries(bow.vocabulary || {})
    .sort((a, b) => b[1] - a[1])
    .map(([term, freq], i) => [i + 1, term, freq]);
  // If vocabulary empty, fall back to top_terms
  const finalRows = rows.length > 0
    ? rows
    : (bow.top_terms || []).map(t => [t.rank, t.term, t.score]);
  const csv = buildCsv(['rank', 'termino', 'frecuencia'], finalRows);
  downloadFile(csv, `bow_vocabulario_completo_${slug}.csv`, 'text/csv');
};

/** TF-IDF: exports ALL terms using idf_values (every term in corpus) */

export const exportTfidfCompleteCsv = (tfidf: TfIdfAnalysis, analysisName: string) => {
  const slug = analysisName.replace(/\s+/g, '_');
  const tfMap   = new Map((tfidf.tf_matrix?.top_terms_by_tf  || []).map(t => [t.term, t.score]));
  const tfidfMap = new Map((tfidf.tfidf_matrix?.top_terms    || []).map(t => [t.term, t.score]));
  // idf_values has ALL terms in the vocabulary
  const idfEntries = Object.entries(tfidf.idf_vector?.idf_values || {});
  const rows = idfEntries
    .sort((a, b) => (tfidfMap.get(b[0]) || 0) - (tfidfMap.get(a[0]) || 0))
    .map(([term, idf], i) => [
      i + 1, term,
      tfMap.has(term)   ? tfMap.get(term)!.toFixed(2)   : 'N/A',
      idf.toFixed(2),
      tfidfMap.has(term) ? tfidfMap.get(term)!.toFixed(2) : 'N/A',
    ]);
  // If idf_values empty, fall back to top_terms
  const finalRows = rows.length > 0
    ? rows
    : (tfidf.tfidf_matrix?.top_terms || []).map(t => [t.rank, t.term, 'N/A', 'N/A', t.score.toFixed(2)]);
  const csv = buildCsv(['rank', 'termino', 'tf', 'idf', 'tfidf'], finalRows);
  downloadFile(csv, `tfidf_completo_${slug}.csv`, 'text/csv');
};

/** N-grams: exports ALL configurations, ALL available terms */

export const exportNgramCompleteCsv = (ngram: NgramAnalysis, analysisName: string) => {
  const slug = analysisName.replace(/\s+/g, '_');
  const rows: (string | number)[][] = [];
  Object.entries(ngram.results || {}).forEach(([, result]) => {
    const label = getNgramLabel(result.ngram_range || [1, 1]);
    (result.top_terms || []).forEach((t, i) => {
      rows.push([label, i + 1, t.term, t.score]);
    });
  });
  const csv = buildCsv(['configuracion', 'rank', 'ngrama', 'frecuencia'], rows);
  downloadFile(csv, `ngramas_completo_${slug}.csv`, 'text/csv');
};

/** JSON: complete export with full vocabularies */

export const exportJsonComplete = (data: VectorizationDashboardData) => {
  const bow   = data.selectedBow;
  const tfidf = data.selectedTfidf;
  const ngram = data.selectedNgram;
  const payload = {
    metadata: {
      exported_at: new Date().toISOString(),
      bow_analysis:   bow?.name   || null,
      tfidf_analysis: tfidf?.name || null,
      ngram_analysis: ngram?.name || null,
      note: 'Exportación completa — incluye vocabulario completo, no solo top términos',
    },
    bow: bow ? {
      name:                    bow.name,
      vocabulary_size:         bow.vocabulary_size,
      document_count:          bow.document_count,
      min_df:                  bow.min_df,
      max_df:                  bow.max_df,
      max_features:            bow.max_features,
      avg_terms_per_document:  bow.avg_terms_per_document,
      total_term_occurrences:  bow.total_term_occurrences,
      matrix_shape:            bow.matrix_shape,
      matrix_sparsity:         bow.matrix_sparsity,
      vocabulary: bow.vocabulary || {},       // COMPLETE vocabulary
      feature_names: bow.feature_names || [], // all feature names
    } : null,
    tfidf: tfidf ? {
      name:             tfidf.name,
      vocabulary_size:  tfidf.vocabulary_size,
      document_count:   tfidf.document_count,
      parameters: {
        use_idf:     tfidf.use_idf,
        smooth_idf:  tfidf.smooth_idf,
        sublinear_tf: tfidf.sublinear_tf,
        min_df:      tfidf.min_df,
        max_df:      tfidf.max_df,
        max_features: tfidf.max_features,
      },
      idf_values:          tfidf.idf_vector?.idf_values           || {}, // ALL terms IDF
      top_terms_by_tf:     tfidf.tf_matrix?.top_terms_by_tf       || [],
      top_terms_by_idf:    tfidf.idf_vector?.top_terms_by_idf     || [],
      bottom_terms_by_idf: tfidf.idf_vector?.bottom_terms_by_idf  || [],
      top_terms_tfidf:     tfidf.tfidf_matrix?.top_terms          || [],
      avg_idf:             tfidf.idf_vector?.avg_idf              ?? null,
    } : null,
    ngrams: ngram ? {
      name:           ngram.name,
      document_count: ngram.document_count,
      configurations: Object.entries(ngram.results || {}).map(([key, result]) => ({
        config_key:    key,
        ngram_range:   result.ngram_range,
        label:         getNgramLabel(result.ngram_range || [1, 1]),
        vocabulary_size:           result.vocabulary_size,
        unique_terms:              result.unique_terms,
        total_term_occurrences:    result.total_term_occurrences,
        avg_terms_per_document:    result.avg_terms_per_document,
        matrix_sparsity:           result.matrix_sparsity,
        terms: result.top_terms || [],  // all available terms
      })),
      comparisons: ngram.comparisons || null,
    } : null,
  };
  downloadFile(JSON.stringify(payload, null, 2), 'vectorizacion_completo.json', 'application/json');
};

/** Python dict: complete vocabularies, ready for Pandas/sklearn */

export const exportPythonDictComplete = (data: VectorizationDashboardData) => {
  const now  = new Date().toISOString().split('T')[0];
  const bow  = data.selectedBow;
  const tfidf = data.selectedTfidf;
  const ngram = data.selectedNgram;

  // BoW: full vocabulary
  const bowVocabEntries = Object.entries(bow?.vocabulary || {})
    .sort((a, b) => b[1] - a[1]);
  const bowLines = bowVocabEntries.length > 0
    ? bowVocabEntries.map(([t, f]) => `    "${t}": ${f},`).join('\n')
    : (bow?.top_terms || []).map(t => `    "${t.term}": ${t.score},`).join('\n');

  // IDF: all values
  const idfLines = Object.entries(tfidf?.idf_vector?.idf_values || {})
    .slice(0, 5000)
    .map(([t, v]) => `    "${t}": ${v.toFixed(6)},`).join('\n');

  // TF-IDF top terms
  const tfidfLines = (tfidf?.tfidf_matrix?.top_terms || [])
    .map(t => `    "${t.term}": {"score": ${t.score.toFixed(6)}, "rank": ${t.rank}},`).join('\n');

  // N-grams: all configs
  const ngramBlocks = Object.entries(ngram?.results || {}).map(([key, result]) => {
    const label = getNgramLabel(result.ngram_range || [1, 1]);
    const lines = (result.top_terms || [])
      .map(t => `        {"ngrama": "${t.term}", "frecuencia": ${t.score}, "rank": ${t.rank}},`)
      .join('\n');
    return `    "${key}": {  # ${label}\n        "ngram_range": ${JSON.stringify(result.ngram_range)},\n        "vocabulary_size": ${result.vocabulary_size},\n        "terms": [\n${lines}\n        ],\n    },`;
  }).join('\n');

  const py = `# ============================================================
# Exportación COMPLETA de Vectorización — Análisis de Texto IES
# Generado: ${now}
# BoW:     ${bow?.name || 'N/A'} (vocabulario: ${bow?.vocabulary_size || 0} términos)
# TF-IDF:  ${tfidf?.name || 'N/A'}
# N-gramas: ${ngram?.name || 'N/A'}
# ============================================================

# ── Bolsa de Palabras (vocabulario completo) ──────────────
# Clave: término | valor: frecuencia total en el corpus
bow_vocabulary = {
${bowLines}
}

bow_metadata = {
    "vocabulary_size":          ${bow?.vocabulary_size || 0},
    "document_count":           ${bow?.document_count  || 0},
    "min_df":                   ${bow?.min_df          || 1},
    "max_df":                   ${bow?.max_df          || 1.0},
    "max_features":             ${bow?.max_features    || 'None'},
    "avg_terms_per_document":   ${bow?.avg_terms_per_document || 0},
    "total_term_occurrences":   ${bow?.total_term_occurrences || 0},
}

# ── TF-IDF: valores IDF completos (todos los términos) ───
# IDF alto = término raro/específico | IDF bajo = término común
tfidf_idf_values = {
${idfLines}
}

# TF-IDF: top términos por score combinado
tfidf_top_terms = {
${tfidfLines}
}

tfidf_metadata = {
    "vocabulary_size": ${tfidf?.vocabulary_size || 0},
    "document_count":  ${tfidf?.document_count  || 0},
    "use_idf":         ${tfidf?.use_idf ? 'True' : 'False'},
    "smooth_idf":      ${tfidf?.smooth_idf ? 'True' : 'False'},
    "sublinear_tf":    ${tfidf?.sublinear_tf ? 'True' : 'False'},
    "avg_idf":         ${tfidf?.idf_vector?.avg_idf ?? 'None'},
}

# ── N-gramas: todas las configuraciones ──────────────────
ngrams_by_config = {
${ngramBlocks}
}

# ── Uso sugerido con Pandas ───────────────────────────────
# import pandas as pd
#
# df_bow = pd.DataFrame([
#     {"termino": k, "frecuencia": v, "rank": i+1}
#     for i, (k, v) in enumerate(sorted(bow_vocabulary.items(), key=lambda x: -x[1]))
# ])
#
# df_idf = pd.DataFrame([
#     {"termino": k, "idf": v}
#     for k, v in tfidf_idf_values.items()
# ]).sort_values("idf")
#
# df_tfidf = pd.DataFrame([
#     {"termino": k, **v} for k, v in tfidf_top_terms.items()
# ]).sort_values("score", ascending=False)
#
# # Merge BoW + IDF para análisis combinado:
# df_combined = df_bow.merge(df_idf, on="termino", how="inner")
`;
  downloadFile(py, 'vectorizacion_completo.py', 'text/x-python');
};

/** Jupyter notebook (.ipynb) with code cells for Pandas analysis */

export const exportJupyterNotebook = (data: VectorizationDashboardData) => {
  const now = new Date().toISOString().split('T')[0];
  const bow = data.selectedBow;
  const tfidf = data.selectedTfidf;
  const ngram = data.selectedNgram;
  const cell = (source: string[], type: 'code' | 'markdown' = 'code') =>
    type === 'code'
      ? { cell_type: 'code', execution_count: null, metadata: {}, outputs: [], source }
      : { cell_type: 'markdown', metadata: {}, source };

  const bowVocab = JSON.stringify(Object.fromEntries(Object.entries(bow?.vocabulary || {}).slice(0, 3000)), null, 2);
  const idfVals  = JSON.stringify(Object.fromEntries(Object.entries(tfidf?.idf_vector?.idf_values || {}).slice(0, 3000)), null, 2);

  const ngramCells = Object.entries(ngram?.results || {}).slice(0, 3).map(([key, result]) => {
    const label = getNgramLabel(result.ngram_range || [1, 1]);
    const terms = JSON.stringify((result.top_terms || []).slice(0, 100).map(t => ({ ngrama: t.term, frecuencia: t.score })));
    const safeKey = key.replace(/-/g, '_');
    return cell([
      `# ${label}\n`,
      `ngrams_${safeKey} = ${terms}\n`,
      `df_ng = pd.DataFrame(ngrams_${safeKey})\n`,
      `df_ng.head(20).plot.barh(x="ngrama", y="frecuencia", figsize=(12,5), title="Top 20 ${label}", color="#8b5cf6", legend=False)\n`,
      `plt.tight_layout(); plt.show()`,
    ]);
  });

  const notebook = {
    nbformat: 4, nbformat_minor: 5,
    metadata: {
      kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' },
      language_info: { name: 'python', version: '3.8.0' },
    },
    cells: [
      cell([`# Análisis de Vectorización — IES\n`, `**Generado:** ${now}  \n`, `**BoW:** ${bow?.name || 'N/A'}  \n`, `**TF-IDF:** ${tfidf?.name || 'N/A'}  \n`, `**N-gramas:** ${ngram?.name || 'N/A'}`], 'markdown'),
      cell(['## 1. Dependencias'], 'markdown'),
      cell(['# !pip install pandas matplotlib seaborn scikit-learn\n', 'import pandas as pd\n', 'import matplotlib.pyplot as plt\n', 'import seaborn as sns\n', 'print("✅ Librerías cargadas")']),
      cell(['## 2. Bolsa de Palabras'], 'markdown'),
      cell([`bow_vocabulary = ${bowVocab}\n`, `\n`, `df_bow = pd.DataFrame([{"termino": k, "frecuencia": v} for k, v in sorted(bow_vocabulary.items(), key=lambda x: -x[1])])\n`, `df_bow["rank"] = range(1, len(df_bow)+1)\n`, `print(f"Vocabulario: {len(df_bow)} términos")\n`, `df_bow.head(20)`]),
      cell([`df_bow.head(20).plot.barh(x="termino", y="frecuencia", figsize=(12,5), title="Top 20 Términos — BoW", color="#06b6d4", legend=False)\n`, `plt.tight_layout(); plt.show()`]),
      cell(['## 3. TF-IDF'], 'markdown'),
      cell([`tfidf_idf_values = ${idfVals}\n`, `\n`, `df_idf = pd.DataFrame([{"termino": k, "idf": v} for k, v in tfidf_idf_values.items()]).sort_values("idf")\n`, `print(f"IDF: {len(df_idf)} términos")\n`, `df_idf.head(10)`]),
      cell([`df_combined = df_bow.merge(df_idf, on="termino", how="inner")\n`, `df_combined["tfidf_score"] = df_combined["frecuencia"] * df_combined["idf"]\n`, `df_combined = df_combined.sort_values("tfidf_score", ascending=False)\n`, `\n`, `# Scatter TF vs IDF\n`, `fig, ax = plt.subplots(figsize=(10,7))\n`, `sc = ax.scatter(df_combined["frecuencia"].head(100), df_combined["idf"].head(100), c=df_combined["tfidf_score"].head(100), cmap="viridis", s=60, alpha=0.7)\n`, `plt.colorbar(sc, label="TF-IDF Score")\n`, `for _, r in df_combined.head(10).iterrows():\n`, `    ax.annotate(r["termino"], (r["frecuencia"], r["idf"]), fontsize=8)\n`, `ax.set_xlabel("TF"); ax.set_ylabel("IDF"); ax.set_title("Scatter TF vs IDF")\n`, `plt.tight_layout(); plt.show()`]),
      cell(['## 4. N-gramas'], 'markdown'),
      ...ngramCells,
      cell(['## 5. Heatmap términos × métricas'], 'markdown'),
      cell([`top = df_combined.head(20)\n`, `hm = top.set_index("termino")[["frecuencia","idf","tfidf_score"]]\n`, `hm_norm = (hm - hm.min()) / (hm.max() - hm.min())\n`, `\n`, `fig, ax = plt.subplots(figsize=(14,4))\n`, `sns.heatmap(hm_norm.T, annot=True, fmt=".2f", cmap="Blues", ax=ax, linewidths=0.5)\n`, `ax.set_title("Heatmap: Top 20 términos × Métricas (normalizado)")\n`, `plt.tight_layout(); plt.show()`]),
    ],
  };
  downloadFile(JSON.stringify(notebook, null, 2), `vectorizacion_${now}.ipynb`, 'application/json');
};
