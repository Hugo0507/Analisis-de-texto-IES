"""
Página de Conexión Google Drive
"""

import streamlit as st
import os
from components.ui.helpers import show_section_header


# Constantes
DEFAULT_DRIVE_FOLDER_URL = "https://drive.google.com/drive/u/2/folders/1tDUZ4PnQen_lSr6z4ZALji2zdtrJf-sS"
DEFAULT_FOLDER_ID = "1tDUZ4PnQen_lSr6z4ZALji2zdtrJf-sS"


def render():
    """Renderiza la página de conexión a Google Drive"""

    show_section_header(
        "Conexión Google Drive",
        "Autentica y conecta con tu carpeta de documentos en Google Drive"
    )

    # Verificar credentials.json
    if not os.path.exists('credentials.json'):
        st.error("❌ No se encontró el archivo `credentials.json`")

        with st.expander("¿Cómo obtener credentials.json?"):
            st.markdown("""
            1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
            2. Crea un proyecto
            3. Habilita Google Drive API
            4. Crea credenciales OAuth 2.0
            5. Descarga el JSON y renombra a `credentials.json`

            **Consulta:** `docs/CONFIGURACION_DRIVE.md`
            """)
        return

    # Estado de conexión
    if st.session_state.authenticated:
        st.success("✓ Conectado a Google Drive")

        st.info(f"**Carpeta configurada:** {DEFAULT_DRIVE_FOLDER_URL}")

        col1, col2 = st.columns([3, 1])
        with col2:
            if st.button("Reconectar", width='stretch'):
                if os.path.exists('token.json'):
                    os.remove('token.json')
                st.session_state.authenticated = False
                st.rerun()
    else:
        st.markdown("""
        Para conectarte, haz clic en el botón. Se abrirá una ventana del navegador
        donde deberás autorizar el acceso de solo lectura a Google Drive.
        """)

        st.warning(
            "⚠️ Verás un mensaje 'Google hasn't verified this app'. "
            "Es normal para apps en desarrollo. Haz clic en 'Advanced' → 'Go to [App Name]'")

        if st.button("Conectar con Google Drive", type="primary", width='stretch'):
            with st.spinner("Conectando..."):
                if st.session_state.drive_connector.authenticate():
                    st.session_state.authenticated = True

                    # Obtener carpeta padre para persistencia
                    parent_id = st.session_state.drive_connector.get_parent_folder_id(DEFAULT_FOLDER_ID)
                    if parent_id:
                        st.session_state.parent_folder_id = parent_id

                    st.success("Conexión exitosa")
                    st.rerun()
                else:
                    st.error("Error en la conexión. Verifica credentials.json")
