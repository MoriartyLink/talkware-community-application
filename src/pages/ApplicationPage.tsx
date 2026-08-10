import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import FullPageLoader from '../components/FullPageLoader';

export default function ApplicationPage() {
  const { session, application, loading, refreshMembership, signOut } = useAuth();
  const navigate = useNavigate();
  const metadata = session?.user.user_metadata || {};
  const initialName = useMemo(() => metadata.full_name || metadata.name || '', [metadata.full_name, metadata.name]);
  const [form, setForm] = useState({
    displayName: initialName,
    roleTitle: '',
    interests: '',
    motivation: '',
    phone: '',
    headline: '',
    bio: '',
    githubUrl: '',
    linkedinUrl: '',
    publicListing: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialName) setForm(current => current.displayName ? current : { ...current, displayName: initialName });
  }, [initialName]);

  if (loading) return <FullPageLoader label="Preparing your application…" />;
  if (!session) return <Navigate to="/auth" replace />;
  if (application) return <Navigate to="/application-status" replace />;

  const update = (field: keyof typeof form, value: string | boolean) => setForm(current => ({ ...current, [field]: value }));
  const inputClass = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25 focus:border-white/35';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const profilePayload = {
      user_id: session.user.id,
      display_name: form.displayName.trim(),
      avatar_url: metadata.avatar_url || metadata.picture || null,
      headline: form.headline.trim() || form.roleTitle.trim(),
      bio: form.bio.trim() || null,
      skills: form.interests.split(',').map((item: string) => item.trim()).filter(Boolean),
      github_url: form.githubUrl.trim() || null,
      linkedin_url: form.linkedinUrl.trim() || null,
      public_listing: form.publicListing,
      updated_at: new Date().toISOString(),
    };
    const applicationPayload = {
      user_id: session.user.id,
      email: session.user.email,
      phone: form.phone.trim() || null,
      role_title: form.roleTitle.trim(),
      interests: form.interests.trim(),
      motivation: form.motivation.trim(),
      status: 'pending',
    };

    const profileResult = await supabase.from('member_profiles').upsert(profilePayload, { onConflict: 'user_id' });
    if (profileResult.error) {
      setError(profileResult.error.message);
      setSaving(false);
      return;
    }
    const applicationResult = await supabase.from('membership_applications').insert(applicationPayload);
    if (applicationResult.error) {
      setError(applicationResult.error.message);
      setSaving(false);
      return;
    }
    await refreshMembership();
    navigate('/application-status', { replace: true });
  };

  return (
    <div className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <button onClick={() => signOut()} className="mb-8 inline-flex items-center gap-2 text-sm text-white/45 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Sign out
        </button>
        <form onSubmit={submit} className="glass rounded-3xl p-7 md:p-10">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/35">Community application</p>
          <h1 className="mb-3 text-3xl font-bold md:text-5xl">Tell us about yourself</h1>
          <p className="mb-9 text-white/50">Your Google email is used for sign in. Application answers stay private.</p>
          <div className="grid gap-6 md:grid-cols-2">
            <label className="space-y-2"><span className="text-sm font-semibold">Display name *</span><input className={inputClass} required minLength={2} maxLength={80} value={form.displayName} onChange={e => update('displayName', e.target.value)} /></label>
            <label className="space-y-2"><span className="text-sm font-semibold">Role or title *</span><input className={inputClass} required minLength={2} maxLength={120} placeholder="Frontend developer, student…" value={form.roleTitle} onChange={e => update('roleTitle', e.target.value)} /></label>
            <label className="space-y-2"><span className="text-sm font-semibold">Phone <span className="text-white/30">(optional)</span></span><input className={inputClass} type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} /></label>
            <label className="space-y-2"><span className="text-sm font-semibold">Public headline</span><input className={inputClass} maxLength={120} placeholder="Builder and lifelong learner" value={form.headline} onChange={e => update('headline', e.target.value)} /></label>
            <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Skills and interests *</span><input className={inputClass} required minLength={2} maxLength={500} placeholder="React, product design, AI" value={form.interests} onChange={e => update('interests', e.target.value)} /><span className="block text-xs text-white/30">Separate skills with commas.</span></label>
            <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Why do you want to join? *</span><textarea className={`${inputClass} min-h-32 resize-y`} required minLength={10} maxLength={1200} value={form.motivation} onChange={e => update('motivation', e.target.value)} /></label>
            <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Short public bio</span><textarea className={`${inputClass} min-h-24 resize-y`} maxLength={500} value={form.bio} onChange={e => update('bio', e.target.value)} /></label>
            <label className="space-y-2"><span className="text-sm font-semibold">GitHub URL</span><input className={inputClass} type="url" value={form.githubUrl} onChange={e => update('githubUrl', e.target.value)} /></label>
            <label className="space-y-2"><span className="text-sm font-semibold">LinkedIn URL</span><input className={inputClass} type="url" value={form.linkedinUrl} onChange={e => update('linkedinUrl', e.target.value)} /></label>
          </div>
          <label className="mt-7 flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <input type="checkbox" checked={form.publicListing} onChange={e => update('publicListing', e.target.checked)} className="mt-1 h-4 w-4 accent-white" />
            <span><span className="block font-semibold">Show my profile on the public landing page</span><span className="text-sm text-white/40">Only your display name, avatar, headline, bio, skills, GitHub, and LinkedIn are shown after approval.</span></span>
          </label>
          {error && <div className="mt-6 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}
          <button disabled={saving} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-black hover:bg-white/90 disabled:opacity-50">
            <Send className="h-4 w-4" /> {saving ? 'Submitting…' : 'Submit application'}
          </button>
        </form>
      </div>
    </div>
  );
}
