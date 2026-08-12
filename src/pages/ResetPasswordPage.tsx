import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import FullPageLoader from '../components/FullPageLoader';
import { useAuth } from '../contexts/AuthContext';

export default function ResetPasswordPage() {
  const { session, loading, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <FullPageLoader label="Opening your password reset…" />;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await updatePassword(password);
      navigate('/community', { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your password could not be updated. Please request a new reset link.');
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-white/10 blur-[140px]" /></div>
      <div className="relative w-full max-w-md">
        <Link to="/auth" className="mb-8 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link>
        <div className="glass rounded-3xl p-8 md:p-10">
          <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-black"><LockKeyhole className="h-7 w-7" /></div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/35">Account security</p>
          <h1 className="mb-3 text-4xl font-bold">Choose a new password</h1>
          {!session ? (
            <><p className="mt-4 leading-relaxed text-white/55">This reset link is invalid or has expired. Request a new link from the sign-in page.</p><Link to="/auth" className="mt-7 inline-flex rounded-xl bg-white px-5 py-3 font-bold text-black">Request another link</Link></>
          ) : (
            <form onSubmit={save} className="mt-7 space-y-3">
              {error && <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
              <input required type="password" minLength={8} autoComplete="new-password" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-white/35" placeholder="New password" value={password} onChange={event => setPassword(event.target.value)} />
              <input required type="password" minLength={8} autoComplete="new-password" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-white/35" placeholder="Confirm new password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />
              <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 font-bold text-black disabled:opacity-50"><LockKeyhole className="h-4 w-4" /> {submitting ? 'Updating…' : 'Update password'}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
