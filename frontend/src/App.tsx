/**
 * App Component
 *
 * Main application component with React Router configuration.
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/guards/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import {
  Home,
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
} from './pages';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />

          {/* Admin Authentication Routes */}
          <Route path="/admin" element={<Login />} />
          <Route path="/admin/forgot-password" element={<ForgotPassword />} />

          {/* Protected Dashboard Routes - Analysis Tools */}
          <Route element={<ProtectedRoute />}>
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

            {/* Admin Configuration Routes - Users only */}
            <Route path="/admin/configuracion" element={<MainLayout />}>
              <Route path="usuarios" element={<Users />} />
              <Route path="usuarios/nuevo" element={<UserCreate />} />
              <Route path="usuarios/:id" element={<UserDetail />} />
            </Route>
          </Route>

          {/* Fallback - Redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
