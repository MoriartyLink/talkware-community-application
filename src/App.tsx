import { BrowserRouter as Router, Navigate, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useState } from "react";
import SplashScreen from "./components/SplashScreen";
import FullPageLoader from "./components/FullPageLoader";
import MemberRoute from "./components/MemberRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { AnimatePresence, motion } from "motion/react";

const LandingPage = lazy(() => import('./pages/LandingPage'));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const ApplicationPage = lazy(() => import('./pages/ApplicationPage'));
const ApplicationStatusPage = lazy(() => import('./pages/ApplicationStatusPage'));
const CommunityLayout = lazy(() => import('./components/CommunityLayout'));
const CommunityHomePage = lazy(() => import('./pages/community/CommunityHomePage'));
const CommunityEventsPage = lazy(() => import('./pages/community/CommunityEventsPage'));
const CommunityUpdatesPage = lazy(() => import('./pages/community/CommunityUpdatesPage'));
const MemberPointsPage = lazy(() => import('./pages/member/MemberPointsPage'));
const MemberProfilePage = lazy(() => import('./pages/community/MemberProfilePage'));
const MiniAppsPage = lazy(() => import('./pages/community/MiniAppsPage'));
const PeerSessionPage = lazy(() => import('./pages/community/PeerSessionPage'));

export default function App() {
  const [showSplash, setShowSplash] = useState(() => window.location.pathname === '/' && window.sessionStorage.getItem('talkware-splash-seen') !== 'true');

  const finishSplash = () => {
    window.sessionStorage.setItem('talkware-splash-seen', 'true');
    setShowSplash(false);
  };

  return (
    <AuthProvider>
      <Router>
        <AnimatePresence mode="wait">
          {showSplash ? (
            <SplashScreen key="splash" onFinish={finishSplash} />
          ) : (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: "easeOut" }}>
              <Suspense fallback={<FullPageLoader />}>
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/event/:id" element={<EventDetailPage />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/auth/callback" element={<AuthCallbackPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route path="/join" element={<ApplicationPage />} />
                  <Route path="/application-status" element={<ApplicationStatusPage />} />
                  <Route element={<MemberRoute />}>
                    <Route path="/community" element={<CommunityLayout />}>
                      <Route index element={<CommunityHomePage />} />
                      <Route path="events" element={<CommunityEventsPage />} />
                      <Route path="updates" element={<CommunityUpdatesPage />} />
                      <Route path="mini-apps" element={<MiniAppsPage />} />
                      <Route path="mini-apps/peer-session" element={<PeerSessionPage />} />
                      <Route path="pass" element={<Navigate to="/community/profile#member-qr" replace />} />
                      <Route path="points" element={<Navigate to="/member/points" replace />} />
                      <Route path="profile" element={<MemberProfilePage />} />
                    </Route>
                    <Route path="/member" element={<CommunityLayout />}>
                      <Route path="points" element={<MemberPointsPage />} />
                    </Route>
                  </Route>
                </Routes>
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </Router>
    </AuthProvider>
  );
}
