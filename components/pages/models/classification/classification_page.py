"""
Página de Clasificación de Textos
Implementa Naive Bayes, SVM y KNN con sistema de etiquetado
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime
import json
import io

from components.ui.helpers import get_or_load_cached_results, get_connector
from src.models.text_classifier import TextClassifier


def render():
    """Renderiza la página de clasificación de textos"""

    st.title("🤖 Clasificación de Textos")
    st.markdown("""
    ### Modelos de Clasificación Supervisada
    Entrena modelos para clasificar documentos en categorías predefinidas.

    **Modelos Disponibles:**
    - **Naive Bayes**: Clasificador probabilístico rápido
    - **SVM**: Support Vector Machines con kernels
    - **KNN**: K-Nearest Neighbors basado en similitud
    """)

    # Inicializar clasificador
    if 'text_classifier' not in st.session_state:
        st.session_state.text_classifier = TextClassifier()

    # Inicializar etiquetas y resultados con caché
    if 'document_labels' not in st.session_state:
        # Intentar cargar desde caché local
        from src.utils.local_cache import LocalCache
        cache = LocalCache('text_classification')

        cached_data = cache.load()
        if cached_data:
            # Cargar etiquetas (siempre válidas independiente de config)
            st.session_state.document_labels = cached_data.get('labels', {})

            # Los resultados de modelos se invalidarán solo si el usuario
            # intenta entrenar con diferentes parámetros (validación en render_configuration_tab)
            st.session_state.classification_results = cached_data.get('results', {})

            if st.session_state.document_labels:
                st.success(f"✅ Cargadas {len(st.session_state.document_labels)} etiquetas desde caché local")

                # Guardar config en session_state para validar después
                if 'classification_last_config' not in st.session_state:
                    # Intentar obtener config del caché
                    metadata = cache.get_metadata()
                    if metadata and 'config' in metadata:
                        st.session_state.classification_last_config = metadata['config']
        else:
            # Si no hay caché local, intentar Drive
            from components.ui.helpers import get_connector, load_results_from_cache

            connector = get_connector()
            if connector:
                folder_class = st.session_state.persistence_folders.get('12_Classification_Results')

                if folder_class:
                    cached_drive = load_results_from_cache(folder_class, "classification_data.json")

                    if cached_drive:
                        st.session_state.document_labels = cached_drive.get('labels', {})
                        st.session_state.classification_results = cached_drive.get('results', {})

                        # Guardar en caché local
                        cache.save({
                            'labels': st.session_state.document_labels,
                            'results': st.session_state.classification_results
                        }, config={})

                        if st.session_state.document_labels:
                            st.success(f"✅ Cargadas {len(st.session_state.document_labels)} etiquetas desde Google Drive")

        # Si aún no existen, inicializar vacíos
        if 'document_labels' not in st.session_state:
            st.session_state.document_labels = {}
        if 'classification_results' not in st.session_state:
            st.session_state.classification_results = {}

    # Tabs principales
    tabs = st.tabs([
        "🏷️ Etiquetado",
        "⚙️ Configuración",
        "📊 Naive Bayes",
        "🎯 SVM",
        "🔍 KNN",
        "⚖️ Comparación",
        "🔮 Predicción",
        "💾 Persistencia"
    ])

    # Tab 1: Sistema de Etiquetado
    with tabs[0]:
        render_labeling_tab()

    # Tab 2: Configuración y Entrenamiento
    with tabs[1]:
        render_configuration_tab()

    # Tab 3: Resultados Naive Bayes
    with tabs[2]:
        render_model_results_tab("naive_bayes", "Naive Bayes")

    # Tab 4: Resultados SVM
    with tabs[3]:
        render_model_results_tab("svm", "SVM")

    # Tab 5: Resultados KNN
    with tabs[4]:
        render_model_results_tab("knn", "KNN")

    # Tab 6: Comparación
    with tabs[5]:
        render_comparison_tab()

    # Tab 7: Predicción
    with tabs[6]:
        render_prediction_tab()

    # Tab 8: Persistencia
    with tabs[7]:
        render_persistence_tab()


def save_classification_cache(config=None):
    """Guarda automáticamente las etiquetas y resultados en caché con configuración"""
    from src.utils.local_cache import LocalCache
    cache = LocalCache('text_classification')

    data_to_save = {
        'labels': st.session_state.document_labels,
        'results': st.session_state.classification_results
    }

    # Guardar con configuración (siempre pasar config, aunque sea vacío)
    if config:
        cache.save(data_to_save, config=config)
    else:
        cache.save(data_to_save, config={})


def render_labeling_tab():
    """Tab de etiquetado de documentos"""

    st.header("🏷️ Sistema de Etiquetado de Documentos")

    # Verificar documentos preprocesados en session_state o intentar cargar desde Drive
    if 'preprocessed_texts' not in st.session_state or not st.session_state.preprocessed_texts:
        # Intentar cargar desde Drive antes de mostrar warning
        if st.session_state.get('parent_folder_id'):
            with st.spinner("🔍 Buscando datos preprocesados en Drive..."):
                preprocessing_results, folder_id = get_or_load_cached_results(
                    "04_TXT_Preprocessed",
                    "preprocessing_results.json",
                    validate_file_ids=False
                )

                if preprocessing_results and 'documents' in preprocessing_results:
                    # Reconstruir preprocessed_texts desde los resultados
                    preprocessed_texts = {}
                    for doc_name, doc_data in preprocessing_results['documents'].items():
                        # Unir tokens para formar el texto preprocesado
                        preprocessed_texts[doc_name] = ' '.join(doc_data.get('tokens', []))

                    st.session_state.preprocessed_texts = preprocessed_texts
                    st.session_state.preprocessing_results = preprocessing_results
                    st.success(f"✅ Cargados {len(preprocessed_texts)} documentos preprocesados desde Drive")
                else:
                    st.warning("⚠️ No hay documentos preprocesados. Ve a **5. Preprocesamiento** primero.")
                    return
        else:
            st.warning("⚠️ No hay documentos preprocesados. Ve a **5. Preprocesamiento** primero.")
            return

    texts = st.session_state.preprocessed_texts

    st.info(f"📄 Documentos disponibles: **{len(texts)}**")

    # Estadísticas de etiquetado
    col1, col2, col3 = st.columns(3)

    with col1:
        labeled_count = len(st.session_state.document_labels)
        st.metric("Etiquetados", labeled_count)

    with col2:
        unlabeled_count = len(texts) - labeled_count
        st.metric("Sin etiquetar", unlabeled_count)

    with col3:
        if st.session_state.document_labels:
            unique_labels = len(set(st.session_state.document_labels.values()))
            st.metric("Categorías", unique_labels)
        else:
            st.metric("Categorías", 0)

    st.markdown("---")

    # Método de etiquetado
    etiquetado_method = st.radio(
        "Método de etiquetado:",
        ["Manual Individual", "Por Lotes", "Importar CSV", "Etiquetado Automático"]
    )

    if etiquetado_method == "Manual Individual":
        render_manual_labeling(texts)

    elif etiquetado_method == "Por Lotes":
        render_batch_labeling(texts)

    elif etiquetado_method == "Importar CSV":
        render_import_labels()

    elif etiquetado_method == "Etiquetado Automático":
        render_auto_labeling(texts)


def render_manual_labeling(texts):
    """Etiquetado manual individual"""

    st.subheader("Etiquetado Manual")

    # Filtro de documentos
    filter_option = st.selectbox(
        "Mostrar:",
        ["Todos", "Solo sin etiquetar", "Solo etiquetados"]
    )

    # Filtrar documentos
    if filter_option == "Solo sin etiquetar":
        docs_to_show = {k: v for k, v in texts.items()
                       if k not in st.session_state.document_labels}
    elif filter_option == "Solo etiquetados":
        docs_to_show = {k: v for k, v in texts.items()
                       if k in st.session_state.document_labels}
    else:
        docs_to_show = texts

    if not docs_to_show:
        st.info("No hay documentos para mostrar con este filtro.")
        return

    # Selector de documento
    selected_doc = st.selectbox(
        "Seleccionar documento:",
        options=list(docs_to_show.keys())
    )

    # Mostrar preview del documento
    with st.expander("📄 Vista previa del documento", expanded=True):
        preview_text = docs_to_show[selected_doc][:500]
        st.text(preview_text + ("..." if len(docs_to_show[selected_doc]) > 500 else ""))

    # Etiqueta actual
    current_label = st.session_state.document_labels.get(selected_doc, None)

    col1, col2 = st.columns([3, 1])

    with col1:
        # Input de etiqueta
        new_label = st.text_input(
            "Categoría:",
            value=current_label if current_label else "",
            placeholder="Ej: technology, education, healthcare"
        )

    with col2:
        st.write("")
        st.write("")
        if st.button("💾 Guardar", use_container_width=True):
            if new_label.strip():
                st.session_state.document_labels[selected_doc] = new_label.strip().lower()
                save_classification_cache()  # Guardar automáticamente
                st.success(f"✓ Etiqueta guardada: {new_label}")
                st.rerun()
            else:
                st.error("La etiqueta no puede estar vacía")

    # Etiquetas sugeridas (de documentos ya etiquetados)
    if st.session_state.document_labels:
        existing_labels = sorted(set(st.session_state.document_labels.values()))
        st.write("**Etiquetas existentes:**")

        cols = st.columns(min(5, len(existing_labels)))
        for idx, label in enumerate(existing_labels):
            with cols[idx % 5]:
                if st.button(f"🏷️ {label}", key=f"label_{label}_{selected_doc}"):
                    st.session_state.document_labels[selected_doc] = label
                    save_classification_cache()  # Guardar automáticamente
                    st.success(f"✓ Etiqueta '{label}' aplicada")
                    st.rerun()


def render_batch_labeling(texts):
    """Etiquetado por lotes"""

    st.subheader("Etiquetado por Lotes")

    # Selección múltiple de documentos
    docs_list = list(texts.keys())

    selected_docs = st.multiselect(
        "Seleccionar documentos:",
        options=docs_list,
        help="Selecciona múltiples documentos para asignar la misma etiqueta"
    )

    if selected_docs:
        st.info(f"📄 {len(selected_docs)} documentos seleccionados")

        col1, col2 = st.columns([3, 1])

        with col1:
            batch_label = st.text_input(
                "Categoría para todos:",
                placeholder="Ej: technology"
            )

        with col2:
            st.write("")
            st.write("")
            if st.button("💾 Aplicar a todos", use_container_width=True):
                if batch_label.strip():
                    for doc in selected_docs:
                        st.session_state.document_labels[doc] = batch_label.strip().lower()
                    save_classification_cache()  # Guardar automáticamente
                    st.success(f"✓ Etiqueta '{batch_label}' aplicada a {len(selected_docs)} documentos")
                    st.rerun()
                else:
                    st.error("La etiqueta no puede estar vacía")


def render_import_labels():
    """Importar etiquetas desde CSV"""

    st.subheader("Importar Etiquetas desde CSV")

    st.markdown("""
    Sube un archivo CSV con dos columnas:
    - `document`: Nombre del documento (debe coincidir exactamente)
    - `label`: Categoría del documento
    """)

    uploaded_file = st.file_uploader(
        "Seleccionar archivo CSV",
        type=['csv']
    )

    if uploaded_file:
        try:
            df = pd.read_csv(uploaded_file)

            if 'document' not in df.columns or 'label' not in df.columns:
                st.error("❌ El CSV debe tener columnas 'document' y 'label'")
                return

            st.write("**Preview del archivo:**")
            st.dataframe(df.head())

            if st.button("📥 Importar etiquetas"):
                imported_count = 0
                for _, row in df.iterrows():
                    doc_name = row['document']
                    label = str(row['label']).strip().lower()

                    if doc_name in st.session_state.preprocessed_texts:
                        st.session_state.document_labels[doc_name] = label
                        imported_count += 1

                st.success(f"✓ {imported_count} etiquetas importadas correctamente")
                st.rerun()

        except Exception as e:
            st.error(f"❌ Error leyendo CSV: {e}")


def render_auto_labeling(texts):
    """Etiquetado automático basado en palabras clave"""

    st.subheader("Etiquetado Automático")

    st.info("💡 Asigna etiquetas automáticamente basándose en palabras clave")

    # Definir reglas
    st.write("**Definir Reglas de Etiquetado:**")

    if 'auto_label_rules' not in st.session_state:
        st.session_state.auto_label_rules = []

    # Agregar nueva regla
    col1, col2, col3 = st.columns([2, 2, 1])

    with col1:
        rule_label = st.text_input("Etiqueta:", key="new_rule_label")

    with col2:
        rule_keywords = st.text_input(
            "Palabras clave (separadas por comas):",
            key="new_rule_keywords"
        )

    with col3:
        st.write("")
        st.write("")
        if st.button("➕ Agregar"):
            if rule_label and rule_keywords:
                keywords = [k.strip().lower() for k in rule_keywords.split(',')]
                st.session_state.auto_label_rules.append({
                    'label': rule_label.strip().lower(),
                    'keywords': keywords
                })
                st.success(f"✓ Regla agregada")
                st.rerun()

    # Mostrar reglas existentes
    if st.session_state.auto_label_rules:
        st.write("**Reglas Actuales:**")

        for idx, rule in enumerate(st.session_state.auto_label_rules):
            col1, col2, col3 = st.columns([1, 3, 1])

            with col1:
                st.write(f"**{rule['label']}**")

            with col2:
                st.write(f"Keywords: {', '.join(rule['keywords'])}")

            with col3:
                if st.button("🗑️", key=f"del_rule_{idx}"):
                    st.session_state.auto_label_rules.pop(idx)
                    st.rerun()

        st.markdown("---")

        # Aplicar reglas
        if st.button("🚀 Aplicar Etiquetado Automático", type="primary"):
            applied_count = 0

            for doc_name, text in texts.items():
                text_lower = text.lower()

                for rule in st.session_state.auto_label_rules:
                    # Si alguna keyword está en el texto
                    if any(keyword in text_lower for keyword in rule['keywords']):
                        st.session_state.document_labels[doc_name] = rule['label']
                        applied_count += 1
                        break  # Primera regla que coincida

            st.success(f"✓ {applied_count} documentos etiquetados automáticamente")
            st.rerun()


def render_configuration_tab():
    """Tab de configuración y entrenamiento"""

    st.header("⚙️ Configuración y Entrenamiento")

    # Verificar etiquetas
    if not st.session_state.document_labels:
        st.warning("⚠️ No hay documentos etiquetados. Ve a la pestaña **Etiquetado** primero.")
        return

    # Verificar si hay modelos entrenados con configuración diferente
    if st.session_state.classification_results and 'classification_last_config' in st.session_state:
        st.info("💡 Tienes modelos entrenados previamente. Si cambias parámetros críticos (vectorización, max_features, test_size), deberás reentrenar.")

    # Estadísticas
    labels_count = {}
    for label in st.session_state.document_labels.values():
        labels_count[label] = labels_count.get(label, 0) + 1

    st.info(f"📊 **Documentos etiquetados:** {len(st.session_state.document_labels)}")

    # Mostrar distribución
    with st.expander("📈 Distribución de Etiquetas", expanded=True):
        df_dist = pd.DataFrame([
            {'Categoría': label, 'Cantidad': count}
            for label, count in sorted(labels_count.items(), key=lambda x: -x[1])
        ])

        col1, col2 = st.columns([1, 2])

        with col1:
            st.dataframe(df_dist, use_container_width=True)

        with col2:
            fig = px.bar(
                df_dist,
                x='Categoría',
                y='Cantidad',
                title='Documentos por Categoría'
            )
            st.plotly_chart(fig, use_container_width=True)

    st.markdown("---")

    # Configuración de entrenamiento
    st.subheader("Configuración General")

    col1, col2 = st.columns(2)

    with col1:
        vectorizer_type = st.selectbox(
            "Método de vectorización:",
            ["TF-IDF", "Count (BoW)"]
        )

        test_size = st.slider(
            "Tamaño del conjunto de prueba:",
            0.1, 0.4, 0.2, 0.05,
            help="Proporción de datos para testing"
        )

    with col2:
        max_features = st.number_input(
            "Número máximo de features:",
            500, 10000, 5000, 500
        )

        # cv_folds = st.number_input(
        #     "Folds para validación cruzada:",
        #     3, 10, 5, 1
        # )
        # Nota: Cross-validation no implementado actualmente

    st.markdown("---")

    # Configuración por modelo
    st.subheader("Configuración de Modelos")

    model_tabs = st.tabs(["Naive Bayes", "SVM", "KNN"])

    # Config Naive Bayes
    with model_tabs[0]:
        st.write("**Naive Bayes**")

        nb_variant = st.selectbox(
            "Variante:",
            ["multinomial", "complement", "bernoulli"],
            help="Multinomial: frecuencias, Complement: desbalanceados, Bernoulli: binario"
        )

        nb_alpha = st.slider(
            "Alpha (suavizado de Laplace):",
            0.01, 2.0, 1.0, 0.1
        )

    # Config SVM
    with model_tabs[1]:
        st.write("**SVM (Support Vector Machines)**")

        svm_kernel = st.selectbox(
            "Kernel:",
            ["linear", "rbf", "poly", "sigmoid"]
        )

        col1, col2 = st.columns(2)

        with col1:
            svm_c = st.slider(
                "C (parámetro de regularización):",
                0.1, 10.0, 1.0, 0.5
            )

        with col2:
            svm_gamma = st.selectbox(
                "Gamma:",
                ["scale", "auto"]
            )

    # Config KNN
    with model_tabs[2]:
        st.write("**KNN (K-Nearest Neighbors)**")

        col1, col2 = st.columns(2)

        with col1:
            knn_neighbors = st.slider(
                "Número de vecinos (K):",
                1, 20, 5, 1
            )

            knn_weights = st.selectbox(
                "Pesos:",
                ["uniform", "distance"]
            )

        with col2:
            knn_metric = st.selectbox(
                "Métrica de distancia:",
                ["cosine", "euclidean", "manhattan"]
            )

    st.markdown("---")

    # Botón de entrenamiento
    st.subheader("Entrenar Modelos")

    models_to_train = st.multiselect(
        "Seleccionar modelos a entrenar:",
        ["Naive Bayes", "SVM", "KNN"],
        default=["Naive Bayes", "SVM", "KNN"]
    )

    if st.button("🚀 Entrenar Modelos Seleccionados", type="primary", use_container_width=True):

        # Validar que haya al menos 2 clases diferentes
        unique_labels = set(st.session_state.document_labels.values())
        if len(unique_labels) < 2:
            st.error(f"""
            ❌ **Error: Se necesitan al menos 2 clases diferentes para entrenar**

            Actualmente solo tienes documentos etiquetados con: **{', '.join(unique_labels)}**

            **Solución:**
            1. Ve a la pestaña "Etiquetado de Documentos"
            2. Etiqueta documentos con al menos una clase adicional diferente
            3. Por ejemplo, si tienes 'educacion', agrega documentos como 'tecnologia', 'salud', etc.
            4. Necesitas al menos 2 documentos por cada clase

            **Clases actuales:** {len(unique_labels)} clase(s)
            **Documentos etiquetados:** {len(st.session_state.document_labels)}
            """)
            return

        if len(unique_labels) == 2:
            st.info(f"ℹ️ Tienes 2 clases: {', '.join(unique_labels)}. Se recomienda tener al menos 3-5 clases para mejores resultados.")

        with st.spinner("Entrenando modelos..."):

            # Preparar datos
            classifier = st.session_state.text_classifier

            try:
                # Preparar dataset
                classifier.prepare_data(
                    st.session_state.preprocessed_texts,
                    st.session_state.document_labels,
                    vectorizer_type='tfidf' if vectorizer_type == 'TF-IDF' else 'count',
                    max_features=max_features,
                    test_size=test_size,
                    random_state=42
                )

                st.success("✓ Datos preparados correctamente")

                # Entrenar modelos
                results = {}

                if "Naive Bayes" in models_to_train:
                    with st.spinner("Entrenando Naive Bayes..."):
                        nb_result = classifier.train_naive_bayes(
                            variant=nb_variant,
                            alpha=nb_alpha
                        )
                        results['naive_bayes'] = nb_result
                        st.success(f"✓ Naive Bayes: Accuracy = {nb_result['metrics']['accuracy']:.4f}")

                if "SVM" in models_to_train:
                    with st.spinner("Entrenando SVM..."):
                        svm_result = classifier.train_svm(
                            kernel=svm_kernel,
                            C=svm_c,
                            gamma=svm_gamma
                        )
                        results['svm'] = svm_result
                        st.success(f"✓ SVM: Accuracy = {svm_result['metrics']['accuracy']:.4f}")

                if "KNN" in models_to_train:
                    with st.spinner("Entrenando KNN..."):
                        knn_result = classifier.train_knn(
                            n_neighbors=knn_neighbors,
                            weights=knn_weights,
                            metric=knn_metric
                        )
                        results['knn'] = knn_result
                        st.success(f"✓ KNN: Accuracy = {knn_result['metrics']['accuracy']:.4f}")

                # Guardar resultados
                st.session_state.classification_results = results

                # Guardar en caché con configuración
                config = {
                    'vectorizer_type': vectorizer_type,
                    'max_features': max_features,
                    'test_size': test_size,
                    'models_trained': list(results.keys())
                }
                save_classification_cache(config=config)

                # Guardar modelos entrenados en Drive (pickle)
                from components.ui.helpers import get_connector, save_pickle_to_drive

                connector = get_connector()
                if connector and 'persistence_folders' in st.session_state:
                    folder_id = st.session_state.persistence_folders.get('12_Classification_Results')

                    if folder_id:
                        # Guardar cada modelo entrenado
                        for model_key in results.keys():
                            if 'model' in results[model_key]:
                                save_pickle_to_drive(
                                    folder_id,
                                    f'{model_key}_model.pkl',
                                    results[model_key]['model']
                                )

                        # Guardar vectorizador
                        if hasattr(classifier, 'vectorizer') and classifier.vectorizer:
                            save_pickle_to_drive(
                                folder_id,
                                'vectorizer.pkl',
                                classifier.vectorizer
                            )

                        st.info("💾 Modelos guardados en Google Drive")

                st.success("🎉 Todos los modelos entrenados exitosamente!")
                st.balloons()

            except Exception as e:
                st.error(f"❌ Error durante el entrenamiento: {e}")


def render_model_results_tab(model_key, model_name):
    """Renderiza tab de resultados para un modelo específico"""

    st.header(f"📊 Resultados: {model_name}")

    if model_key not in st.session_state.classification_results:
        st.info(f"ℹ️ Entrena el modelo {model_name} en la pestaña **Configuración** primero.")
        return

    results = st.session_state.classification_results[model_key]
    metrics = results['metrics']

    # Métricas principales
    st.subheader("📈 Métricas de Rendimiento")

    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("Accuracy", f"{metrics['accuracy']:.4f}")

    with col2:
        st.metric("Precision", f"{metrics['precision']:.4f}")

    with col3:
        st.metric("Recall", f"{metrics['recall']:.4f}")

    with col4:
        st.metric("F1-Score", f"{metrics['f1']:.4f}")

    # Validación cruzada
    if 'cv_scores' in metrics:
        st.markdown("---")
        st.subheader("🔄 Validación Cruzada")

        cv_scores = metrics['cv_scores']

        col1, col2, col3 = st.columns(3)

        with col1:
            st.metric("Media CV", f"{np.mean(cv_scores):.4f}")

        with col2:
            st.metric("Desv. Estándar", f"{np.std(cv_scores):.4f}")

        with col3:
            st.metric("Rango", f"{np.min(cv_scores):.4f} - {np.max(cv_scores):.4f}")

    st.markdown("---")

    # Matriz de confusión
    st.subheader("🎯 Matriz de Confusión")

    if 'confusion_matrix' in metrics:
        cm = np.array(metrics['confusion_matrix'])
        labels = results.get('class_names', [f"Class {i}" for i in range(len(cm))])

        # Visualizar con plotly
        fig = go.Figure(data=go.Heatmap(
            z=cm,
            x=labels,
            y=labels,
            colorscale='Blues',
            text=cm,
            texttemplate='%{text}',
            textfont={"size": 12}
        ))

        fig.update_layout(
            title=f'Matriz de Confusión - {model_name}',
            xaxis_title='Predicción',
            yaxis_title='Real',
            height=500
        )

        st.plotly_chart(fig, use_container_width=True)

    # Métricas por clase
    if 'classification_report' in results:
        st.markdown("---")
        st.subheader("📊 Métricas por Clase")

        report = results['classification_report']

        # Convertir a DataFrame
        df_report = pd.DataFrame({
            'Clase': list(report.keys()),
            'Precision': [report[k].get('precision', 0) for k in report.keys()],
            'Recall': [report[k].get('recall', 0) for k in report.keys()],
            'F1-Score': [report[k].get('f1-score', 0) for k in report.keys()],
            'Support': [report[k].get('support', 0) for k in report.keys()]
        })

        st.dataframe(df_report, use_container_width=True)

    # Feature importance (solo para NB y SVM lineal)
    if 'feature_importance' in results and results['feature_importance']:
        st.markdown("---")
        st.subheader("🔍 Features Más Importantes")

        feat_imp = results['feature_importance']

        # Top features por clase
        for class_name, features in feat_imp.items():
            with st.expander(f"📌 {class_name}", expanded=False):
                df_feat = pd.DataFrame(features[:20])  # Top 20

                fig = px.bar(
                    df_feat,
                    x='importance',
                    y='feature',
                    orientation='h',
                    title=f'Top 20 Features - {class_name}'
                )
                fig.update_yaxes(autorange="reversed")

                st.plotly_chart(fig, use_container_width=True)


def render_comparison_tab():
    """Tab de comparación entre modelos"""

    st.header("⚖️ Comparación de Modelos")

    if not st.session_state.classification_results:
        st.info("ℹ️ Entrena al menos un modelo para ver comparaciones.")
        return

    results = st.session_state.classification_results

    # Tabla comparativa
    st.subheader("📊 Comparación de Métricas")

    comparison_data = []

    for model_key, model_results in results.items():
        metrics = model_results['metrics']

        model_names = {
            'naive_bayes': 'Naive Bayes',
            'svm': 'SVM',
            'knn': 'KNN'
        }

        comparison_data.append({
            'Modelo': model_names.get(model_key, model_key),
            'Accuracy': metrics['accuracy'],
            'Precision': metrics['precision'],
            'Recall': metrics['recall'],
            'F1-Score': metrics['f1'],
            'CV Mean': np.mean(metrics.get('cv_scores', [0])),
            'CV Std': np.std(metrics.get('cv_scores', [0]))
        })

    df_comparison = pd.DataFrame(comparison_data)

    st.dataframe(
        df_comparison.style.highlight_max(
            subset=['Accuracy', 'Precision', 'Recall', 'F1-Score'],
            color='lightgreen'
        ),
        width='stretch'
    )

    st.markdown("---")

    # Gráfico de barras comparativo
    st.subheader("📈 Visualización Comparativa")

    metrics_to_plot = st.multiselect(
        "Seleccionar métricas:",
        ['Accuracy', 'Precision', 'Recall', 'F1-Score'],
        default=['Accuracy', 'F1-Score']
    )

    if metrics_to_plot:
        df_melted = df_comparison.melt(
            id_vars=['Modelo'],
            value_vars=metrics_to_plot,
            var_name='Métrica',
            value_name='Valor'
        )

        fig = px.bar(
            df_melted,
            x='Modelo',
            y='Valor',
            color='Métrica',
            barmode='group',
            title='Comparación de Modelos'
        )

        st.plotly_chart(fig, use_container_width=True)

    # Mejor modelo
    st.markdown("---")
    st.subheader("🏆 Mejor Modelo")

    best_model_idx = df_comparison['Accuracy'].idxmax()
    best_model = df_comparison.iloc[best_model_idx]

    st.success(f"""
    **{best_model['Modelo']}** tiene la mejor accuracy con **{best_model['Accuracy']:.4f}**

    - Precision: {best_model['Precision']:.4f}
    - Recall: {best_model['Recall']:.4f}
    - F1-Score: {best_model['F1-Score']:.4f}
    """)


def render_prediction_tab():
    """Tab de predicción con nuevos documentos"""

    st.header("🔮 Predicción de Nuevos Documentos")

    if not st.session_state.classification_results:
        st.info("ℹ️ Entrena al menos un modelo primero.")
        return

    # Seleccionar modelo
    available_models = {
        'naive_bayes': 'Naive Bayes',
        'svm': 'SVM',
        'knn': 'KNN'
    }

    trained_models = {k: v for k, v in available_models.items()
                     if k in st.session_state.classification_results}

    selected_model = st.selectbox(
        "Seleccionar modelo:",
        options=list(trained_models.keys()),
        format_func=lambda x: trained_models[x]
    )

    st.markdown("---")

    # Métodos de predicción
    prediction_method = st.radio(
        "Método de predicción:",
        ["Texto directo", "Documentos sin etiquetar"]
    )

    if prediction_method == "Texto directo":
        render_direct_prediction(selected_model)
    else:
        render_unlabeled_prediction(selected_model)


def render_direct_prediction(model_key):
    """Predicción con texto ingresado directamente"""

    st.subheader("Ingresar Texto")

    input_text = st.text_area(
        "Texto a clasificar:",
        height=150,
        placeholder="Ingresa el texto que deseas clasificar..."
    )

    if st.button("🔮 Predecir", type="primary"):
        if not input_text.strip():
            st.error("Por favor ingresa un texto")
            return

        try:
            classifier = st.session_state.text_classifier

            # Predecir
            prediction = classifier.predict([input_text])

            st.success(f"**Predicción: {prediction[0]}**")

            # Probabilidades si están disponibles
            if hasattr(classifier.models.get(model_key), 'predict_proba'):
                proba = classifier.predict_proba(model_key, [input_text])

                st.write("**Probabilidades por clase:**")

                proba_dict = {
                    classifier.label_encoder.inverse_transform([i])[0]: proba[0][i]
                    for i in range(len(proba[0]))
                }

                df_proba = pd.DataFrame([
                    {'Clase': k, 'Probabilidad': v}
                    for k, v in sorted(proba_dict.items(), key=lambda x: -x[1])
                ])

                st.dataframe(df_proba, use_container_width=True)

        except Exception as e:
            st.error(f"Error en predicción: {e}")


def render_unlabeled_prediction(model_key):
    """Predicción de documentos sin etiquetar"""

    st.subheader("Clasificar Documentos sin Etiquetar")

    # Encontrar documentos sin etiquetar
    if 'preprocessed_texts' not in st.session_state:
        st.warning("No hay documentos disponibles")
        return

    unlabeled_docs = {
        k: v for k, v in st.session_state.preprocessed_texts.items()
        if k not in st.session_state.document_labels
    }

    if not unlabeled_docs:
        st.info("✓ Todos los documentos están etiquetados")
        return

    st.info(f"📄 Documentos sin etiquetar: {len(unlabeled_docs)}")

    if st.button("🔮 Predecir Todos", type="primary"):

        with st.spinner("Clasificando documentos..."):
            try:
                classifier = st.session_state.text_classifier

                doc_names = list(unlabeled_docs.keys())
                texts = list(unlabeled_docs.values())

                predictions = classifier.predict(texts)

                # Crear DataFrame con resultados
                results_df = pd.DataFrame({
                    'Documento': doc_names,
                    'Predicción': predictions
                })

                st.success("✓ Predicciones completadas")

                st.dataframe(results_df, use_container_width=True)

                # Opción de guardar predicciones como etiquetas
                if st.button("💾 Guardar Predicciones como Etiquetas"):
                    for doc, pred in zip(doc_names, predictions):
                        st.session_state.document_labels[doc] = pred

                    st.success(f"✓ {len(predictions)} etiquetas guardadas")
                    st.rerun()

            except Exception as e:
                st.error(f"Error: {e}")


def render_persistence_tab():
    """Tab de persistencia"""

    st.header("💾 Persistencia y Exportación")

    # Exportar etiquetas
    st.subheader("📤 Exportar Etiquetas")

    if st.session_state.document_labels:

        df_labels = pd.DataFrame([
            {'document': doc, 'label': label}
            for doc, label in st.session_state.document_labels.items()
        ])

        col1, col2 = st.columns(2)

        with col1:
            csv_labels = df_labels.to_csv(index=False)
            st.download_button(
                "📥 Descargar Etiquetas (CSV)",
                data=csv_labels,
                file_name=f"document_labels_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv"
            )

        with col2:
            json_labels = json.dumps(st.session_state.document_labels, indent=2)
            st.download_button(
                "📥 Descargar Etiquetas (JSON)",
                data=json_labels,
                file_name=f"document_labels_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                mime="application/json"
            )
    else:
        st.info("No hay etiquetas para exportar")

    st.markdown("---")

    # Exportar resultados
    st.subheader("📊 Exportar Resultados de Modelos")

    if st.session_state.classification_results:

        for model_key, results in st.session_state.classification_results.items():

            model_names = {
                'naive_bayes': 'Naive Bayes',
                'svm': 'SVM',
                'knn': 'KNN'
            }

            model_name = model_names.get(model_key, model_key)

            with st.expander(f"📁 {model_name}"):

                # Métricas
                metrics = results['metrics']

                metrics_df = pd.DataFrame([
                    {'Métrica': k, 'Valor': v}
                    for k, v in metrics.items()
                    if not isinstance(v, (list, dict, np.ndarray))
                ])

                csv_metrics = metrics_df.to_csv(index=False)

                st.download_button(
                    f"📥 Descargar Métricas - {model_name}",
                    data=csv_metrics,
                    file_name=f"{model_key}_metrics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                    mime="text/csv",
                    key=f"download_metrics_{model_key}"
                )
    else:
        st.info("No hay resultados para exportar")

    st.markdown("---")

    # Persistencia en Google Drive
    st.subheader("☁️ Guardar en Google Drive")

    if not st.session_state.authenticated:
        st.warning("⚠️ Conéctate a Google Drive primero")
        return

    if st.button("💾 Guardar en Google Drive"):

        folder_key = '12_Classification_Results'

        with st.spinner("Guardando en Google Drive..."):
            try:
                # Guardar etiquetas
                if st.session_state.document_labels:
                    df_labels = pd.DataFrame([
                        {'document': doc, 'label': label}
                        for doc, label in st.session_state.document_labels.items()
                    ])

                    st.session_state.drive_connector.save_dataframe_to_drive(
                        df_labels,
                        f"document_labels_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                        st.session_state.persistence_folders[folder_key]
                    )

                # Guardar resultados de cada modelo
                for model_key, results in st.session_state.classification_results.items():

                    # Métricas
                    metrics = results['metrics']
                    metrics_df = pd.DataFrame([
                        {'Métrica': k, 'Valor': v}
                        for k, v in metrics.items()
                        if not isinstance(v, (list, dict, np.ndarray))
                    ])

                    st.session_state.drive_connector.save_dataframe_to_drive(
                        metrics_df,
                        f"{model_key}_metrics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                        st.session_state.persistence_folders[folder_key]
                    )

                st.success("✓ Resultados guardados en Google Drive")

            except Exception as e:
                st.error(f"Error guardando: {e}")
