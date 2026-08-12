import { useEffect, useMemo, useState } from 'react';
import { Camera, ChevronDown, KeyRound, Mail, QrCode, Save, Trash2, Upload } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import MemberPassCard from '../../components/MemberPassCard';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export default function MemberProfilePage() {
  const location = useLocation();
  const { profile, session, refreshMembership, sendPasswordReset, updatePassword } = useAuth();
  const [form, setForm] = useState({ displayName: '', headline: '', bio: '', skills: '', avatarUrl: '', githubUrl: '', linkedinUrl: '', telegramUrl: '', contactEmail: '', publicListing: false });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [passwordNotice, setPasswordNotice] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [qrOpen, setQrOpen] = useState(() => window.location.hash === '#member-qr');
  const avatarPreview = useMemo(() => avatarFile ? URL.createObjectURL(avatarFile) : form.avatarUrl, [avatarFile, form.avatarUrl]);

  useEffect(() => () => { if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);
  useEffect(() => {
    if (location.hash === '#member-qr') setQrOpen(true);
  }, [location.hash]);
  useEffect(() => {
    if (!profile) return;
    setForm({
      displayName: profile.display_name,
      headline: profile.headline || '',
      bio: profile.bio || '',
      skills: profile.skills.join(', '),
      avatarUrl: profile.avatar_url || '',
      githubUrl: profile.github_url || '',
      linkedinUrl: profile.linkedin_url || '',
      telegramUrl: profile.telegram_url || '',
      contactEmail: profile.contact_email || '',
      publicListing: profile.public_listing,
    });
  }, [profile]);
  const update = (field: keyof typeof form, value: string | boolean) => setForm(current => ({ ...current, [field]: value }));
  const inputClass = 'w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/35';

  const chooseAvatar = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setNotice('Please choose an image file.'); return; }
    if (file.size > MAX_AVATAR_BYTES) { setNotice('Profile images must be 5 MB or smaller.'); return; }
    setNotice('');
    setAvatarFile(file);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session?.user) return;
    setSaving(true);
    setNotice('');
    let avatarUrl = form.avatarUrl.trim() || null;
    try {
      if (avatarFile) {
        const extension = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg';
        const path = `member-avatars/${session.user.id}/${crypto.randomUUID()}.${extension}`;
        const upload = await supabase.storage.from('assets').upload(path, avatarFile, { contentType: avatarFile.type, upsert: false });
        if (upload.error) throw upload.error;
        avatarUrl = supabase.storage.from('assets').getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from('member_profiles').update({
        display_name: form.displayName.trim(),
        headline: form.headline.trim() || null,
        bio: form.bio.trim() || null,
        skills: form.skills.split(',').map(item => item.trim()).filter(Boolean),
        avatar_url: avatarUrl,
        github_url: form.githubUrl.trim() || null,
        linkedin_url: form.linkedinUrl.trim() || null,
        telegram_url: form.telegramUrl.trim() || null,
        contact_email: form.contactEmail.trim() || null,
        public_listing: form.publicListing,
        updated_at: new Date().toISOString(),
      }).eq('user_id', session.user.id);
      if (error) throw error;
      setAvatarFile(null);
      setForm(current => ({ ...current, avatarUrl: avatarUrl || '' }));
      setNotice('Member Card saved.');
      await refreshMembership();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to save your Member Card.');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordNotice('');
    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordNotice('Passwords do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      await updatePassword(passwordForm.password);
      setPasswordForm({ password: '', confirmPassword: '' });
      setPasswordNotice('Password updated successfully.');
    } catch (error) {
      setPasswordNotice(error instanceof Error ? error.message : 'Unable to update your password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const emailResetLink = async () => {
    if (!session?.user.email) return;
    setPasswordSaving(true);
    setPasswordNotice('');
    try {
      await sendPasswordReset(session.user.email);
      setPasswordNotice('A password reset link was sent to your account email.');
    } catch (error) {
      setPasswordNotice(error instanceof Error ? error.message : 'Unable to send a password reset link.');
    } finally {
      setPasswordSaving(false);
    }
  };

  return <div>
    <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-white/35">Member profile</p>
    <h1 className="text-4xl font-bold md:text-6xl">Member Card</h1>
    <p className="mt-4 max-w-2xl text-white/50">Build your community profile and choose whether it appears in the public Talkware member network.</p>
    <section id="member-qr" className="glass mt-9 max-w-3xl scroll-mt-24 rounded-3xl p-5 md:p-6">
      <button type="button" onClick={() => setQrOpen(current => !current)} aria-expanded={qrOpen} aria-controls="member-qr-card" className="flex w-full items-center justify-between gap-4 text-left">
        <span className="flex items-center gap-3"><span className="rounded-xl bg-white/5 p-2.5"><QrCode className="h-5 w-5 text-white/55" /></span><span><span className="block text-xs font-bold uppercase tracking-[0.22em] text-white/35">Attendance pass</span><span className="mt-1 block text-xl font-bold">My member QR</span></span></span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-white/40 transition-transform ${qrOpen ? 'rotate-180' : ''}`} />
      </button>
      {qrOpen && <div id="member-qr-card" className="mt-6 border-t border-white/10 pt-6"><p className="mb-5 max-w-2xl text-sm text-white/45">Show this pass to an organizer at a registered event. It contains an opaque token and no personal information.</p><MemberPassCard /></div>}
    </section>
    <form onSubmit={save} className="glass mt-9 max-w-3xl rounded-3xl p-5 md:p-8">
      <section className="mb-7 flex flex-col gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/15 bg-white/5">
          {avatarPreview ? <img src={avatarPreview} alt="Profile preview" className="h-full w-full object-cover" /> : <Camera className="h-8 w-8 text-white/20" />}
        </div>
        <div className="flex-1"><h2 className="font-bold">Profile image</h2><p className="mt-1 text-sm text-white/40">Upload JPG, PNG, or WebP up to 5 MB.</p><div className="mt-4 flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-black"><Upload className="h-4 w-4" /> Choose image<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => { chooseAvatar(event.target.files?.[0]); event.target.value = ''; }} /></label>{(avatarPreview || avatarFile) && <button type="button" onClick={() => { setAvatarFile(null); update('avatarUrl', ''); }} className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 px-4 py-2.5 text-sm font-bold text-red-300"><Trash2 className="h-4 w-4" /> Remove</button>}</div></div>
      </section>
      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2"><span className="text-sm font-semibold">Display name</span><input required minLength={2} maxLength={80} className={inputClass} value={form.displayName} onChange={e => update('displayName', e.target.value)} /></label>
        <label className="space-y-2"><span className="text-sm font-semibold">Headline</span><input maxLength={120} className={inputClass} value={form.headline} onChange={e => update('headline', e.target.value)} /></label>
        <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Bio</span><textarea maxLength={500} className={`${inputClass} min-h-28`} value={form.bio} onChange={e => update('bio', e.target.value)} /></label>
        <label className="space-y-2 md:col-span-2"><span className="text-sm font-semibold">Skills</span><input className={inputClass} value={form.skills} onChange={e => update('skills', e.target.value)} placeholder="React, Design, AI" /></label>
        <label className="space-y-2"><span className="text-sm font-semibold">LinkedIn URL</span><input type="url" className={inputClass} value={form.linkedinUrl} onChange={e => update('linkedinUrl', e.target.value)} /></label>
        <label className="space-y-2"><span className="text-sm font-semibold">Telegram URL</span><input type="url" className={inputClass} value={form.telegramUrl} onChange={e => update('telegramUrl', e.target.value)} placeholder="https://t.me/username" /></label>
        <label className="space-y-2"><span className="text-sm font-semibold">Public contact email</span><input type="email" maxLength={320} className={inputClass} value={form.contactEmail} onChange={e => update('contactEmail', e.target.value)} placeholder="hello@example.com" /></label>
        <label className="space-y-2"><span className="text-sm font-semibold">GitHub URL</span><input type="url" className={inputClass} value={form.githubUrl} onChange={e => update('githubUrl', e.target.value)} /></label>
      </div>
      <label className="mt-7 flex items-start gap-3 rounded-2xl bg-white/5 p-4"><input className="mt-1 h-4 w-4 accent-white" type="checkbox" checked={form.publicListing} onChange={e => update('publicListing', e.target.checked)} /><span><span className="block font-semibold">Show my Member Card publicly</span><span className="text-sm text-white/40">When enabled, your profile and the contact details above appear in the landing-page and member networks. You can turn this off at any time.</span></span></label>
      {notice && <div className="mt-6 rounded-xl border border-white/10 p-3 text-sm text-white/60">{notice}</div>}
      <button disabled={saving} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-black disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save Member Card'}</button>
    </form>
    <section className="glass mt-7 max-w-3xl rounded-3xl p-5 md:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/35">Account security</p>
      <h2 className="mt-2 text-2xl font-bold">Password</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/45">Choose a new password here, or email yourself a secure reset link if you prefer.</p>
      <form onSubmit={savePassword} className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2"><span className="text-sm font-semibold">New password</span><input required type="password" minLength={8} autoComplete="new-password" className={inputClass} value={passwordForm.password} onChange={event => setPasswordForm(current => ({ ...current, password: event.target.value }))} /></label>
        <label className="space-y-2"><span className="text-sm font-semibold">Confirm new password</span><input required type="password" minLength={8} autoComplete="new-password" className={inputClass} value={passwordForm.confirmPassword} onChange={event => setPasswordForm(current => ({ ...current, confirmPassword: event.target.value }))} /></label>
        <div className="flex flex-wrap gap-3 md:col-span-2">
          <button disabled={passwordSaving} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-black disabled:opacity-50"><KeyRound className="h-4 w-4" /> {passwordSaving ? 'Please wait…' : 'Change password'}</button>
          {session?.user.email && <button type="button" disabled={passwordSaving} onClick={emailResetLink} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 font-bold text-white disabled:opacity-50"><Mail className="h-4 w-4" /> Email reset link</button>}
        </div>
      </form>
      {passwordNotice && <div className="mt-5 rounded-xl border border-white/10 p-3 text-sm text-white/60">{passwordNotice}</div>}
    </section>
  </div>;
}
