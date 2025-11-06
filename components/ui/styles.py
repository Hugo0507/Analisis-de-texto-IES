"""
Estilos CSS para la aplicación Streamlit
Contiene toda la paleta de colores y estilos personalizados
"""

import streamlit as st


def apply_custom_styles():
    """Aplica los estilos CSS personalizados a la aplicación"""

    st.markdown("""
    <style>
    /* ========== PALETA DE COLORES ========== */
    :root {
        --bg-primary: #1A1A1A;        /* Fondo principal - gris oscuro */
        --bg-secondary: #252525;      /* Fondo secundario - contenedores */
        --bg-tertiary: #2D2D2D;       /* Fondo terciario - hover */
        --text-primary: #F0F0F0;      /* Texto principal - blanco suave */
        --text-secondary: #B0B0B0;    /* Texto secundario */
        --text-muted: #808080;        /* Texto atenuado */
        --accent-primary: #4A90E2;    /* Azul profundo - acción principal */
        --accent-hover: #5BA3F5;      /* Azul más claro - hover */
        --success: #5FB878;           /* Verde tenue - éxito */
        --success-bg: rgba(95, 184, 120, 0.15);  /* Fondo verde semitransparente */
        --warning: #F0AD4E;           /* Amarillo anaranjado - advertencia */
        --warning-bg: rgba(240, 173, 78, 0.15);
        --error: #E57373;             /* Rojo suave - error */
        --error-bg: rgba(229, 115, 115, 0.15);
        --info: #64B5F6;              /* Azul claro - info */
        --info-bg: rgba(100, 181, 246, 0.15);
        --border-subtle: #3A3A3A;     /* Bordes sutiles */
        --border-medium: #4A4A4A;     /* Bordes medios */
    }

    /* ========== FONDO Y BASE ========== */
    .stApp {
        background-color: var(--bg-primary);
        color: var(--text-primary);
    }

    /* Ocultar elementos innecesarios */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}

    /* ========== SIDEBAR ========== */
    [data-testid="stSidebar"] {
        background-color: var(--bg-secondary);
        border-right: 1px solid var(--border-subtle);
    }

    [data-testid="stSidebar"] .stMarkdown {
        color: var(--text-primary);
    }

    /* ========== ENCABEZADOS ========== */
    .section-title {
        font-size: 2rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.3rem;
        letter-spacing: -0.5px;
    }

    .section-description {
        font-size: 0.9rem;
        color: var(--text-secondary);
        margin-bottom: 2rem;
        font-weight: 400;
    }

    h1, h2, h3, h4, h5, h6 {
        color: var(--text-primary) !important;
    }

    /* ========== TABS ========== */
    .stTabs [data-baseweb="tab-list"] {
        gap: 2rem;
        border-bottom: 1px solid var(--border-subtle);
        background-color: transparent;
    }

    .stTabs [data-baseweb="tab"] {
        padding: 0.5rem 0rem;
        font-size: 0.95rem;
        font-weight: 500;
        color: var(--text-muted);
        border-bottom: 2px solid transparent;
        background-color: transparent;
    }

    .stTabs [aria-selected="true"] {
        color: var(--accent-primary);
        border-bottom: 2px solid var(--accent-primary);
    }

    .stTabs [data-baseweb="tab"]:hover {
        color: var(--text-primary);
    }

    /* ========== MÉTRICAS ========== */
    [data-testid="stMetricValue"] {
        font-size: 1.8rem;
        font-weight: 600;
        color: var(--text-primary);
    }

    [data-testid="stMetricLabel"] {
        color: var(--text-secondary);
    }

    /* ========== BOTONES ========== */
    .stButton button {
        border-radius: 0.4rem;
        border: 1px solid var(--border-medium);
        padding: 0.6rem 1.5rem;
        font-weight: 500;
        transition: all 0.2s ease;
        background-color: transparent;
        color: var(--text-primary);
    }

    .stButton button:hover {
        border-color: var(--accent-primary);
        background-color: var(--bg-tertiary);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(74, 144, 226, 0.2);
    }

    /* Botón primario */
    .stButton button[kind="primary"],
    .stButton button[data-testid="baseButton-primary"] {
        background-color: var(--accent-primary);
        color: white;
        border-color: var(--accent-primary);
    }

    .stButton button[kind="primary"]:hover,
    .stButton button[data-testid="baseButton-primary"]:hover {
        background-color: var(--accent-hover);
        border-color: var(--accent-hover);
    }

    /* ========== CAJAS DE MENSAJES ========== */
    /* Success */
    .stSuccess {
        background-color: var(--success-bg) !important;
        border-left: 3px solid var(--success) !important;
        border-radius: 0.4rem;
        padding: 0.75rem 1rem;
        color: var(--text-primary) !important;
    }

    /* Warning */
    .stWarning {
        background-color: var(--warning-bg) !important;
        border-left: 3px solid var(--warning) !important;
        border-radius: 0.4rem;
        padding: 0.75rem 1rem;
        color: var(--text-primary) !important;
    }

    /* Error */
    .stError {
        background-color: var(--error-bg) !important;
        border-left: 3px solid var(--error) !important;
        border-radius: 0.4rem;
        padding: 0.75rem 1rem;
        color: var(--text-primary) !important;
    }

    /* Info */
    .stInfo {
        background-color: var(--info-bg) !important;
        border-left: 3px solid var(--info) !important;
        border-radius: 0.4rem;
        padding: 0.75rem 1rem;
        color: var(--text-primary) !important;
    }

    /* ========== CONTENEDORES Y EXPANDERS ========== */
    .stExpander {
        background-color: var(--bg-secondary);
        border: 1px solid var(--border-subtle);
        border-radius: 0.4rem;
    }

    /* ========== INPUTS ========== */
    .stTextInput input,
    .stNumberInput input,
    .stSelectbox select,
    .stTextArea textarea {
        background-color: var(--bg-secondary) !important;
        color: var(--text-primary) !important;
        border: 1px solid var(--border-medium) !important;
        border-radius: 0.4rem;
    }

    .stTextInput input:focus,
    .stNumberInput input:focus,
    .stSelectbox select:focus,
    .stTextArea textarea:focus {
        border-color: var(--accent-primary) !important;
        box-shadow: 0 0 0 1px var(--accent-primary) !important;
    }

    /* ========== TABLAS ========== */
    .dataframe {
        font-size: 0.9rem;
        color: var(--text-primary) !important;
    }

    .dataframe th {
        background-color: var(--bg-secondary) !important;
        color: var(--text-primary) !important;
        border-bottom: 2px solid var(--border-medium) !important;
    }

    .dataframe td {
        border-bottom: 1px solid var(--border-subtle) !important;
    }

    /* ========== PROGRESS BAR ========== */
    .stProgress > div > div {
        background-color: var(--accent-primary) !important;
    }

    /* ========== ICONOS ========== */
    .stMarkdown svg,
    .stButton svg {
        color: var(--text-primary);
    }

    /* ========== SCROLLBAR ========== */
    ::-webkit-scrollbar {
        width: 10px;
        height: 10px;
    }

    ::-webkit-scrollbar-track {
        background: var(--bg-secondary);
    }

    ::-webkit-scrollbar-thumb {
        background: var(--border-medium);
        border-radius: 5px;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: var(--text-muted);
    }

    /* ========== SELECTBOX DROPDOWN ========== */
    [data-baseweb="select"] {
        background-color: var(--bg-secondary);
    }

    [data-baseweb="popover"] {
        background-color: var(--bg-secondary);
        border: 1px solid var(--border-medium);
    }

    /* ========== CHECKBOX Y RADIO ========== */
    .stCheckbox label,
    .stRadio label {
        color: var(--text-primary) !important;
    }
    </style>
""", unsafe_allow_html=True)
