"""
Módulo de UI - Evaluación de Desempeño
Dashboard de evaluación del desempeño de la estrategia computacional
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
from components.ui.helpers import show_section_header
from . import evaluacion_desempeno as logic
import json


def render_pipeline_completeness():
    """Renderiza visualización de completitud del pipeline"""

    st.subheader("📋 Completitud del Pipeline de Análisis")

    completeness = logic.evaluate_pipeline_completeness(st.session_state)

    # Métrica global
    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric(
            "Completitud Global",
            f"{completeness['global_completion']:.1f}%",
            help="Porcentaje de tareas completadas en todo el pipeline"
        )

    with col2:
        st.metric(
            "Tareas Completadas",
            f"{completeness['total_completed']}/{completeness['total_tasks']}",
            help="Número de tareas completadas vs total de tareas disponibles"
        )

    with col3:
        # Determinar estado
        completion_pct = completeness['global_completion']
        if completion_pct >= 80:
            status = "✅ Completo"
            color = "green"
        elif completion_pct >= 50:
            status = "⚠️ Parcial"
            color = "orange"
        else:
            status = "❌ Incompleto"
            color = "red"

        st.markdown(f"**Estado:** <span style='color:{color};'>{status}</span>", unsafe_allow_html=True)

    st.markdown("---")

    # Gráfico de completitud por fase
    st.markdown("### Completitud por Fase")

    phase_data = []
    for phase, data in completeness['phases'].items():
        phase_data.append({
            'Fase': phase.replace('FASE ', '').replace(': ', ':\n'),
            'Completitud': data['percentage'],
            'Completadas': data['completed'],
            'Total': data['total']
        })

    df = pd.DataFrame(phase_data)

    fig = px.bar(
        df,
        x='Completitud',
        y='Fase',
        orientation='h',
        text='Completitud',
        title='Porcentaje de Completitud por Fase del Pipeline',
        labels={'Completitud': 'Completitud (%)'},
        color='Completitud',
        color_continuous_scale=['red', 'yellow', 'green'],
        range_color=[0, 100]
    )

    fig.update_traces(texttemplate='%{text:.1f}%', textposition='outside')
    fig.update_layout(height=400, showlegend=False)
    fig.update_xaxes(range=[0, 110])

    st.plotly_chart(fig, use_container_width=True)

    # Detalle de tareas por fase
    st.markdown("### Detalle de Tareas por Fase")

    for phase, data in completeness['phases'].items():
        with st.expander(f"{phase} - {data['percentage']:.0f}% completada"):
            task_status = []
            for task, completed in data['tasks'].items():
                status_icon = "✅" if completed else "❌"
                task_status.append(f"{status_icon} {task.replace('_', ' ').title()}")

            st.markdown("\n".join(task_status))


def render_data_quality():
    """Renderiza métricas de calidad de datos"""

    st.subheader("📊 Calidad de Datos Procesados")

    quality = logic.evaluate_data_quality(st.session_state)

    if not quality:
        st.info("ℹ️ No hay datos de calidad disponibles. Completa las fases de preparación primero.")
        return

    # Métricas de calidad
    cols = st.columns(len(quality))

    for i, (metric_name, metrics) in enumerate(quality.items()):
        with cols[i]:
            st.markdown(f"**{metric_name.replace('_', ' ').title()}**")

            if 'detection_rate' in metrics:
                st.metric("Tasa de Detección", f"{metrics['detection_rate']:.1f}%")
                st.metric("Alta Confianza", f"{metrics['high_confidence_rate']:.1f}%")
            elif 'conversion_rate' in metrics:
                st.metric("Tasa de Conversión", f"{metrics['conversion_rate']:.1f}%")
                st.metric("Long. Promedio", f"{metrics['avg_text_length']:,} chars")
            elif 'avg_words' in metrics:
                st.metric("Documentos", metrics['total_documents'])
                st.metric("Palabras Promedio", f"{metrics['avg_words']:,}")

    st.markdown("---")

    # Gráficos de calidad
    if 'language_detection' in quality and 'pdf_conversion' in quality:
        col1, col2 = st.columns(2)

        with col1:
            # Gráfico de detección de idiomas
            lang_data = quality['language_detection']
            fig = go.Figure(go.Indicator(
                mode="gauge+number+delta",
                value=lang_data['detection_rate'],
                title={'text': "Tasa de Detección de Idiomas"},
                delta={'reference': 95, 'increasing': {'color': 'green'}},
                gauge={
                    'axis': {'range': [0, 100]},
                    'bar': {'color': 'darkblue'},
                    'steps': [
                        {'range': [0, 70], 'color': 'lightgray'},
                        {'range': [70, 90], 'color': 'gray'}
                    ],
                    'threshold': {
                        'line': {'color': 'red', 'width': 4},
                        'thickness': 0.75,
                        'value': 95
                    }
                }
            ))
            st.plotly_chart(fig, use_container_width=True)

        with col2:
            # Gráfico de conversión PDF
            conv_data = quality['pdf_conversion']
            fig = go.Figure(go.Indicator(
                mode="gauge+number+delta",
                value=conv_data['conversion_rate'],
                title={'text': "Tasa de Conversión PDF→TXT"},
                delta={'reference': 90, 'increasing': {'color': 'green'}},
                gauge={
                    'axis': {'range': [0, 100]},
                    'bar': {'color': 'darkgreen'},
                    'steps': [
                        {'range': [0, 70], 'color': 'lightgray'},
                        {'range': [70, 90], 'color': 'gray'}
                    ],
                    'threshold': {
                        'line': {'color': 'red', 'width': 4},
                        'thickness': 0.75,
                        'value': 90
                    }
                }
            ))
            st.plotly_chart(fig, use_container_width=True)


def render_model_performance():
    """Renderiza métricas de desempeño de modelos"""

    st.subheader("🤖 Desempeño de Modelos de ML/PLN")

    model_perf = logic.evaluate_model_performance(st.session_state)

    if not model_perf:
        st.info("ℹ️ No hay modelos entrenados. Completa las fases de modelado y clasificación primero.")
        return

    # Clasificación
    classification_models = {k: v for k, v in model_perf.items() if 'classification' in k}

    if classification_models:
        st.markdown("### Modelos de Clasificación")

        # Tabla comparativa
        comparison_data = []
        for model_name, metrics in classification_models.items():
            comparison_data.append({
                'Modelo': model_name.replace('classification_', '').upper(),
                'Accuracy': f"{metrics['accuracy']:.2%}",
                'Precision': f"{metrics['precision']:.2%}",
                'Recall': f"{metrics['recall']:.2%}",
                'F1-Score': f"{metrics['f1_score']:.2%}",
                'CV Mean': f"{metrics['cv_mean']:.2%}",
                'CV Std': f"{metrics['cv_std']:.3f}"
            })

        df = pd.DataFrame(comparison_data)
        st.dataframe(df, hide_index=True, use_container_width=True)

        # Gráfico de radar para comparación
        st.markdown("#### Comparación Multi-dimensional")

        categories = ['Accuracy', 'Precision', 'Recall', 'F1-Score', 'CV Mean']

        fig = go.Figure()

        for model_name, metrics in classification_models.items():
            values = [
                metrics['accuracy'],
                metrics['precision'],
                metrics['recall'],
                metrics['f1_score'],
                metrics['cv_mean']
            ]

            fig.add_trace(go.Scatterpolar(
                r=values,
                theta=categories,
                fill='toself',
                name=model_name.replace('classification_', '').upper()
            ))

        fig.update_layout(
            polar=dict(
                radialaxis=dict(
                    visible=True,
                    range=[0, 1]
                )
            ),
            showlegend=True,
            title='Comparación de Métricas entre Modelos de Clasificación'
        )

        st.plotly_chart(fig, use_container_width=True)

    # Topic Modeling
    if 'topic_modeling' in model_perf:
        st.markdown("### Topic Modeling")

        col1, col2, col3 = st.columns(3)

        tm_metrics = model_perf['topic_modeling']

        with col1:
            st.metric("Coherence Score", f"{tm_metrics['coherence_score']:.3f}")

        with col2:
            st.metric("Número de Topics", tm_metrics['n_topics'])

        with col3:
            st.metric("Algoritmo", tm_metrics['algorithm'].upper())

        # Interpretación del coherence score
        coherence = tm_metrics['coherence_score']
        if coherence > 0.5:
            st.success("✅ Coherence score alto - Los topics son semánticamente coherentes")
        elif coherence > 0.3:
            st.info("ℹ️ Coherence score medio - Los topics son moderadamente coherentes")
        else:
            st.warning("⚠️ Coherence score bajo - Considera ajustar el número de topics")

    # BERTopic
    if 'bertopic' in model_perf:
        st.markdown("### BERTopic")

        col1, col2, col3 = st.columns(3)

        bt_metrics = model_perf['bertopic']

        with col1:
            st.metric("Topics Identificados", bt_metrics['n_topics'])

        with col2:
            st.metric("Documentos Outliers", bt_metrics['n_outliers'])

        with col3:
            st.metric("Tasa de Outliers", f"{bt_metrics['outlier_rate']:.1f}%")


def render_technique_consistency():
    """Renderiza análisis de consistencia entre técnicas"""

    st.subheader("🔄 Consistencia entre Técnicas de Análisis")

    consistency = logic.evaluate_technique_consistency(st.session_state)

    if not consistency:
        st.info("ℹ️ No hay suficientes técnicas completadas para evaluar consistencia.")
        return

    # TF-IDF vs Topics
    if 'tfidf_topic_consistency' in consistency:
        st.markdown("### TF-IDF vs Topic Modeling")

        metrics = consistency['tfidf_topic_consistency']

        col1, col2 = st.columns([2, 1])

        with col1:
            # Diagrama de Venn conceptual
            fig = go.Figure()

            # Círculo TF-IDF
            fig.add_shape(
                type="circle",
                x0=0, y0=0, x1=2, y1=2,
                line=dict(color="RoyalBlue", width=3),
                fillcolor="LightSkyBlue",
                opacity=0.5
            )

            # Círculo Topics
            fig.add_shape(
                type="circle",
                x0=1, y0=0, x1=3, y1=2,
                line=dict(color="Crimson", width=3),
                fillcolor="LightCoral",
                opacity=0.5
            )

            # Anotaciones
            fig.add_annotation(x=0.7, y=1, text=f"TF-IDF<br>{metrics['tfidf_unique_terms']}", showarrow=False, font=dict(size=12))
            fig.add_annotation(x=2.3, y=1, text=f"Topics<br>{metrics['topic_unique_terms']}", showarrow=False, font=dict(size=12))
            fig.add_annotation(x=1.5, y=1, text=f"Overlap<br>{metrics['overlap_terms']}", showarrow=False, font=dict(size=14, color="green"))

            fig.update_xaxes(range=[-0.5, 3.5], showticklabels=False, showgrid=False)
            fig.update_yaxes(range=[-0.5, 2.5], showticklabels=False, showgrid=False)
            fig.update_layout(
                title="Overlap de Términos: TF-IDF vs Topics",
                height=300,
                showlegend=False
            )

            st.plotly_chart(fig, use_container_width=True)

        with col2:
            st.metric("Términos TF-IDF", metrics['tfidf_unique_terms'])
            st.metric("Términos Topics", metrics['topic_unique_terms'])
            st.metric("Overlap", metrics['overlap_terms'])
            st.metric("Tasa de Overlap", f"{metrics['overlap_rate']:.1f}%")

            # Interpretación
            interpretation = metrics['interpretation']
            if interpretation == 'Alta':
                st.success(f"✅ Consistencia {interpretation}")
            elif interpretation == 'Media':
                st.info(f"ℹ️ Consistencia {interpretation}")
            else:
                st.warning(f"⚠️ Consistencia {interpretation}")

    # Consistencia entre modelos de clasificación
    if 'classification_consistency' in consistency:
        st.markdown("### Consistencia entre Modelos de Clasificación")

        metrics = consistency['classification_consistency']

        col1, col2 = st.columns(2)

        with col1:
            st.metric("Naive Bayes Accuracy", f"{metrics['nb_accuracy']:.2%}")
            st.metric("SVM Accuracy", f"{metrics['svm_accuracy']:.2%}")
            st.metric("KNN Accuracy", f"{metrics['knn_accuracy']:.2%}")

        with col2:
            st.metric("Desviación Estándar", f"{metrics['std_deviation']:.4f}")
            st.metric("Coeficiente de Variación", f"{metrics['coefficient_variation']:.2f}%")

            # Interpretación
            st.markdown(f"**Interpretación:** {metrics['interpretation']}")

            if 'Alta' in metrics['interpretation']:
                st.success("✅ Los modelos muestran resultados muy consistentes")
            elif 'Media' in metrics['interpretation']:
                st.info("ℹ️ Los modelos muestran resultados moderadamente consistentes")
            else:
                st.warning("⚠️ Los modelos muestran resultados inconsistentes")


def render_global_score():
    """Renderiza el score global de desempeño"""

    st.subheader("🎯 Score Global de Desempeño")

    summary = logic.generate_performance_summary(st.session_state)
    global_score = summary['global_performance_score']

    # Gauge principal
    fig = go.Figure(go.Indicator(
        mode="gauge+number+delta",
        value=global_score,
        title={'text': "Score Global de Desempeño del Sistema", 'font': {'size': 24}},
        delta={'reference': 80, 'increasing': {'color': 'green'}},
        gauge={
            'axis': {'range': [0, 100]},
            'bar': {'color': 'darkblue'},
            'steps': [
                {'range': [0, 40], 'color': 'lightcoral'},
                {'range': [40, 60], 'color': 'lightyellow'},
                {'range': [60, 80], 'color': 'lightgreen'},
                {'range': [80, 100], 'color': 'mediumseagreen'}
            ],
            'threshold': {
                'line': {'color': 'red', 'width': 4},
                'thickness': 0.75,
                'value': 80
            }
        }
    ))

    fig.update_layout(height=400)
    st.plotly_chart(fig, use_container_width=True)

    # Interpretación del score
    if global_score >= 80:
        st.success(f"""
        🎉 **Excelente Desempeño** ({global_score:.1f}/100)

        Tu sistema de análisis computacional ha alcanzado un desempeño sobresaliente.
        Los resultados son altamente confiables y pueden ser utilizados con plena seguridad
        en tu tesis de investigación.
        """)
    elif global_score >= 60:
        st.info(f"""
        ✅ **Buen Desempeño** ({global_score:.1f}/100)

        Tu sistema de análisis computacional muestra un desempeño satisfactorio.
        Los resultados son válidos para tu investigación, aunque podrían mejorarse
        completando fases adicionales o ajustando parámetros.
        """)
    elif global_score >= 40:
        st.warning(f"""
        ⚠️ **Desempeño Moderado** ({global_score:.1f}/100)

        Tu sistema de análisis computacional muestra un desempeño moderado.
        Se recomienda completar las fases faltantes y revisar la calidad de los datos
        de entrada para mejorar los resultados.
        """)
    else:
        st.error(f"""
        ❌ **Desempeño Bajo** ({global_score:.1f}/100)

        Tu sistema de análisis computacional requiere mejoras significativas.
        Completa las fases esenciales del pipeline y verifica la calidad de los datos
        antes de interpretar los resultados.
        """)

    # Guardar en session state
    st.session_state.performance_summary = summary


def render_recommendations():
    """Renderiza recomendaciones de mejora"""

    st.subheader("💡 Recomendaciones de Mejora")

    if not hasattr(st.session_state, 'performance_summary'):
        summary = logic.generate_performance_summary(st.session_state)
        st.session_state.performance_summary = summary
    else:
        summary = st.session_state.performance_summary

    recommendations = logic.generate_recommendations(summary)

    if not recommendations:
        st.info("No hay recomendaciones disponibles en este momento.")
        return

    for i, rec in enumerate(recommendations):
        if rec['type'] == 'success':
            st.success(f"**{rec['title']}**\n\n{rec['description']}")
        elif rec['type'] == 'info':
            st.info(f"**{rec['title']}**\n\n{rec['description']}")
        elif rec['type'] == 'warning':
            st.warning(f"**{rec['title']}**\n\n{rec['description']}")


def render_export():
    """Renderiza opciones de exportación de evaluación"""

    st.subheader("📥 Exportar Reporte de Evaluación")

    if not hasattr(st.session_state, 'performance_summary'):
        st.info("ℹ️ Primero genera el Score Global de Desempeño")
        return

    summary = st.session_state.performance_summary
    recommendations = logic.generate_recommendations(summary)

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("#### Exportar Datos")

        export_data = logic.prepare_evaluation_export(summary, recommendations)

        # Botón de descarga JSON
        json_str = json.dumps(export_data, indent=2, ensure_ascii=False, default=str)
        st.download_button(
            label="💾 Descargar JSON",
            data=json_str,
            file_name="evaluacion_desempeno.json",
            mime="application/json",
            use_container_width=True
        )

    with col2:
        st.markdown("#### Resumen del Reporte")

        st.metric("Score Global", f"{summary['global_performance_score']:.1f}/100")
        st.metric("Completitud Pipeline", f"{summary['pipeline_completeness']['global_completion']:.1f}%")
        st.metric("Recomendaciones", len(recommendations))

        st.info("""
        **Datos incluidos en la exportación:**
        - Score global de desempeño
        - Completitud del pipeline
        - Métricas de calidad de datos
        - Desempeño de modelos
        - Consistencia entre técnicas
        - Recomendaciones de mejora
        """)


def render():
    """Renderiza la página de evaluación de desempeño"""

    show_section_header(
        "Evaluación de Desempeño del Sistema",
        "Métricas, análisis y validación del desempeño de la estrategia computacional de análisis"
    )

    st.markdown("""
    Esta sección **evalúa el desempeño completo** de tu sistema de análisis computacional,
    proporcionando métricas objetivas sobre la **efectividad, calidad y confiabilidad** de los resultados.
    """)

    st.info("""
    **🎯 Cumple con OE4:** Evaluación del desempeño de la estrategia computacional propuesta
    de análisis de contenido textual y procesamiento de lenguaje natural en la identificación
    de factores relevantes.
    """)

    # Pestañas principales
    tab1, tab2, tab3, tab4, tab5, tab6 = st.tabs([
        "📋 Completitud",
        "📊 Calidad de Datos",
        "🤖 Desempeño de Modelos",
        "🔄 Consistencia",
        "🎯 Score Global",
        "📥 Exportación"
    ])

    with tab1:
        render_pipeline_completeness()

    with tab2:
        render_data_quality()

    with tab3:
        render_model_performance()

    with tab4:
        render_technique_consistency()

    with tab5:
        render_global_score()
        st.markdown("---")
        render_recommendations()

    with tab6:
        render_export()
