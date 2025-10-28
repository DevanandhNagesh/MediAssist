import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import ProtectedRoute from './components/shared/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import DiagnosisPage from './pages/DiagnosisPage.jsx';
import PrescriptionPage from './pages/PrescriptionPage.jsx';
import KnowledgePage from './pages/KnowledgePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import MedicineLogsPage from './pages/MedicineLogsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

const App = () => (
  <Routes>
    {/* Public routes */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />

    {/* Protected routes with layout */}
    <Route path="/" element={<AppLayout />}>
      <Route index element={<HomePage />} />
      
      {/* All features require authentication */}
      <Route path="diagnosis" element={
        <ProtectedRoute>
          <DiagnosisPage />
        </ProtectedRoute>
      } />
      <Route path="prescription" element={
        <ProtectedRoute>
          <PrescriptionPage />
        </ProtectedRoute>
      } />
      <Route path="knowledge" element={
        <ProtectedRoute>
          <KnowledgePage />
        </ProtectedRoute>
      } />
      
      {/* Dashboard and Medicine Logging */}
      <Route path="dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="medicine-logs" element={
        <ProtectedRoute>
          <MedicineLogsPage />
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);

export default App;
