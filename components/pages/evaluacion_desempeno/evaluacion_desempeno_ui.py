"""
Módulo de UI - Evaluación de Desempeño
Dashboard de evaluación del desempeño de la estrategia computacional
"""

import streamlit as st
import plotly.graph_objects as go
import plotly.express as px
import pandas as pd
from components.ui.helpers import show_section_header, show_chart_interpretation
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

    show_chart_interpretation(
        chart_type="Grafico de Barras Horizontales con Escala de Color",
        title="Completitud del Pipeline por Fase",
        interpretation="Esta grafica muestra el porcentaje de completitud de cada fase del pipeline de analisis de texto. El color varia de rojo (baja completitud) a verde (alta completitud), permitiendo identificar rapidamente que etapas del flujo estan completas y cuales requieren atencion. Cada fase tiene tareas asociadas que contribuyen al porcentaje total.",
        what_to_look_for=[
            "**Fases completas (100%)**: Verde indica que todas las tareas de esa fase estan ejecutadas. Fases completas son solidas para la tesis.",
            "**Fases parciales (50-99%)**: Amarillo indica progreso pero con tareas pendientes. Identifica que falta para completarlas.",
            "**Fases incompletas (<50%)**: Rojo indica fases con muchas tareas pendientes que requieren priorizacion inmediata.",
            "**Completitud general**: ¿Que porcentaje del pipeline esta completo? Esto indica la madurez global del sistema de analisis."
        ]
    )

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

            show_chart_interpretation(
                chart_type="Indicador de Gauge (Medidor)",
                title="Tasa de Deteccion de Idiomas",
                interpretation="Este medidor muestra el porcentaje de documentos en los que se detecto exitosamente el idioma. Una tasa alta (>95%) indica que el sistema de deteccion de idiomas funciona correctamente. La linea roja marca el umbral objetivo del 95%. El delta muestra la diferencia con respecto a este objetivo.",
                what_to_look_for=[
                    "**Zona verde (>90%)**: Tasa excelente de deteccion. La mayoria de documentos tienen idioma identificado correctamente.",
                    "**Zona amarilla (70-90%)**: Tasa aceptable pero con margen de mejora. Revisar documentos sin deteccion.",
                    "**Zona roja (<70%)**: Tasa problematica que requiere atencion. Puede indicar problemas con la calidad de los PDFs o configuracion del detector.",
                    "**Delta vs 95%**: ¿Estas por encima o debajo del objetivo? Un delta positivo (verde) es ideal."
                ]
            )

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

            show_chart_interpretation(
                chart_type="Indicador de Gauge (Medidor)",
                title="Tasa de Conversion PDF a TXT",
                interpretation="Este medidor muestra el porcentaje de archivos PDF que se convirtieron exitosamente a texto plano (TXT). La conversion PDF→TXT es critica para el analisis, ya que el texto debe extraerse correctamente. El umbral objetivo es 90% (linea roja). Tasas bajas pueden indicar PDFs corruptos, escaneados sin OCR, o protegidos.",
                what_to_look_for=[
                    "**Zona verde (>90%)**: Conversion excelente. La mayoria de PDFs se procesan correctamente y el texto es extraible.",
                    "**Zona amarilla (70-90%)**: Conversion aceptable pero con perdidas. Identifica archivos problematicos para revision manual.",
                    "**Zona roja (<70%)**: Conversion deficiente que compromete el analisis. Revisa calidad de PDFs o usa herramientas OCR para documentos escaneados.",
                    "**Delta vs 90%**: Un delta positivo indica que superas el objetivo minimo de calidad de conversion."
                ]
            )


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

        show_chart_interpretation(
            chart_type="Grafico de Radar (Spider Chart / Polar Plot)",
            title="Comparacion Multi-dimensional de Modelos",
            interpretation="Este grafico de radar compara multiples modelos de clasificacion (Naive Bayes, SVM, KNN) en 5 dimensiones de desempeno simultaneamente: Accuracy, Precision, Recall, F1-Score y CV Mean. Cada modelo es una linea/area de color. Formas mas grandes (areas que cubren mas del centro) indican mejor desempeno global. Permite identificar fortalezas y debilidades de cada modelo.",
            what_to_look_for=[
                "**Modelo dominante**: ¿Hay un modelo cuya forma abarca consistentemente areas mas grandes en todas las metricas? Ese es el mejor globalmente.",
                "**Especializacion**: ¿Algun modelo sobresale en metricas especificas (ej. Precision alta pero Recall bajo)? Esto indica trade-offs utiles segun el caso de uso.",
                "**Balance**: Modelos con formas regulares (pentagon equilibrado) tienen desempeno balanceado. Formas irregulares muestran desbalance entre metricas.",
                "**CV Mean**: Esta metrica indica estabilidad del modelo. Alto CV Mean sugiere consistencia en cross-validation (menos overfitting)."
            ]
        )

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

            show_chart_interpretation(
                chart_type="Diagrama de Venn Conceptual",
                title="Overlap de Terminos: TF-IDF vs Topics",
                interpretation="Este diagrama de Venn muestra la interseccion entre los terminos mas importantes identificados por TF-IDF y los terminos representativos de Topics (LDA/NMF/BERTopic). La zona de overlap (verde) indica consenso entre ambos metodos. TF-IDF identifica terminos estadisticamente relevantes, mientras que Topic Modeling agrupa terminos semanticamente. Alto overlap valida que ambos metodos convergen en terminos clave.",
                what_to_look_for=[
                    "**Alto overlap (>50%)**: Fuerte consenso entre metodos. Los terminos importantes son consistentes desde multiples perspectivas (estadistica y semantica).",
                    "**Terminos TF-IDF unicos**: Palabras relevantes por frecuencia que no aparecen en topics. Pueden ser terminos generales o transversales.",
                    "**Terminos Topics unicos**: Palabras clave de temas especificos que no destacan en TF-IDF. Representan vocabulario semantico especializado.",
                    "**Validacion cruzada**: Overlap alto aumenta confianza en los resultados. Terminos en la interseccion son los mas robustos para la tesis."
                ]
            )

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

    show_chart_interpretation(
        chart_type="Indicador de Gauge Principal (Score Global)",
        title="Score Global de Desempeno del Sistema",
        interpretation="Este medidor principal resume el desempeno global de toda la estrategia computacional en un score unico (0-100). Combina metricas de completitud del pipeline, calidad de datos, desempeno de modelos y consistencia entre tecnicas. Es el KPI (Key Performance Indicator) mas importante del sistema. Colores: rojo (<40), amarillo (40-60), verde claro (60-80), verde intenso (80-100).",
        what_to_look_for=[
            "**Excelente (80-100)**: Sistema maduro y robusto. Todas las fases funcionan bien, modelos tienen buen desempeno y hay validacion cruzada solida.",
            "**Bueno (60-80)**: Sistema funcional con margen de mejora. Mayoria de componentes operativos pero algunos requieren optimizacion.",
            "**Regular (40-60)**: Sistema en desarrollo con deficiencias. Multiples areas necesitan atencion antes de considerarse production-ready.",
            "**Deficiente (<40)**: Sistema incompleto o con problemas criticos. Revision fundamental necesaria en pipeline, datos o modelos.",
            "**Delta vs 80%**: Un delta positivo (verde) indica que superas el umbral de calidad para la tesis. Delta negativo (rojo) muestra areas de mejora prioritarias."
        ]
    )

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
