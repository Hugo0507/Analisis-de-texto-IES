"""
Módulo de Lógica - Evaluación de Desempeño
Funciones para evaluar el desempeño de la estrategia computacional de análisis
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple
from collections import Counter
import time


def evaluate_pipeline_completeness(session_state) -> Dict[str, Any]:
    """
    Evalúa qué fases del pipeline se han completado

    Args:
        session_state: Estado de sesión de Streamlit

    Returns:
        Diccionario con el estado de cada fase
    """
    phases = {
        'FASE 1: PREPARACIÓN': {
            'conexion_drive': hasattr(session_state, 'authenticated') and session_state.authenticated,
            'deteccion_idiomas': hasattr(session_state, 'language_detection_results') and len(session_state.language_detection_results) > 0,
            'conversion_txt': hasattr(session_state, 'conversion_results') and len(session_state.conversion_results) > 0,
            'preprocesamiento': hasattr(session_state, 'preprocessed_texts') and len(session_state.preprocessed_texts) > 0
        },
        'FASE 2: REPRESENTACIÓN VECTORIAL': {
            'bow_tfidf': hasattr(session_state, 'tfidf_results') and session_state.tfidf_results,
            'ngrams': hasattr(session_state, 'ngram_results') and session_state.ngram_results
        },
        'FASE 3: ANÁLISIS LINGÜÍSTICO': {
            'ner': hasattr(session_state, 'ner_results') and session_state.ner_results
        },
        'FASE 4: MODELADO DE TEMAS': {
            'topic_modeling': hasattr(session_state, 'topic_results') and session_state.topic_results,
            'bertopic': hasattr(session_state, 'bertopic_results') and session_state.bertopic_results
        },
        'FASE 5: DIMENSIONALIDAD Y CLASIFICACIÓN': {
            'dimensionality': hasattr(session_state, 'dimensionality_results') and session_state.dimensionality_results,
            'classification': hasattr(session_state, 'classification_results') and session_state.classification_results
        },
        'FASE 6: ANÁLISIS INTEGRADO': {
            'consolidacion': hasattr(session_state, 'consolidated_factors') and not session_state.consolidated_factors.empty
        }
    }

    # Calcular porcentaje de completitud por fase
    phase_completion = {}
    for phase, tasks in phases.items():
        completed = sum(tasks.values())
        total = len(tasks)
        phase_completion[phase] = {
            'completed': completed,
            'total': total,
            'percentage': (completed / total * 100) if total > 0 else 0,
            'tasks': tasks
        }

    # Completitud global
    total_completed = sum(p['completed'] for p in phase_completion.values())
    total_tasks = sum(p['total'] for p in phase_completion.values())
    global_completion = (total_completed / total_tasks * 100) if total_tasks > 0 else 0

    return {
        'phases': phase_completion,
        'global_completion': global_completion,
        'total_completed': total_completed,
        'total_tasks': total_tasks
    }


def evaluate_data_quality(session_state) -> Dict[str, Any]:
    """
    Evalúa la calidad de los datos procesados

    Args:
        session_state: Estado de sesión de Streamlit

    Returns:
        Métricas de calidad de datos
    """
    quality_metrics = {}

    # Calidad de detección de idiomas
    if hasattr(session_state, 'language_detection_results') and session_state.language_detection_results:
        results = session_state.language_detection_results
        total = len(results)
        detected = sum(1 for r in results if r.get('language_code') and r.get('confidence', 0) > 0)
        high_confidence = sum(1 for r in results if r.get('confidence', 0) > 0.8)

        quality_metrics['language_detection'] = {
            'total_files': total,
            'successfully_detected': detected,
            'high_confidence': high_confidence,
            'detection_rate': (detected / total * 100) if total > 0 else 0,
            'high_confidence_rate': (high_confidence / total * 100) if total > 0 else 0
        }

    # Calidad de conversión PDF→TXT
    if hasattr(session_state, 'conversion_results') and session_state.conversion_results:
        results = session_state.conversion_results
        total = len(results)
        successful = sum(1 for r in results if r.get('success'))
        avg_length = np.mean([r.get('text_length', 0) for r in results if r.get('success')])

        quality_metrics['pdf_conversion'] = {
            'total_files': total,
            'successfully_converted': successful,
            'avg_text_length': int(avg_length),
            'conversion_rate': (successful / total * 100) if total > 0 else 0
        }

    # Calidad de preprocesamiento
    if hasattr(session_state, 'preprocessed_texts') and session_state.preprocessed_texts:
        texts = session_state.preprocessed_texts
        total = len(texts)
        avg_length = np.mean([len(text.split()) for text in texts.values()])
        min_length = min([len(text.split()) for text in texts.values()])
        max_length = max([len(text.split()) for text in texts.values()])

        quality_metrics['preprocessing'] = {
            'total_documents': total,
            'avg_words': int(avg_length),
            'min_words': int(min_length),
            'max_words': int(max_length)
        }

    return quality_metrics


def evaluate_technique_consistency(session_state) -> Dict[str, Any]:
    """
    Evalúa la consistencia entre diferentes técnicas de análisis

    Args:
        session_state: Estado de sesión de Streamlit

    Returns:
        Métricas de consistencia entre técnicas
    """
    consistency_metrics = {}

    # Consistencia entre TF-IDF y Topics
    if (hasattr(session_state, 'tfidf_results') and session_state.tfidf_results and
        hasattr(session_state, 'topic_results') and session_state.topic_results):

        # Extraer términos top de TF-IDF
        tfidf_terms = set()
        if 'top_terms_per_doc' in session_state.tfidf_results:
            for terms_list in session_state.tfidf_results['top_terms_per_doc'].values():
                tfidf_terms.update([term for term, _ in terms_list[:20]])

        # Extraer términos de Topics
        topic_terms = set()
        if 'topics' in session_state.topic_results:
            for topic in session_state.topic_results['topics'][:5]:
                topic_terms.update([word for word, _ in topic[:10]])

        # Calcular overlap
        overlap = tfidf_terms.intersection(topic_terms)
        overlap_rate = len(overlap) / len(tfidf_terms) if len(tfidf_terms) > 0 else 0

        consistency_metrics['tfidf_topic_consistency'] = {
            'tfidf_unique_terms': len(tfidf_terms),
            'topic_unique_terms': len(topic_terms),
            'overlap_terms': len(overlap),
            'overlap_rate': overlap_rate * 100,
            'interpretation': 'Alta' if overlap_rate > 0.3 else ('Media' if overlap_rate > 0.15 else 'Baja')
        }

    # Consistencia entre diferentes modelos de clasificación
    if hasattr(session_state, 'classification_results') and session_state.classification_results:
        results = session_state.classification_results

        if 'naive_bayes' in results and 'svm' in results and 'knn' in results:
            nb_acc = results['naive_bayes']['metrics']['accuracy']
            svm_acc = results['svm']['metrics']['accuracy']
            knn_acc = results['knn']['metrics']['accuracy']

            # Variabilidad entre modelos
            accuracies = [nb_acc, svm_acc, knn_acc]
            std_dev = np.std(accuracies)
            cv = (std_dev / np.mean(accuracies)) * 100  # Coeficiente de variación

            consistency_metrics['classification_consistency'] = {
                'nb_accuracy': nb_acc,
                'svm_accuracy': svm_acc,
                'knn_accuracy': knn_acc,
                'std_deviation': std_dev,
                'coefficient_variation': cv,
                'interpretation': 'Alta consistencia' if cv < 10 else ('Media consistencia' if cv < 20 else 'Baja consistencia')
            }

    return consistency_metrics


def calculate_processing_metrics(session_state) -> Dict[str, Any]:
    """
    Calcula métricas de procesamiento y eficiencia

    Args:
        session_state: Estado de sesión de Streamlit

    Returns:
        Métricas de procesamiento
    """
    processing_metrics = {}

    # Documentos procesados por fase
    if hasattr(session_state, 'preprocessed_texts'):
        processing_metrics['documents_processed'] = len(session_state.preprocessed_texts)

    # Términos únicos en vocabulario (TF-IDF)
    if hasattr(session_state, 'tfidf_results') and 'vocabulary_size' in session_state.tfidf_results:
        processing_metrics['vocabulary_size'] = session_state.tfidf_results['vocabulary_size']

    # Topics generados
    if hasattr(session_state, 'topic_results') and 'n_topics' in session_state.topic_results:
        processing_metrics['topics_generated'] = session_state.topic_results['n_topics']

    # Entidades identificadas (NER)
    if hasattr(session_state, 'ner_results') and 'entities' in session_state.ner_results:
        total_entities = sum(len(entities) for entities in session_state.ner_results['entities'].values())
        processing_metrics['entities_identified'] = total_entities

    # Factores consolidados
    if hasattr(session_state, 'consolidated_factors') and not session_state.consolidated_factors.empty:
        processing_metrics['factors_consolidated'] = len(session_state.consolidated_factors)

    return processing_metrics


def evaluate_model_performance(session_state) -> Dict[str, Any]:
    """
    Evalúa el desempeño de los modelos de ML/PLN

    Args:
        session_state: Estado de sesión de Streamlit

    Returns:
        Métricas de desempeño de modelos
    """
    model_performance = {}

    # Desempeño de clasificación
    if hasattr(session_state, 'classification_results') and session_state.classification_results:
        results = session_state.classification_results

        for model_name in ['naive_bayes', 'svm', 'knn']:
            if model_name in results:
                metrics = results[model_name]['metrics']
                model_performance[f'classification_{model_name}'] = {
                    'accuracy': metrics.get('accuracy', 0),
                    'precision': metrics.get('precision', 0),
                    'recall': metrics.get('recall', 0),
                    'f1_score': metrics.get('f1_score', 0),
                    'cv_mean': metrics.get('cv_mean', 0),
                    'cv_std': metrics.get('cv_std', 0)
                }

    # Desempeño de topic modeling
    if hasattr(session_state, 'topic_results') and session_state.topic_results:
        results = session_state.topic_results

        if 'coherence_score' in results:
            model_performance['topic_modeling'] = {
                'coherence_score': results['coherence_score'],
                'n_topics': results.get('n_topics', 0),
                'algorithm': results.get('algorithm', 'unknown')
            }

    # Desempeño de BERTopic
    if hasattr(session_state, 'bertopic_results') and session_state.bertopic_results:
        results = session_state.bertopic_results

        if 'n_topics' in results:
            model_performance['bertopic'] = {
                'n_topics': results['n_topics'],
                'n_outliers': results.get('n_outliers', 0),
                'outlier_rate': (results.get('n_outliers', 0) / len(session_state.preprocessed_texts) * 100) if hasattr(session_state, 'preprocessed_texts') else 0
            }

    return model_performance


def generate_performance_summary(session_state) -> Dict[str, Any]:
    """
    Genera un resumen completo de desempeño del sistema

    Args:
        session_state: Estado de sesión de Streamlit

    Returns:
        Resumen completo de desempeño
    """
    summary = {
        'pipeline_completeness': evaluate_pipeline_completeness(session_state),
        'data_quality': evaluate_data_quality(session_state),
        'technique_consistency': evaluate_technique_consistency(session_state),
        'processing_metrics': calculate_processing_metrics(session_state),
        'model_performance': evaluate_model_performance(session_state)
    }

    # Calcular score global de desempeño (0-100)
    global_score = calculate_global_performance_score(summary)
    summary['global_performance_score'] = global_score

    return summary


def calculate_global_performance_score(summary: Dict[str, Any]) -> float:
    """
    Calcula un score global de desempeño (0-100)

    Args:
        summary: Resumen de desempeño

    Returns:
        Score global (0-100)
    """
    scores = []
    weights = []

    # Completitud del pipeline (peso: 25%)
    if 'pipeline_completeness' in summary:
        scores.append(summary['pipeline_completeness']['global_completion'])
        weights.append(0.25)

    # Calidad de datos (peso: 20%)
    if 'data_quality' in summary:
        quality_score = 0
        count = 0

        if 'language_detection' in summary['data_quality']:
            quality_score += summary['data_quality']['language_detection']['detection_rate']
            count += 1

        if 'pdf_conversion' in summary['data_quality']:
            quality_score += summary['data_quality']['pdf_conversion']['conversion_rate']
            count += 1

        if count > 0:
            scores.append(quality_score / count)
            weights.append(0.20)

    # Desempeño de modelos (peso: 35%)
    if 'model_performance' in summary:
        model_scores = []

        for model, metrics in summary['model_performance'].items():
            if 'classification' in model:
                model_scores.append(metrics.get('accuracy', 0) * 100)
            elif model == 'topic_modeling':
                # Coherence score típicamente está en rango 0-1
                model_scores.append(metrics.get('coherence_score', 0) * 100)

        if model_scores:
            scores.append(np.mean(model_scores))
            weights.append(0.35)

    # Consistencia (peso: 20%)
    if 'technique_consistency' in summary:
        consistency_scores = []

        if 'tfidf_topic_consistency' in summary['technique_consistency']:
            consistency_scores.append(summary['technique_consistency']['tfidf_topic_consistency']['overlap_rate'])

        if 'classification_consistency' in summary['technique_consistency']:
            # Para clasificación, baja variabilidad = alta consistencia
            cv = summary['technique_consistency']['classification_consistency']['coefficient_variation']
            consistency_score = max(0, 100 - cv * 2)  # CV < 10 → score > 80
            consistency_scores.append(consistency_score)

        if consistency_scores:
            scores.append(np.mean(consistency_scores))
            weights.append(0.20)

    # Calcular score ponderado
    if scores and weights:
        # Normalizar pesos
        total_weight = sum(weights)
        normalized_weights = [w / total_weight for w in weights]

        global_score = sum(s * w for s, w in zip(scores, normalized_weights))
        return round(global_score, 2)

    return 0.0


def generate_recommendations(summary: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    Genera recomendaciones basadas en el análisis de desempeño

    Args:
        summary: Resumen de desempeño

    Returns:
        Lista de recomendaciones
    """
    recommendations = []

    # Recomendaciones basadas en completitud
    completeness = summary.get('pipeline_completeness', {})
    if completeness.get('global_completion', 0) < 80:
        recommendations.append({
            'type': 'warning',
            'title': 'Pipeline Incompleto',
            'description': f'Solo has completado {completeness.get("global_completion", 0):.1f}% de las fases disponibles. '
                          f'Para obtener resultados más robustos, considera completar las fases faltantes.'
        })

    # Recomendaciones basadas en calidad de datos
    data_quality = summary.get('data_quality', {})

    if 'language_detection' in data_quality:
        detection_rate = data_quality['language_detection']['detection_rate']
        if detection_rate < 90:
            recommendations.append({
                'type': 'info',
                'title': 'Tasa de Detección de Idiomas Mejorable',
                'description': f'La tasa de detección de idiomas es del {detection_rate:.1f}%. '
                              f'Algunos documentos pueden tener problemas de formato o estar corruptos.'
            })

    # Recomendaciones basadas en consistencia
    consistency = summary.get('technique_consistency', {})

    if 'tfidf_topic_consistency' in consistency:
        overlap_rate = consistency['tfidf_topic_consistency']['overlap_rate']
        if overlap_rate < 15:
            recommendations.append({
                'type': 'info',
                'title': 'Baja Consistencia entre TF-IDF y Topics',
                'description': f'El overlap entre términos TF-IDF y Topics es bajo ({overlap_rate:.1f}%). '
                              f'Esto puede indicar que los topics capturan temas diferentes a los términos más frecuentes. '
                              f'Considera ajustar el número de topics o los parámetros de TF-IDF.'
            })

    # Recomendaciones basadas en desempeño de modelos
    model_perf = summary.get('model_performance', {})

    classification_models = {k: v for k, v in model_perf.items() if 'classification' in k}
    if classification_models:
        best_model = max(classification_models.items(), key=lambda x: x[1].get('accuracy', 0))
        best_acc = best_model[1]['accuracy']

        if best_acc < 0.7:
            recommendations.append({
                'type': 'warning',
                'title': 'Desempeño de Clasificación Bajo',
                'description': f'El mejor modelo de clasificación ({best_model[0]}) tiene un accuracy de {best_acc:.2%}. '
                              f'Considera: (1) Aumentar el tamaño del conjunto de entrenamiento, '
                              f'(2) Balancear las clases, (3) Ajustar hiperparámetros.'
            })
        else:
            recommendations.append({
                'type': 'success',
                'title': f'Buen Desempeño en Clasificación',
                'description': f'El modelo {best_model[0].replace("classification_", "")} alcanza un accuracy de {best_acc:.2%}, '
                              f'lo cual es satisfactorio para análisis de texto.'
            })

    # Recomendación general basada en score global
    global_score = summary.get('global_performance_score', 0)

    if global_score >= 80:
        recommendations.append({
            'type': 'success',
            'title': 'Excelente Desempeño Global',
            'description': f'Tu sistema alcanza un score de {global_score:.1f}/100. '
                          f'Los resultados son confiables y pueden ser utilizados con confianza en tu tesis.'
        })
    elif global_score >= 60:
        recommendations.append({
            'type': 'info',
            'title': 'Desempeño Global Satisfactorio',
            'description': f'Tu sistema alcanza un score de {global_score:.1f}/100. '
                          f'Los resultados son válidos, pero podrían mejorarse completando más fases o ajustando parámetros.'
        })
    else:
        recommendations.append({
            'type': 'warning',
            'title': 'Desempeño Global Mejorable',
            'description': f'Tu sistema alcanza un score de {global_score:.1f}/100. '
                          f'Considera completar las fases faltantes y verificar la calidad de los datos de entrada.'
        })

    return recommendations


def prepare_evaluation_export(summary: Dict[str, Any], recommendations: List[Dict]) -> Dict[str, Any]:
    """
    Prepara datos de evaluación para exportación

    Args:
        summary: Resumen de desempeño
        recommendations: Lista de recomendaciones

    Returns:
        Diccionario con datos de evaluación organizados
    """
    export_data = {
        'evaluation_timestamp': pd.Timestamp.now().isoformat(),
        'global_performance_score': summary.get('global_performance_score', 0),
        'pipeline_completeness': summary.get('pipeline_completeness', {}),
        'data_quality': summary.get('data_quality', {}),
        'technique_consistency': summary.get('technique_consistency', {}),
        'processing_metrics': summary.get('processing_metrics', {}),
        'model_performance': summary.get('model_performance', {}),
        'recommendations': recommendations
    }

    return export_data
