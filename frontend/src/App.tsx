/**
 * App Component
 *
 * Main application component with React Router configuration.
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/guards/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import { CommandCenterLayout } from './layouts/CommandCenterLayout';
import {
  PreprocesamientoDashboard,
  VectorizacionDashboard,
  ModeladoDashboard,
  IADashboard,
  GeneralDashboard,
} from './components/templates';
import {
  Login,
  ForgotPassword,
  Pipeline,
  Users,
  UserCreate,
  UserDetail,
  DatasetList,
  DatasetCreate,
  DatasetView,
  DatasetEdit,
  DataPreparationList,
  DataPreparationCreate,
  DataPreparationView,
} from './pages';
import { FactorsList } from './pages/FactorsList';
import { FactorsCreate } from './pages/FactorsCreate';
import { FactorsView } from './pages/FactorsView';
import { TopicComparison } from './pages/TopicComparison';
import { BagOfWordsList } from './pages/BagOfWordsList';
import { BagOfWordsCreate } from './pages/BagOfWordsCreate';
import { BagOfWordsView } from './pages/BagOfWordsView';
import { BagOfWordsEdit } from './pages/BagOfWordsEdit';
import { NgramsList } from './pages/NgramsList';
import { NgramsCreate } from './pages/NgramsCreate';
import { NgramsView } from './pages/NgramsView';
import { TfIdfList } from './pages/TfIdfList';
import { TfIdfCreate } from './pages/TfIdfCreate';
import { TfIdfView } from './pages/TfIdfView';
import { NerAnalysisList } from './pages/NerAnalysisList';
import { NerAnalysisCreate } from './pages/NerAnalysisCreate';
import { NerAnalysisView } from './pages/NerAnalysisView';
import { TopicModelingList } from './pages/TopicModelingList';
import { TopicModelingCreate } from './pages/TopicModelingCreate';
import { TopicModelingView } from './pages/TopicModelingView';
import { BERTopicList } from './pages/BERTopicList';
import { BERTopicCreate } from './pages/BERTopicCreate';
import { BERTopicView } from './pages/BERTopicView';
import { OAuthCallback } from './pages/OAuthCallback';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Admin Authentication Routes */}
          <Route path="/admin" element={<Login />} />
          <Route path="/admin/forgot-password" element={<ForgotPassword />} />

          {/* OAuth Callback Route (for Google Drive popup) */}
          <Route path="/oauth/callback/google-drive" element={<OAuthCallback />} />

          {/* Command Center Dashboard Routes - Visualization Analytics (NO LOGIN REQUIRED) */}
          <Route path="/dashboard" element={<CommandCenterLayout />}>
            <Route index element={<PreprocesamientoDashboard />} />
            <Route path="preprocesamiento" element={<PreprocesamientoDashboard />} />
            <Route path="vectorizacion" element={<VectorizacionDashboard />} />
            <Route path="modelado" element={<ModeladoDashboard />} />
            <Route path="ia" element={<IADashboard />} />
            <Route path="resumen" element={<GeneralDashboard />} />
          </Route>

          {/* Protected Admin Configuration Routes - Users only (LOGIN REQUIRED) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/admin/configuracion" element={<MainLayout />}>
              <Route path="usuarios" element={<Users />} />
              <Route path="usuarios/nuevo" element={<UserCreate />} />
              <Route path="usuarios/:id" element={<UserDetail />} />
              <Route path="usuarios/:id/editar" element={<UserDetail />} />
              <Route path="datasets" element={<DatasetList />} />
              <Route path="datasets/nuevo" element={<DatasetCreate />} />
              <Route path="datasets/:id" element={<DatasetView />} />
              <Route path="datasets/:id/editar" element={<DatasetEdit />} />
            </Route>

            {/* Pipeline Route */}
            <Route path="/admin/pipeline" element={<MainLayout />}>
              <Route index element={<Pipeline />} />
            </Route>

            {/* Protected Admin Preprocessing Routes (LOGIN REQUIRED) */}
            <Route path="/admin/preprocesamiento" element={<MainLayout />}>
              <Route path="preparacion-datos" element={<DataPreparationList />} />
              <Route path="preparacion-datos/nuevo" element={<DataPreparationCreate />} />
              <Route path="preparacion-datos/:id" element={<DataPreparationView />} />
            </Route>

            {/* Protected Admin Vectorization Routes (LOGIN REQUIRED) */}
            <Route path="/admin/vectorizacion" element={<MainLayout />}>
              <Route path="bolsa-palabras" element={<BagOfWordsList />} />
              <Route path="bolsa-palabras/nuevo" element={<BagOfWordsCreate />} />
              <Route path="bolsa-palabras/:id" element={<BagOfWordsView />} />
              <Route path="bolsa-palabras/:id/editar" element={<BagOfWordsEdit />} />
              <Route path="n-gramas" element={<NgramsList />} />
              <Route path="n-gramas/nuevo" element={<NgramsCreate />} />
              <Route path="n-gramas/:id" element={<NgramsView />} />
              <Route path="tf-idf" element={<TfIdfList />} />
              <Route path="tf-idf/nuevo" element={<TfIdfCreate />} />
              <Route path="tf-idf/:id" element={<TfIdfView />} />
            </Route>

            {/* Protected Admin Modeling Routes (LOGIN REQUIRED) */}
            <Route path="/admin/modelado" element={<MainLayout />}>
              <Route path="ner" element={<NerAnalysisList />} />
              <Route path="ner/nuevo" element={<NerAnalysisCreate />} />
              <Route path="ner/:id" element={<NerAnalysisView />} />
              <Route path="topic-modeling" element={<TopicModelingList />} />
              <Route path="topic-modeling/nuevo" element={<TopicModelingCreate />} />
              <Route path="topic-modeling/:id" element={<TopicModelingView />} />
              <Route path="bertopic" element={<BERTopicList />} />
              <Route path="bertopic/nuevo" element={<BERTopicCreate />} />
              <Route path="bertopic/:id" element={<BERTopicView />} />
            </Route>

            {/* Protected Admin Analysis Routes (LOGIN REQUIRED) */}
            <Route path="/admin/analisis" element={<MainLayout />}>
              <Route path="analisis-de-factores" element={<FactorsList />} />
              <Route path="analisis-de-factores/nuevo" element={<FactorsCreate />} />
              <Route path="analisis-de-factores/:id" element={<FactorsView />} />
              <Route path="topic-benchmark" element={<TopicComparison />} />
            </Route>

          </Route>

          {/* Fallback - Redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
