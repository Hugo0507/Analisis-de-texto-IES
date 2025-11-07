"""
Página de Análisis de N-gramas
Unigramas, Bigramas, Trigramas y análisis de colocaciones
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime
from components.ui.helpers import (
    show_section_header,
    get_connector,
    save_results_to_cache,
    save_csv_to_drive
)


def render():
    """Renderiza la página de análisis de n-gramas"""

    show_section_header(
        "Análisis de N-gramas",
        "Extracción y análisis de unigramas, bigramas, trigramas y colocaciones"
    )

    # Verificar prerequisitos
    if 'preprocessing_results' not in st.session_state:
        st.warning("⚠️ No hay textos preprocesados. Completa primero el Preprocesamiento.")
        return

    tabs = st.tabs([
        "⚙️ Configuración",
        "1️⃣ Unigramas",
        "2️⃣ Bigramas",
        "3️⃣ Trigramas",
        "🔗 Colocaciones",
        "📊 Comparación",
        "🔍 Patrones",
        "💾 Persistencia"
    ])

    # Tab 1: Configuración
    with tabs[0]:
        render_configuration_tab()

    # Verificar si se ha ejecutado el análisis
    if 'ngram_config' not in st.session_state:
        for i in range(1, 8):
            with tabs[i]:
                st.info("ℹ️ Configura y ejecuta el análisis en la pestaña 'Configuración' primero.")
        return

    # Ejecutar análisis si no existe
    if 'ngram_results' not in st.session_state:
        execute_ngram_analysis()

    # Mostrar resultados
    results = st.session_state.ngram_results

    # Tab 2: Unigramas
    with tabs[1]:
        if '1grams' in results['ngrams']:
            render_ngram_results(results['ngrams']['1grams'], "Unigramas", "🔵")

    # Tab 3: Bigramas
    with tabs[2]:
        if '2grams' in results['ngrams']:
            render_ngram_results(results['ngrams']['2grams'], "Bigramas", "🟢")

    # Tab 4: Trigramas
    with tabs[3]:
        if '3grams' in results['ngrams']:
            render_ngram_results(results['ngrams']['3grams'], "Trigramas", "🟡")

    # Tab 5: Colocaciones
    with tabs[4]:
        render_collocations(results.get('collocations', []))

    # Tab 6: Comparación
    with tabs[5]:
        render_comparison(results)

    # Tab 7: Patrones
    with tabs[6]:
        render_patterns(results.get('patterns', {}))

    # Tab 8: Persistencia
    with tabs[7]:
        render_persistence_tab(results)


def render_configuration_tab():
    """Renderiza la pestaña de configuración"""

    st.markdown("### ⚙️ Configuración de Análisis de N-gramas")

    st.info("""
    **N-gramas** son secuencias de N palabras consecutivas en un texto:
    - **Unigramas** (1-grama): Palabras individuales
    - **Bigramas** (2-grama): Secuencias de 2 palabras
    - **Trigramas** (3-grama): Secuencias de 3 palabras
    - **Colocaciones**: N-gramas estadísticamente significativos (PMI)
    """)

    st.markdown("---")

    # Verificar caché
    from src.utils.local_cache import LocalCache
    cache = LocalCache('ngram_analysis')
    cache_info = cache.get_info()

    if cache_info:
        st.success(f"""
        ✓ **Caché encontrado**
        - Fecha: {cache_info.get('timestamp', 'Desconocida')}
        - Máximo n: {cache_info.get('config', {}).get('max_n', 'N/A')}
        - Documentos: {cache_info.get('metadata', {}).get('document_count', 'N/A')}
        """)

    st.markdown("---")

    st.markdown("**Parámetros del Análisis**")

    col1, col2 = st.columns(2)

    with col1:
        max_n = st.slider(
            "Máximo tamaño de n-grama",
            min_value=1,
            max_value=5,
            value=3,
            help="1=unigramas, 2=bigramas, 3=trigramas, etc."
        )

        top_k = st.slider(
            "Top K n-gramas a mostrar",
            min_value=10,
            max_value=100,
            value=50,
            step=10,
            help="Número de n-gramas más frecuentes a mostrar"
        )

    with col2:
        min_df = st.number_input(
            "Frecuencia mínima de documento",
            min_value=1,
            max_value=10,
            value=2,
            help="N-grama debe aparecer en al menos N documentos"
        )

        max_df = st.slider(
            "Frecuencia máxima de documento (%)",
            min_value=0.5,
            max_value=1.0,
            value=0.95,
            step=0.05,
            help="Filtrar n-gramas que aparecen en más de X% de documentos"
        )

    st.markdown("---")

    # Opciones adicionales
    st.markdown("**Análisis Adicionales**")

    col1, col2 = st.columns(2)

    with col1:
        analyze_collocations = st.checkbox(
            "Analizar Colocaciones (PMI)",
            value=True,
            help="Encuentra bigramas estadísticamente significativos"
        )

    with col2:
        analyze_patterns = st.checkbox(
            "Analizar Patrones",
            value=True,
            help="Busca patrones específicos (palabras repetidas, n-gramas largos, etc.)"
        )

    st.markdown("---")

    # Botón de ejecución
    col1, col2, col3 = st.columns([2, 1, 1])

    with col1:
        if st.button("🚀 Ejecutar Análisis de N-gramas", type="primary", width='stretch'):
            config = {
                'max_n': max_n,
                'top_k': top_k,
                'min_df': min_df,
                'max_df': max_df,
                'analyze_collocations': analyze_collocations,
                'analyze_patterns': analyze_patterns,
                'force_recompute': False
            }
            st.session_state.ngram_config = config
            st.rerun()

    with col2:
        if st.button("🔄 Forzar Re-cálculo", width='stretch'):
            config = {
                'max_n': max_n,
                'top_k': top_k,
                'min_df': min_df,
                'max_df': max_df,
                'analyze_collocations': analyze_collocations,
                'analyze_patterns': analyze_patterns,
                'force_recompute': True
            }
            st.session_state.ngram_config = config
            if 'ngram_results' in st.session_state:
                del st.session_state.ngram_results
            st.rerun()

    with col3:
        if cache_info and st.button("🗑️ Limpiar Caché", width='stretch'):
            cache.clear()
            st.success("Caché limpiado")
            st.rerun()


def execute_ngram_analysis():
    """Ejecuta el análisis de n-gramas"""

    config = st.session_state.ngram_config

    # PASO 1: Intentar cargar desde caché local
    from src.utils.local_cache import LocalCache
    local_cache = LocalCache('ngram_analysis')

    if not config.get('force_recompute', False):
        cached_results = local_cache.load(config=config)
        if cached_results:
            st.success("✅ Resultados cargados desde caché local")
            st.session_state.ngram_results = cached_results
            return

        # PASO 2: Intentar cargar desde Drive si no está en caché local
        from components.ui.helpers import get_connector, load_results_from_cache

        connector = get_connector()
        if connector and 'persistence_folders' in st.session_state:
            folder_id = st.session_state.persistence_folders.get('07_Ngram_Analysis')

            if folder_id:
                with st.spinner("🔍 Buscando resultados previos en Google Drive..."):
                    cached_data = load_results_from_cache(folder_id, 'ngram_analysis_results.json')

                    if cached_data:
                        # Verificar configuración
                        cached_config = cached_data.get('config', {})

                        # Comparar parámetros clave
                        config_matches = (
                            cached_config.get('max_n') == config.get('max_n') and
                            cached_config.get('top_n') == config.get('top_n')
                        )

                        if config_matches:
                            st.success(f"✅ Resumen cargado desde Google Drive (Fecha: {cached_data.get('analysis_date', 'Desconocida')})")

                            # Reconstruir resultados (solo tenemos el resumen, no los datos completos)
                            # Para carga completa, el usuario debe usar LocalCache
                            st.info("💡 Para resultados completos, usa la caché local. Desde Drive solo se carga el resumen.")

                            # Guardar en LocalCache para próxima vez
                            if cached_data.get('ngrams_summary'):
                                # Intentar reconstruir estructura básica
                                reconstructed = {
                                    'ngrams': cached_data['ngrams_summary'],
                                    'collocations': cached_data.get('top_collocations', []),
                                    'patterns': []
                                }
                                local_cache.save(reconstructed, config)
                        else:
                            st.info("⚠️ Configuración cambió, recalculando...")

    # Si no hay caché, procesar
    with st.spinner("🔍 Analizando n-gramas en el corpus... Esto puede tardar unos minutos."):
        from src.models.ngram_analyzer import NgramAnalyzer

        # Obtener textos preprocesados
        preprocessing_results = st.session_state.preprocessing_results
        documents_data = preprocessing_results['documents']

        # Preparar textos (unir tokens)
        texts_dict = {}
        for doc_name, doc_data in documents_data.items():
            text = ' '.join(doc_data['tokens'])
            texts_dict[doc_name] = text

        # Inicializar analizador
        analyzer = NgramAnalyzer()

        # Análisis principal de n-gramas
        st.info("📊 Extrayendo n-gramas...")
        ngram_results = analyzer.analyze_corpus(
            texts_dict,
            max_n=config['max_n'],
            min_df=config['min_df'],
            max_df=config['max_df'],
            top_k=config['top_k']
        )

        # Análisis de colocaciones
        collocations = []
        if config.get('analyze_collocations', True):
            st.info("🔗 Analizando colocaciones...")
            collocations = analyzer.extract_collocations(
                texts_dict,
                n=2,
                min_freq=config['min_df'],
                top_k=config['top_k']
            )

        # Análisis de patrones
        patterns = {}
        if config.get('analyze_patterns', True):
            st.info("🔍 Analizando patrones...")
            patterns = analyzer.analyze_ngram_patterns(texts_dict)

        # Combinar resultados
        results = {
            **ngram_results,
            'collocations': collocations,
            'patterns': patterns
        }

        # Guardar en session state
        st.session_state.ngram_results = results

        # Guardar en caché local
        local_cache.save(
            results=results,
            config=config,
            metadata={
                'document_count': len(texts_dict),
                'max_n': config['max_n']
            }
        )

        # Guardar en Drive
        connector = get_connector()
        if connector and st.session_state.get('parent_folder_id'):
            folder_ng = connector.get_or_create_folder(
                st.session_state.parent_folder_id,
                "09_Ngram_Analysis"
            )
            st.session_state.persistence_folders['09_Ngram_Analysis'] = folder_ng

            # Preparar datos para Drive
            cache_data = {
                'ngrams_summary': {
                    k: {
                        'total_unique': v['total_unique'],
                        'total_occurrences': v['total_occurrences'],
                        'diversity': v['diversity']
                    }
                    for k, v in ngram_results['ngrams'].items()
                },
                'top_collocations': collocations[:20] if collocations else [],
                'config': config,
                'analysis_date': datetime.now().isoformat()
            }

            save_results_to_cache(
                folder_ng,
                "ngram_analysis_results.json",
                cache_data
            )

            # Guardar CSVs con los n-gramas detallados
            # Guardar top n-gramas de cada tipo
            for ngram_type, ngram_data in ngram_results['ngrams'].items():
                if 'top_ngrams' in ngram_data and ngram_data['top_ngrams']:
                    df = pd.DataFrame(ngram_data['top_ngrams'])
                    save_csv_to_drive(folder_ng, f"top_{ngram_type}.csv", df)

            # Guardar colocaciones si existen
            if collocations:
                collocations_df = pd.DataFrame(collocations)
                save_csv_to_drive(folder_ng, "collocations.csv", collocations_df)

            print("✓ N-gramas guardados en CSV para análisis posterior")

    st.success("✅ Análisis de n-gramas completado y guardado")
    st.rerun()


def render_ngram_results(ngram_data: dict, title: str, icon: str):
    """Renderiza resultados de un tipo específico de n-grama"""

    st.markdown(f"### {icon} {title}")

    # Métricas
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("N-gramas Únicos", f"{ngram_data['total_unique']:,}")
    col2.metric("Ocurrencias Totales", f"{ngram_data['total_occurrences']:,}")
    col3.metric("Type-Token Ratio", f"{ngram_data['diversity']['type_token_ratio']:.4f}")
    col4.metric("Entropía Shannon", f"{ngram_data['diversity']['shannon_entropy']:.2f}")

    st.markdown("---")

    # Top n-gramas
    st.markdown(f"**🏆 Top {len(ngram_data['top_ngrams'])} {title}**")

    # Crear DataFrame
    top_df = pd.DataFrame(ngram_data['top_ngrams'])

    # Mostrar tabla
    st.dataframe(
        top_df[['ngram', 'frequency', 'doc_frequency', 'avg_tfidf']].head(20),
        width='stretch'
    )

    # Gráfico de barras
    fig = px.bar(
        top_df.head(30),
        x='frequency',
        y='ngram',
        orientation='h',
        title=f'Top 30 {title} por Frecuencia',
        labels={'frequency': 'Frecuencia', 'ngram': 'N-grama'}
    )
    fig.update_layout(height=800, yaxis={'categoryorder': 'total ascending'})
    st.plotly_chart(fig, width='stretch')

    # Distribución de frecuencias
    st.markdown("---")
    st.markdown("**📊 Distribución de Frecuencias**")

    fig_dist = px.histogram(
        top_df,
        x='frequency',
        nbins=50,
        title=f'Distribución de Frecuencias de {title}',
        labels={'frequency': 'Frecuencia', 'count': 'Cantidad de N-gramas'}
    )
    st.plotly_chart(fig_dist, width='stretch')


def render_collocations(collocations: list):
    """Renderiza análisis de colocaciones"""

    st.markdown("### 🔗 Colocaciones (Bigramas Estadísticamente Significativos)")

    if not collocations:
        st.info("No se encontraron colocaciones. Asegúrate de haber activado el análisis de colocaciones.")
        return

    st.info("""
    **Colocaciones** son bigramas que ocurren juntos más frecuentemente de lo que se esperaría por azar.
    Se miden usando **PMI (Pointwise Mutual Information)**:
    - PMI > 0: Las palabras co-ocurren más de lo esperado
    - PMI < 0: Las palabras co-ocurren menos de lo esperado
    - PMI más alto = Colocación más fuerte
    """)

    # Crear DataFrame
    coll_df = pd.DataFrame(collocations)

    # Métricas
    col1, col2, col3 = st.columns(3)
    col1.metric("Total Colocaciones", len(collocations))
    if 'pmi' in coll_df.columns:
        col2.metric("PMI Promedio", f"{coll_df['pmi'].mean():.2f}")
        col3.metric("PMI Máximo", f"{coll_df['pmi'].max():.2f}")

    st.markdown("---")

    # Tabla de top colocaciones
    st.markdown("**🏆 Top Colocaciones**")
    st.dataframe(coll_df.head(30), width='stretch')

    # Gráfico
    if 'pmi' in coll_df.columns:
        fig = px.bar(
            coll_df.head(30),
            x='pmi',
            y='ngram',
            orientation='h',
            title='Top 30 Colocaciones por PMI',
            labels={'pmi': 'PMI Score', 'ngram': 'Bigrama'}
        )
        fig.update_layout(height=800, yaxis={'categoryorder': 'total ascending'})
        st.plotly_chart(fig, width='stretch')


def render_comparison(results: dict):
    """Renderiza comparación entre tipos de n-gramas"""

    st.markdown("### 📊 Comparación de N-gramas")

    comparison = results.get('comparison', {})

    # Tamaños de vocabulario
    st.markdown("**📚 Tamaños de Vocabulario**")

    vocab_sizes = comparison.get('vocabulary_sizes', {})
    vocab_df = pd.DataFrame([
        {'Tipo': k, 'N-gramas Únicos': v}
        for k, v in vocab_sizes.items()
    ])

    fig_vocab = px.bar(
        vocab_df,
        x='Tipo',
        y='N-gramas Únicos',
        title='Número de N-gramas Únicos por Tipo'
    )
    st.plotly_chart(fig_vocab, width='stretch')

    # Diversidad
    st.markdown("---")
    st.markdown("**🎨 Métricas de Diversidad**")

    diversity_data = []
    for ngram_type, ngram_data in results['ngrams'].items():
        diversity = ngram_data['diversity']
        diversity_data.append({
            'Tipo': ngram_type,
            'Type-Token Ratio': diversity['type_token_ratio'],
            'Entropía Shannon': diversity['shannon_entropy'],
            'Gini Coefficient': diversity['gini_coefficient']
        })

    diversity_df = pd.DataFrame(diversity_data)
    st.dataframe(diversity_df, width='stretch')

    # Gráfico de radar para diversidad
    fig_radar = go.Figure()

    for idx, row in diversity_df.iterrows():
        fig_radar.add_trace(go.Scatterpolar(
            r=[row['Type-Token Ratio'], row['Entropía Shannon']/10, row['Gini Coefficient']],
            theta=['TTR', 'Entropía/10', 'Gini'],
            fill='toself',
            name=row['Tipo']
        ))

    fig_radar.update_layout(
        polar=dict(radialaxis=dict(visible=True, range=[0, 1])),
        title='Comparación de Diversidad entre Tipos de N-gramas'
    )
    st.plotly_chart(fig_radar, width='stretch')


def render_patterns(patterns: dict):
    """Renderiza análisis de patrones"""

    st.markdown("### 🔍 Patrones en N-gramas")

    if not patterns:
        st.info("No hay análisis de patrones disponible.")
        return

    # Palabras repetidas
    if 'repeated_words' in patterns and patterns['repeated_words']:
        st.markdown("**🔁 Bigramas con Palabras Repetidas**")
        repeated_df = pd.DataFrame(patterns['repeated_words'])
        st.dataframe(repeated_df, width='stretch')

    # N-gramas largos
    if 'long_ngrams' in patterns and patterns['long_ngrams']:
        st.markdown("---")
        st.markdown("**📏 N-gramas Largos (4+ palabras)**")
        long_df = pd.DataFrame(patterns['long_ngrams'])
        st.dataframe(long_df.head(20), width='stretch')

    # Palabras comunes al inicio
    if 'common_starters' in patterns and patterns['common_starters']:
        st.markdown("---")
        col1, col2 = st.columns(2)

        with col1:
            st.markdown("**▶️ Palabras Comunes al Inicio de Bigramas**")
            starters_df = pd.DataFrame(patterns['common_starters'])
            fig_start = px.bar(
                starters_df.head(20),
                x='frequency',
                y='word',
                orientation='h',
                title='Top 20 Palabras al Inicio'
            )
            fig_start.update_layout(height=600, yaxis={'categoryorder': 'total ascending'})
            st.plotly_chart(fig_start, width='stretch')

        with col2:
            st.markdown("**⏹️ Palabras Comunes al Final de Bigramas**")
            enders_df = pd.DataFrame(patterns['common_enders'])
            fig_end = px.bar(
                enders_df.head(20),
                x='frequency',
                y='word',
                orientation='h',
                title='Top 20 Palabras al Final'
            )
            fig_end.update_layout(height=600, yaxis={'categoryorder': 'total ascending'})
            st.plotly_chart(fig_end, width='stretch')


def render_persistence_tab(results: dict):
    """Renderiza pestaña de persistencia"""

    st.markdown("### 💾 Persistencia de Resultados")

    st.info("""
    Los resultados están guardados automáticamente en:
    - **Caché local** para carga rápida
    - **Google Drive** para respaldo
    """)

    # Botones de descarga
    st.markdown("**📥 Descargar Resultados (CSV)**")

    cols = st.columns(min(3, len(results['ngrams'])))

    for idx, (ngram_key, ngram_data) in enumerate(results['ngrams'].items()):
        with cols[idx % 3]:
            # Preparar CSV
            csv_data = ngram_data['all_ngrams_df'].to_csv(index=False)

            st.download_button(
                label=f"📥 {ngram_data['ngram_type']}",
                data=csv_data,
                file_name=f"{ngram_key}_analysis.csv",
                mime="text/csv",
                width='stretch'
            )

    # Colocaciones
    if results.get('collocations'):
        st.markdown("---")
        coll_df = pd.DataFrame(results['collocations'])
        csv_coll = coll_df.to_csv(index=False)

        st.download_button(
            label="📥 Descargar Colocaciones (CSV)",
            data=csv_coll,
            file_name="collocations.csv",
            mime="text/csv"
        )

    st.markdown("---")

    st.success("""
    ✅ **Archivos en Google Drive** (carpeta `09_Ngram_Analysis/`):
    - `ngram_analysis_results.json` - Resumen de resultados
    - Caché local para carga rápida en próximas sesiones
    """)
