import { useEffect, useMemo, useState } from 'react';
import { Camera, Save, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export default function MemberProfilePage() {
  const { profile, session, refreshMembership } = useAuth();
  const [form, setForm] = useState({ displayName: '', headline: '', bio: '', skills: '', avatarUrl: '', githubUrl: '', linkedinUrl: '', telegramUrl: '', contactEmail: '', publicListing: false });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const avatarPreview = useMemo(() => avatarFile ? URL.createObjectURL(avatarFile) : form.avatarUrl, [avatarFile, form.avatarUrl]);

  useEffect(() => () => { if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);
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

  return <div>
    <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-white/35">Member profile</p>
    <h1 className="text-4xl font-bold md:text-6xl">Member Card</h1>
    <p className="mt-4 max-w-2xl text-white/50">Build your community profile and choose whether it appears in the public Talkware member network.</p>
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
  </div>;
}
