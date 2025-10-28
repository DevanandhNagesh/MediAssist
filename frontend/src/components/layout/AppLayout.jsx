import { Container } from 'react-bootstrap';
import { Outlet } from 'react-router-dom';
import { Suspense } from 'react';
import AppNavbar from './AppNavbar.jsx';
import LoadingSpinner from '../shared/LoadingSpinner.jsx';

const AppLayout = () => (
  <div className="app-shell">
    <AppNavbar />
    <main className="py-4">
      <Container>
  <Suspense fallback={<LoadingSpinner message="Loading module..." />}>
          <Outlet />
        </Suspense>
      </Container>
    </main>
    <footer className="app-footer text-center py-3">
      <small>&copy; {new Date().getFullYear()} MediAssist AI. Empowering smarter healthcare decisions.</small>
    </footer>
  </div>
);

export default AppLayout;
