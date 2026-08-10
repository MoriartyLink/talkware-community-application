import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
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
const ApplicationPage = lazy(() => import('./pages/ApplicationPage'));
const ApplicationStatusPage = lazy(() => import('./pages/ApplicationStatusPage'));
const CommunityLayout = lazy(() => import('./components/CommunityLayout'));
const CommunityHomePage = lazy(() => import('./pages/community/CommunityHomePage'));
const CommunityEventsPage = lazy(() => import('./pages/community/CommunityEventsPage'));
const CommunityUpdatesPage = lazy(() => import('./pages/community/CommunityUpdatesPage'));
const MemberPassPage = lazy(() => import('./pages/community/MemberPassPage'));
const MemberProfilePage = lazy(() => import('./pages/community/MemberProfilePage'));

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
                  <Route path="/join" element={<ApplicationPage />} />
                  <Route path="/application-status" element={<ApplicationStatusPage />} />
                  <Route element={<MemberRoute />}>
                    <Route path="/community" element={<CommunityLayout />}>
                      <Route index element={<CommunityHomePage />} />
                      <Route path="events" element={<CommunityEventsPage />} />
                      <Route path="updates" element={<CommunityUpdatesPage />} />
                      <Route path="pass" element={<MemberPassPage />} />
                      <Route path="profile" element={<MemberProfilePage />} />
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
