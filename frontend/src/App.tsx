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
import {
  Login,
  ForgotPassword,
  Pipeline,
  BagOfWords,
  TfIdf,
  TopicModeling,
  Factors,
  Documents,
  Statistics,
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
import { OAuthCallback } from './pages/OAuthCallback';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/dashboard/pipeline" replace />} />

          {/* Admin Authentication Routes */}
          <Route path="/admin" element={<Login />} />
          <Route path="/admin/forgot-password" element={<ForgotPassword />} />

          {/* OAuth Callback Route (for Google Drive popup) */}
          <Route path="/oauth/callback/google-drive" element={<OAuthCallback />} />

          {/* Public Dashboard Routes - Analysis Tools (NO LOGIN REQUIRED) */}
          <Route path="/dashboard" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard/pipeline" replace />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="documents" element={<Documents />} />
            <Route path="bow" element={<BagOfWords />} />
            <Route path="tfidf" element={<TfIdf />} />
            <Route path="topics" element={<TopicModeling />} />
            <Route path="factors" element={<Factors />} />
            <Route path="statistics" element={<Statistics />} />
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
