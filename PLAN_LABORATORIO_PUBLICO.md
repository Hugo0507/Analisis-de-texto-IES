# Plan: Laboratorio Público e Independiente

**Fecha:** 2 de abril de 2026
**Objetivo:** Hacer el módulo Laboratorio 100% público (sin login) y con selección propia de Dataset + DataPreparation, independiente del FilterContext compartido.

---

## Estado actual vs. Deseado

| Aspecto | Ahora | Deseado |
|---|---|---|
| Dashboard (5 tabs) | Público, pero Lab usa endpoints autenticados | 100% público, sin login |
| Lab — selección de dataset | Hereda de FilterContext (sidebar compartido) | Selector propio, independiente |
| Lab — selección de preprocesamiento | No se elige, usa los modelos del dataset seleccionado | Selector de DataPreparation del dataset elegido |
| Lab — workspace | `created_by = request.user` (FK obligatorio) | Funciona sin usuario registrado |
| Lab — stopwords | Endpoint autenticado `/workspace/corpus-stopwords/` | Endpoint público |

---

## Fase A — Backend: Endpoints públicos para el Laboratorio

### A3. Migración: created_by nullable (EJECUTAR PRIMERO)

**Archivo:** `backend/apps/workspace/models.py`

Cambiar:
```python
created_by = models.ForeignKey(User, on_delete=models.CASCADE, ...)
```
A:
```python
created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, ...)
```

Luego ejecutar:
```bash
cd backend && python manage.py makemigrations workspace && python manage.py migrate
```

**Estado:** [x] Completado — `models.py` actualizado + migración `0004_workspace_created_by_nullable.py` creada manualmente (testing settings deshabilita makemigrations)

---

### A2. Endpoints públicos de workspace en public_api

**Archivo:** `backend/apps/public_api/views.py`

Crear `PublicWorkspaceViewSet` con `permission_classes = [AllowAny]`:

```
POST   /api/v1/public/workspace/                    → crear workspace (sin user)
GET    /api/v1/public/workspace/{uuid}/              → obtener workspace + resultados
POST   /api/v1/public/workspace/{uuid}/upload/       → subir PDF
POST   /api/v1/public/workspace/{uuid}/run/          → ejecutar inferencia
GET    /api/v1/public/workspace/{uuid}/export/excel/  → exportar Excel
GET    /api/v1/public/workspace/{uuid}/export/config/ → exportar config JSON
```

Lógica: copiar la lógica esencial de `backend/apps/workspace/views.py` pero:
- Sin filtrar por `created_by=request.user`
- `created_by` se deja como `None` al crear
- Setear `expires_at = now + 48h` para limpieza automática
- El UUID del workspace actúa como token de acceso (quien lo conoce puede usarlo)

**Archivo:** `backend/apps/public_api/urls.py`

Registrar las nuevas rutas del PublicWorkspaceViewSet.

**Estado:** [x] Completado — `PublicWorkspaceViewSet` + `public_corpus_stopwords` añadidos a `public_api/views.py`; rutas registradas en `public_api/urls.py`

---

### A4. Endpoint público de stopwords del corpus

**Archivo:** `backend/apps/public_api/views.py`

Agregar endpoint:
```
GET /api/v1/public/corpus-stopwords/?dataset_id=X
```

Copiar la lógica de `workspace/views.py → corpus_stopwords()` pero con `permission_classes = [AllowAny]`.

**Archivo:** `backend/apps/public_api/urls.py` — registrar ruta.

**Estado:** [x] Completado — incluido en la misma pasada que A2

---

### A1. Verificar endpoint público de DataPreparation

**Archivo:** `backend/apps/public_api/views.py`

Verificar que `PublicDataPreparationViewSet` ya soporta `?dataset_id=X` y retorna solo completados. Si ya funciona, no hay cambio. Si no, agregar el filtro.

**Estado:** [x] Completado — `PublicDataPreparationViewSet` ya filtra por `?dataset_id=X` y `status='completed'`. Sin cambios necesarios.

---

### A5. Limpieza automática de workspaces anónimos (OPCIONAL — después de todo lo demás)

Considerar agregar un management command o señal que limpie workspaces donde:
- `created_by IS NULL`
- `expires_at < now()`

Puede ser un cron o ejecutarse al crear nuevos workspaces.

**Estado:** [ ] Pendiente (baja prioridad)

---

## Fase B — Frontend: Laboratorio independiente

### B2. Crear publicWorkspaceService

**Archivo NUEVO:** `frontend/src/services/publicWorkspaceService.ts`

Usa `publicApiClient` (sin auth) en lugar de `apiClient`:

```typescript
import publicApiClient from './publicApi';

const publicWorkspaceService = {
  // Crear workspace público
  create(datasetId: number, config: WorkspaceConfig): Promise<Workspace> {
    return publicApiClient.post('/public/workspace/', { dataset_id: datasetId, ...config });
  },

  // Subir documento PDF
  uploadDocument(workspaceId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    return publicApiClient.post(`/public/workspace/${workspaceId}/upload/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },

  // Ejecutar inferencia
  runInference(workspaceId: string): Promise<any> {
    return publicApiClient.post(`/public/workspace/${workspaceId}/run/`);
  },

  // Obtener workspace con resultados
  getWorkspace(workspaceId: string): Promise<Workspace> {
    return publicApiClient.get(`/public/workspace/${workspaceId}/`);
  },

  // Obtener stopwords del corpus
  getCorpusStopwords(datasetId: number): Promise<string[]> {
    return publicApiClient.get('/public/corpus-stopwords/', { params: { dataset_id: datasetId } });
  },

  // Exportar Excel
  exportExcel(workspaceId: string): Promise<Blob> {
    return publicApiClient.get(`/public/workspace/${workspaceId}/export/excel/`, {
      responseType: 'blob',
    });
  },

  // Exportar config JSON
  exportConfig(workspaceId: string): Promise<any> {
    return publicApiClient.get(`/public/workspace/${workspaceId}/export/config/`);
  },
};

export default publicWorkspaceService;
```

**Estado:** [x] Completado — `frontend/src/services/publicWorkspaceService.ts` creado usando `publicApiClient`

---

### B1. Selectores propios en LaboratorioDashboard

**Archivo:** `frontend/src/components/templates/LaboratorioDashboard.tsx`

Agregar al inicio del Lab (antes de las 4 stages):

1. **Selector de Dataset** — dropdown con datasets completados
   - Fuente: `publicDatasetsService.getDatasets()`
   - Al cambiar dataset → resetear DataPreparation y modelos

2. **Selector de DataPreparation** — dropdown que aparece al elegir dataset
   - Fuente: `publicDataPreparationService.getDataPreparations({ dataset_id: selectedDatasetId })`
   - Solo muestra preparaciones con `status === 'completed'`
   - Al cambiar preparación → recargar modelos disponibles

Estos selectores son estado LOCAL del componente, NO usan FilterContext.

**Estado:** [x] Completado — Selectores de Dataset + DataPreparation añadidos como estado local en `LaboratorioDashboard`

---

### B3. Actualizar LaboratorioDashboard para usar servicios públicos

**Archivo:** `frontend/src/components/templates/LaboratorioDashboard.tsx`

Cambios:
1. Reemplazar `import workspaceService` → `import publicWorkspaceService`
2. Todas las llamadas `workspaceService.X()` → `publicWorkspaceService.X()`
3. Reemplazar `useFilter().selectedDatasetId` → estado local del componente
4. Cargar modelos disponibles usando el `datasetId` local + `dataPreparationId` seleccionado
5. Filtrar modelos: solo mostrar los que fueron entrenados sobre la DataPreparation seleccionada

**Estado:** [x] Completado — Todas las llamadas a `workspaceService` reemplazadas por `publicWorkspaceService`; `useFilter`/FilterContext eliminados del Lab

---

### B4. Filtrar modelos por DataPreparation seleccionada

**Archivo:** `frontend/src/components/templates/LaboratorioDashboard.tsx`

Al cargar modelos disponibles para el configure stage:
- Los modelos de BoW, TF-IDF, N-gramas, Topic Modeling, BERTopic tienen campo `data_preparation` o `source_type`
- Solo mostrar los que coincidan con la DataPreparation seleccionada
- Si un modelo usó `source_type: 'dataset'` (directo), mostrarlo siempre

Esto se puede hacer con filtrado en frontend (los datos ya vienen del public API) o con query param en backend.

**Estado:** [x] Completado — Modelos filtrados por `data_preparation_name`/`source_name` comparado con la DataPreparation seleccionada

---

## Fase C — Ajustes menores

### C1. No tocar el resto de dashboards

Preprocesamiento, Vectorización, Modelado y Resumen siguen usando FilterContext y publicApiClient exactamente como están. SIN CAMBIOS.

**Estado:** [x] N/A

---

### C2. Mantener endpoints autenticados del workspace

Los endpoints actuales en `/api/v1/workspace/` (autenticados) siguen funcionando para el admin. Coexisten con los nuevos públicos. NO SE ELIMINAN.

**Estado:** [x] N/A

---

### C3. Verificar imports huérfanos

Si `workspaceService` ya no se usa en el Lab, verificar que no quede como import muerto en LaboratorioDashboard.tsx.

**Estado:** [x] Completado — Sin imports huérfanos. `workspaceService`, `useFilter`, `dashboardService`, `ImportConfigResult`, `CreateWorkspacePayload` eliminados correctamente.

---

## Resumen de archivos a tocar

| Archivo | Cambio | Fase |
|---|---|---|
| `backend/apps/workspace/models.py` | `created_by` nullable | A3 |
| `backend/apps/workspace/migrations/` | Nueva migración | A3 |
| `backend/apps/public_api/views.py` | `PublicWorkspaceViewSet` + stopwords endpoint | A2, A4 |
| `backend/apps/public_api/urls.py` | Registrar nuevas rutas | A2, A4 |
| `frontend/src/services/publicWorkspaceService.ts` | **Nuevo** — servicio público | B2 |
| `frontend/src/components/templates/LaboratorioDashboard.tsx` | Selectores propios + usar servicio público | B1, B3, B4 |

**NO se tocan:** App.tsx, FilterContext, otros dashboards, workspace/views.py original.

---

## Orden de ejecución

```
1. A3  → migración created_by nullable
2. A1  → verificar DataPreparation endpoint público
3. A2  → PublicWorkspaceViewSet
4. A4  → endpoint público de stopwords
5. B2  → publicWorkspaceService.ts
6. B1  → selectores propios en Lab
7. B3  → migrar Lab a servicios públicos
8. B4  → filtrar modelos por DataPreparation
9. C3  → limpiar imports
10. A5 → limpieza automática (opcional)
```

---

## Notas

- El UUID del workspace actúa como token de acceso — quien lo conoce puede usarlo
- Los workspaces anónimos expiran en 48h por defecto
- Los endpoints autenticados originales se mantienen intactos para el admin
- El FilterContext sigue funcionando para los otros 4 dashboards sin cambios
