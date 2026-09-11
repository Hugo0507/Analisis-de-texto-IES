# Arquitectura

Documento descriptivo del sistema tal como está implementado. Las cifras
provienen de contar el código, no de estimaciones.

## Panorama

Dos aplicaciones independientes que se comunican por HTTP:

```
  React SPA (Vercel)  ──HTTP/JSON──▶  Django REST (Hugging Face Spaces)
                                              │
                                              ├──▶ PostgreSQL (Neon)
                                              ├──▶ Redis / caché en memoria
                                              └──▶ Google Drive (OAuth2)
```

| | Backend | Frontend |
|---|---|---|
| Stack | Django 4.2 + Django REST Framework | React + TypeScript + Tailwind |
| Gráficos | — | Nivo |
| Archivos | 231 `.py` | 115 `.ts`/`.tsx` |
| Líneas | ~36.000 | ~37.800 |
| Despliegue | Hugging Face Spaces (Docker, puerto 7860) | Vercel |

El despliegue del backend no usa el `Dockerfile` del repositorio: el workflow
`.github/workflows/sync.yml` copia `backend/` a un repositorio del Space,
sustituyendo `Dockerfile` por `backend/Dockerfile.hf` y `README.md` por
`backend/README_HF.md`, cuyo frontmatter YAML declara `sdk: docker` y
`app_port: 7860`. Ese archivo es parte del mecanismo de despliegue, no
documentación.

## Backend: organización por apps

No es Clean Architecture. Es una aplicación Django organizada en 17 apps, una
por dominio o por técnica de análisis. El andamiaje de capas de dominio que
existió en `apps/core` nunca llegó a poblarse y se eliminó.

Conviven **dos convenciones**, fruto de dos momentos del proyecto:

**Convención `processor.py`** — ocho apps, una por técnica de análisis. Es la
forma dominante y la que siguen los desarrollos recientes. Cada app contiene
`models.py`, `serializers.py`, `views.py`, `processor.py` y sus migraciones:

`bag_of_words`, `ngram_analysis`, `tfidf_analysis`, `ner_analysis`,
`topic_modeling`, `bertopic`, `lstm_analysis`, `data_preparation`

**Convención `use_cases/` + `services/`** — tres apps de la etapa inicial:

- `analysis` — análisis de factores de transformación digital (OE2) y los
  casos de uso que consume el pipeline.
- `documents` — ingesta, conversión a texto, detección de idioma,
  preprocesamiento.
- `pipeline` — orquestación.

**Apps sin lógica de análisis:**

- `core` — `health_check`, `api_root`, el comando `ensuresuperuser` que
  `startup.sh` ejecuta al arrancar el contenedor, y `nlp/matrix_stats.py`
  con las estadísticas de matriz que comparten `bag_of_words` y
  `ngram_analysis`.
- `infrastructure` — lo externo: `DriveGateway` (OAuth2 con Google Drive) y
  `TripleLayerCacheService`.
- `datasets` — gestión de corpus, extracción de metadatos bibliográficos.
- `users` — autenticación JWT y cifrado de tokens (`encryption.py`).
- `workspace` — el Laboratorio: inferencia sobre modelos ya entrenados.
- `public_api` — superficie de solo lectura para el dashboard público.

### El pipeline

`ExecutePipelineUseCase` recorre 14 etapas declaradas en `STAGE_NAMES`:

```
language_detection → txt_conversion → preprocessing → bow_generation →
tfidf_calculation → lda_training → nmf_training → lsa_training →
plsa_training → topic_comparison → factor_analysis → consolidation →
cache_validation → final_report
```

Cada etapa se registra en `PipelineExecution`, los fallos no detienen la
ejecución, y el progreso se emite por WebSocket vía Django Channels.

El pipeline instancia en su `__init__` siete casos de uso de otras apps:
`DetectLanguageUseCase`, `ConvertDocumentsUseCase`, `PreprocessTextUseCase`,
`GenerateBowUseCase`, `CalculateTfidfUseCase`, `TrainTopicModelsUseCase` y
`AnalyzeFactorsUseCase`. **Esta dependencia no es visible desde `views.py`**:
las clases de `apps/analysis/use_cases/` parecen huérfanas si solo se miran
las vistas, pero son el motor del pipeline.

### Dos superficies de API

- **Administración** — bajo `/api/v1/`, requiere JWT. Una ruta por app.
- **Pública** — bajo `/api/v1/public/`, `AllowAny`, solo lectura. Alimenta el
  dashboard sin autenticación. Son 36 rutas, repartidas en el paquete
  `apps/public_api/views/`: `corpus`, `vectorization`, `modeling` y
  `workspace`, con la paginación compartida en `base`.

### Caché en tres capas

`TripleLayerCacheService` consulta en orden Redis → PostgreSQL → Google Drive.
Si Redis no está disponible, Django cae a caché en memoria.

## Frontend: atomic design

```
src/
  components/
    atoms/       7    Button, Input, Badge, Spinner, ProgressBar, Toast, ContextTooltip
    molecules/   3    MetricCard, StageCard, ChartCard
    organisms/   7    Header, Sidebar, FilterSidebar, DashboardGrid, DonutChartViz,
                      FactorCooccurrenceGraph, ScatterPlotProjection
    templates/   5    los cinco dashboards públicos
  pages/        44    vistas de administración
  services/     28    clientes HTTP
  contexts/      3    AuthContext, ToastContext, FilterContext
  layouts/       2    MainLayout (admin), CommandCenterLayout (dashboard público)
```

Los componentes de cada dashboard viven en `components/organisms/<nombre>/`
—`vectorizacion`, `general`, `laboratorio`, `preprocesamiento` y `modelado`—,
47 archivos en total, y la obtención de datos en `hooks/useVectorizationData`,
`usePreprocessingData` y `useModelingData`.

### Dos zonas

- **`/dashboard/*`** — público, sin autenticación. Cinco dashboards que
  corresponden a las fases del análisis: Preprocesamiento, Vectorización,
  Modelado, Laboratorio y Resumen general. Usan los servicios `public*`.
- **`/admin/*`** — protegido por `ProtectedRoute` y JWT. Las 44 páginas de
  gestión: datasets, preparación de datos y una tríada
  Lista/Crear/Ver por cada técnica de análisis.

Los servicios `public*` son envoltorios finos (24–66 líneas) sobre
`publicApi.ts`; los de administración, más extensos (208–344 líneas), usan
`api.ts` con el interceptor de JWT.

## Deuda conocida

Registrada aquí para que sea visible, no para justificarla:

- **Dashboards aún grandes.** Los cinco templates bajaron de ~9.900 a ~4.400
  líneas: sus componentes presentacionales viven en
  `components/organisms/<dashboard>/` y su fetching en `hooks/use*Data.ts`.
  Lo que queda dentro es JSX acoplado al estado local —la lista de archivos
  de Preprocesamiento, las pestañas de Vectorización—, cuya extracción exige
  diseñar interfaces de props, no solo mover código.
- **Vistas extensas.** `analysis/views.py` (791 líneas) y `workspace/views.py`
  (819) siguen siendo archivos grandes. `public_api` ya se dividió por
  dominio, pero ninguna de las tres tiene `serializers.py` propio: la
  serialización va incrustada en las vistas.
- **Pocos tests en el frontend.** Cuatro archivos de test: dos de componentes
  triviales, más el contrato de los servicios de listado y las utilidades de
  descarga. Los dashboards y las páginas siguen sin cobertura.
- **Imports sin vigilancia.** `backend/.flake8` ignora `F401`, así que los
  imports sin usar no fallan en CI. Se detectan ejecutando `pyflakes`
  directamente.
- **Modelos huérfanos.** `Vocabulary`, `BowMatrix`, `TfidfMatrix`,
  `MatrixStorage`, `Topic` y `DocumentTopic` en `apps/analysis/models.py` solo
  se referencian desde el `admin.py` y los `serializers.py` de su propia app.
  Eliminarlos exige una migración con `DROP TABLE` contra la base de
  producción, por lo que la decisión depende de si contienen datos.

## Verificación

```bash
cd backend  && pytest                  # 259 tests, 83,77% de cobertura
cd frontend && npx tsc --noEmit        # comprobación de tipos
cd frontend && CI=false npm run build  # lo mismo que ejecuta Vercel
```

`.github/workflows/ci-cd.yml` corre siete jobs en cada push: lint y tests de
backend y frontend, build, auditoría de dependencias y construcción de
imágenes Docker.
