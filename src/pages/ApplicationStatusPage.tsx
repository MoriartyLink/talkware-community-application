import { Navigate } from 'react-router-dom';
import { CheckCircle2, Clock3, LogOut, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import FullPageLoader from '../components/FullPageLoader';

export default function ApplicationStatusPage() {
  const { session, application, staffRole, loading, signOut } = useAuth();
  if (loading) return <FullPageLoader label="Checking application status…" />;
  if (!session) return <Navigate to="/auth" replace />;
  if (application?.status === 'approved' || staffRole) return <Navigate to="/community" replace />;
  if (!application) return <Navigate to="/join" replace />;

  const rejected = application.status === 'rejected';
  return (
    <div className="min-h-screen bg-black px-6 text-white flex items-center justify-center">
      <div className="glass w-full max-w-lg rounded-3xl p-8 text-center md:p-12">
        <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${rejected ? 'bg-red-400/10 text-red-300' : 'bg-amber-400/10 text-amber-300'}`}>
          {rejected ? <XCircle className="h-8 w-8" /> : <Clock3 className="h-8 w-8" />}
        </div>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/35">Application {application.status}</p>
        <h1 className="mb-4 text-3xl font-bold">{rejected ? 'We could not approve this application' : 'Your application is being reviewed'}</h1>
        <p className="mb-7 leading-relaxed text-white/50">
          {rejected ? 'You can contact the Talkware team if you believe this needs another review.' : 'Once an admin approves your application, sign in again to open the member community.'}
        </p>
        {application.admin_note && <div className="mb-7 rounded-2xl bg-white/5 p-4 text-left text-sm text-white/60"><span className="mb-1 block font-bold text-white">Review note</span>{application.admin_note}</div>}
        <div className="mb-7 flex items-center justify-center gap-2 text-sm text-white/35"><CheckCircle2 className="h-4 w-4" /> Submitted {new Date(application.submitted_at).toLocaleDateString()}</div>
        <button onClick={() => signOut()} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 font-semibold hover:bg-white/10"><LogOut className="h-4 w-4" /> Sign out</button>
      </div>
    </div>
  );
}
