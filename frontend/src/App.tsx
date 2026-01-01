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
} from './pages';
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
