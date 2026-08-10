import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Chrome, LockKeyhole, Mail, UserPlus, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import FullPageLoader from '../components/FullPageLoader';

type AuthMode = 'login' | 'register';

export default function AuthPage() {
  const { session, application, staffRole, loading, signInWithGoogle, signInWithPassword, signUpWithPassword, resendSignupConfirmation } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>(() => new URLSearchParams(location.search).get('mode') === 'register' ? 'register' : 'login');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const next = (location.state as { from?: string } | null)?.from || '/community';

  if (loading) return <FullPageLoader label="Loading sign in…" />;
  if (session) {
    if (application?.status === 'approved' || staffRole) return <Navigate to={next} replace />;
    if (application) return <Navigate to="/application-status" replace />;
    return <Navigate to="/join" replace />;
  }

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
    setMessage('');
    setConfirmationPending(false);
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      await signInWithGoogle(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Google sign in could not be started.');
      setSubmitting(false);
    }
  };

  const handleEmail = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'register') {
        if (form.password !== form.confirmPassword) throw new Error('Passwords do not match.');
        const needsConfirmation = await signUpWithPassword(form.name, form.email, form.password);
        if (needsConfirmation) {
          setMessage('Check your email to confirm your account. After confirmation, sign in and complete your community application.');
          setConfirmationPending(true);
          setSubmitting(false);
        }
      } else {
        await signInWithPassword(form.email, form.password);
      }
    } catch (caught) {
      const code = typeof caught === 'object' && caught && 'code' in caught ? String(caught.code) : '';
      setError(code === 'email_address_not_authorized'
        ? 'This Supabase project is still using its restricted default email sender. Configure custom SMTP before public members can register.'
        : caught instanceof Error ? caught.message : 'Authentication failed. Please try again.');
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setSubmitting(true);
    setError('');
    try {
      await resendSignupConfirmation(form.email);
      setMessage('A new confirmation email was requested. Check your inbox and spam folder.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The confirmation email could not be resent.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-white outline-none placeholder:text-white/25 focus:border-white/35';

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-white/10 blur-[140px]" />
      </div>
      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to Talkware
        </Link>
        <div className="glass rounded-3xl p-8 md:p-10">
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-black">
            <Users className="h-7 w-7" />
          </div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/35">Member community</p>
          <h1 className="mb-3 text-4xl font-bold">{mode === 'register' ? 'Join Talkware' : 'Member sign in'}</h1>
          <p className="mb-7 leading-relaxed text-white/55">
            {mode === 'register' ? 'Create an account, then submit your community membership application.' : 'Sign in to check your application or open the member community.'}
          </p>

          <div className="mb-6 grid grid-cols-2 rounded-xl bg-white/5 p-1">
            <button type="button" onClick={() => changeMode('login')} className={`rounded-lg px-3 py-2.5 text-sm font-bold ${mode === 'login' ? 'bg-white text-black' : 'text-white/45'}`}>Sign in</button>
            <button type="button" onClick={() => changeMode('register')} className={`rounded-lg px-3 py-2.5 text-sm font-bold ${mode === 'register' ? 'bg-white text-black' : 'text-white/45'}`}>Create account</button>
          </div>

          {error && <div className="mb-5 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
          {message && <div className="mb-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm leading-relaxed text-emerald-100">{message}</div>}
          {confirmationPending && <div className="mb-5 flex flex-wrap items-center gap-3 text-xs text-white/45"><button type="button" disabled={submitting} onClick={handleResend} className="font-bold text-white hover:underline disabled:opacity-50">Resend confirmation</button>{['localhost', '127.0.0.1'].includes(window.location.hostname) && <a href="http://127.0.0.1:55324" target="_blank" rel="noreferrer" className="font-bold text-white hover:underline">Open local email inbox</a>}</div>}

          <form onSubmit={handleEmail} className="space-y-3">
            {mode === 'register' && <div className="relative"><UserPlus className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" /><input required minLength={2} maxLength={80} autoComplete="name" className={inputClass} placeholder="Your name" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></div>}
            <div className="relative"><Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" /><input required type="email" autoComplete="email" className={inputClass} placeholder="Email address" value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /></div>
            <div className="relative"><LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" /><input required type="password" minLength={8} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} className={inputClass} placeholder="Password" value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} /></div>
            {mode === 'register' && <div className="relative"><LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" /><input required type="password" minLength={8} autoComplete="new-password" className={inputClass} placeholder="Confirm password" value={form.confirmPassword} onChange={event => setForm(current => ({ ...current, confirmPassword: event.target.value }))} /></div>}
            <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 font-bold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50">
              {mode === 'register' ? <UserPlus className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}
              {submitting ? 'Please wait…' : mode === 'register' ? 'Create account & apply' : 'Sign in with email'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/25"><span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" /></div>
          <button onClick={handleGoogle} disabled={submitting} className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 px-5 py-3.5 font-bold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
            <Chrome className="h-5 w-5" /> Continue with Google
          </button>
          <p className="mt-6 text-center text-xs leading-relaxed text-white/30">
            New accounts complete a short member application. Community access starts after admin approval.
          </p>
        </div>
      </div>
    </div>
  );
}
