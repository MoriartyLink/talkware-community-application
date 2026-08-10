import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FullPageLoader from './FullPageLoader';

export default function MemberRoute() {
  const { session, application, loading, staffRole } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader label="Checking your membership…" />;
  if (!session) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  if (!application && !staffRole) return <Navigate to="/join" replace />;
  if (application?.status !== 'approved' && !staffRole) return <Navigate to="/application-status" replace />;
  return <Outlet />;
}
