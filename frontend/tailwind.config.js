/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        // Azul Marino (Navy) - Fondo oscuro principal
        navy: {
          50: '#E3F2FD',
          100: '#BBDEFB',
          200: '#90CAF9',
          300: '#64B5F6',
          400: '#42A5F5',
          500: '#0A1929',   // Principal - Fondo oscuro
          600: '#070F19',
          700: '#050A11',
          800: '#030508',
          900: '#000814',
        },
        // Azul Ciber (Cyber) - Botones y acciones
        cyber: {
          50: '#E3F2FD',
          100: '#BBDEFB',
          200: '#90CAF9',
          300: '#64B5F6',
          400: '#42A5F5',
          500: '#007BFF',   // Principal - Acciones
          600: '#0056b3',
          700: '#004085',
          800: '#002752',
          900: '#001229',
        },
        // Verde (Success) - Estado exitoso
        success: {
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#28A745',   // Principal - Éxito
          600: '#1E7E34',
          700: '#155724',
          800: '#0D3F1A',
          900: '#052710',
        },
        // Gris Claro - Fondos secundarios
        gray: {
          light: '#F0F2F5',
          DEFAULT: '#6c757d',
          dark: '#343a40',
        },
        // Colores adicionales para estados
        warning: {
          500: '#F0AD4E',
        },
        error: {
          500: '#E57373',
        },
        // ── Dashboard público (Centro de Comando) ──────────────────────────
        // Superficies "tinta": fondo, tarjetas, controles y bordes finos.
        ink: {
          950: '#080C16',
          900: '#0D1424',
          850: '#111A2D',
          800: '#162038',
          700: '#1F2A44',
          600: '#2A3754',
        },
        // Texto sobre tinta: principal, secundario y metadatos (≥ 4,5:1 en ink-900).
        paper: '#E6ECF5',
        haze: '#C2CDDC',
        mist: '#97A6BE',
        fog: '#7A89A3',
        // Un tono por sección del pipeline; se usa con moderación y siempre
        // para la misma etapa, de modo que el color indique dónde se está.
        stage: {
          prep: '#5CC8F0',
          vec: '#A78BFA',
          mod: '#F5B94A',
          lab: '#F6809B',
          sum: '#3DD9A0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Instrument Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        'card': '8px',
      },
    },
  },
  plugins: [],
}
