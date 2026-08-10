import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FullPageLoader from '../components/FullPageLoader';

export default function AuthCallbackPage() {
  const { session, application, staffRole, loading } = useAuth();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setTimedOut(true), 10000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading || !session) return;
    const next = window.sessionStorage.getItem('talkware-auth-next') || '/community';
    window.sessionStorage.removeItem('talkware-auth-next');
    if (application?.status === 'approved' || staffRole) navigate(next, { replace: true });
    else if (application) navigate('/application-status', { replace: true });
    else navigate('/join', { replace: true });
  }, [application, loading, navigate, session, staffRole]);

  if (timedOut && !session) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="glass max-w-md rounded-3xl p-8 text-center">
          <h1 className="mb-3 text-2xl font-bold">Sign in was not completed</h1>
          <p className="mb-6 text-white/50">Please return to the sign-in page and try again.</p>
          <button onClick={() => navigate('/auth', { replace: true })} className="rounded-xl bg-white px-5 py-3 font-bold text-black">Try again</button>
        </div>
      </div>
    );
  }

  return <FullPageLoader label="Completing sign in…" />;
}
