import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarClock, Coins, Filter, Handshake, MessageSquareText, Search, ShieldCheck, Sparkles, UserRound, Users, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { PeerSessionMember, PeerSessionPreference, PeerSessionRequest, PeerSessionStatus } from '../../types/community';

type View = 'overview' | 'discover' | 'requests' | 'settings';
type MemberFilter = 'all' | 'creators' | 'mentors' | 'available';
type Duration = 15 | 30 | 60;

const DURATIONS: readonly { minutes: Duration; cost: number }[] = [
  { minutes: 15, cost: 50 },
  { minutes: 30, cost: 100 },
  { minutes: 60, cost: 200 },
];
const STATUS_STYLES: Record<PeerSessionStatus, string> = {
  pending: 'bg-amber-300/10 text-amber-200', accepted: 'bg-sky-300/10 text-sky-200',
  completed: 'bg-emerald-300/10 text-emerald-200', declined: 'bg-rose-300/10 text-rose-200',
  cancelled: 'bg-white/5 text-white/45',
};

function preferenceOf(member: PeerSessionMember) {
  return Array.isArray(member.peer_session_preferences)
    ? member.peer_session_preferences[0]
    : member.peer_session_preferences;
}

function memberBadge(member: PeerSessionMember) {
  const headline = member.headline?.toLowerCase() || '';
  if (headline.includes('mentor')) return 'Mentor';
  if (headline.includes('creator')) return 'Creator';
  return null;
}

export default function PeerSessionPage() {
  const { session } = useAuth();
  const [view, setView] = useState<View>('overview');
  const [members, setMembers] = useState<PeerSessionMember[]>([]);
  const [requests, setRequests] = useState<PeerSessionRequest[]>([]);
  const [preference, setPreference] = useState<PeerSessionPreference | null>(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPeer, setSelectedPeer] = useState<PeerSessionMember | null>(null);

  const loadData = useCallback(async () => {
    if (!session?.user.id) return;
    setLoading(true);
    setError('');
    const [memberResult, requestResult, preferenceResult, ledgerResult] = await Promise.all([
      supabase.from('member_profiles').select('user_id, display_name, avatar_url, headline, bio, skills, peer_session_preferences!inner(user_id, enabled, topics, bio, created_at, updated_at)').eq('peer_session_preferences.enabled', true).neq('user_id', session.user.id).order('display_name'),
      supabase.from('peer_session_requests').select('*, requester:member_profiles!peer_session_requests_requester_id_fkey(user_id, display_name, avatar_url), peer:member_profiles!peer_session_requests_peer_id_fkey(user_id, display_name, avatar_url)').or(`requester_id.eq.${session.user.id},peer_id.eq.${session.user.id}`).order('created_at', { ascending: false }),
      supabase.from('peer_session_preferences').select('*').eq('user_id', session.user.id).maybeSingle(),
      supabase.from('point_ledger').select('points').eq('member_id', session.user.id),
    ]);
    const firstError = memberResult.error || requestResult.error || preferenceResult.error || ledgerResult.error;
    if (firstError) {
      console.error('Unable to load Peer Sessions:', firstError);
      setError('Peer Sessions could not be loaded right now. Make sure the latest database migration is applied.');
    } else {
      setMembers((memberResult.data as unknown as PeerSessionMember[]) || []);
      setRequests((requestResult.data as unknown as PeerSessionRequest[]) || []);
      setPreference((preferenceResult.data as PeerSessionPreference | null) || null);
      setBalance((ledgerResult.data || []).reduce((sum, entry) => sum + entry.points, 0));
    }
    setLoading(false);
  }, [session?.user.id]);

  useEffect(() => { void loadData(); }, [loadData]);

  return <div className="max-w-6xl">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div><p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-white/35">Talkware Mini App</p><h1 className="text-4xl font-bold md:text-6xl">Peer Sessions</h1><p className="mt-4 max-w-2xl text-lg text-white/50">Turn community participation into focused 1:1 help from people who have been there.</p></div>
      <div className="glass flex items-center gap-3 rounded-2xl p-4"><span className="rounded-xl bg-emerald-300/10 p-2.5 text-emerald-200"><Coins className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-widest text-white/35">Your balance</p><p className="text-xl font-bold">{loading ? '—' : balance} points</p></div></div>
    </div>

    <nav className="mt-8 flex gap-2 overflow-x-auto pb-2" aria-label="Peer Session sections">
      {([['overview', 'Overview'], ['discover', 'Find a peer'], ['requests', 'Requests'], ['settings', 'Availability']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setView(id)} className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-bold transition ${view === id ? 'bg-white text-black' : 'border border-white/10 text-white/45 hover:text-white'}`}>{label}</button>)}
    </nav>

    {error && <div className="mt-6 rounded-2xl border border-rose-300/20 bg-rose-300/5 p-4 text-sm text-rose-100/75">{error}</div>}
    {view === 'overview' && <Overview onDiscover={() => setView('discover')} onRequests={() => setView('requests')} />}
    {view === 'discover' && <Discovery members={members} loading={loading} onRequest={setSelectedPeer} />}
    {view === 'requests' && <RequestManagement requests={requests} userId={session?.user.id || ''} loading={loading} onChanged={loadData} />}
    {view === 'settings' && <AvailabilitySettings userId={session?.user.id || ''} preference={preference} onSaved={loadData} />}
    {selectedPeer && <RequestFlow peer={selectedPeer} balance={balance} onClose={() => setSelectedPeer(null)} onCreated={async () => { setSelectedPeer(null); await loadData(); setView('requests'); }} />}
  </div>;
}

function Overview({ onDiscover, onRequests }: { onDiscover: () => void; onRequests: () => void }) {
  return <div className="mt-8 space-y-8">
    <section className="glass relative overflow-hidden rounded-[2rem] p-7 md:p-12"><div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" /><div className="relative max-w-3xl"><span className="inline-flex items-center gap-2 rounded-full bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-200"><Sparkles className="h-3.5 w-3.5" /> Community-powered support</span><h2 className="mt-6 text-3xl font-bold md:text-5xl">Ask for the help that moves your work forward.</h2><p className="mt-5 max-w-2xl leading-relaxed text-white/50">Use earned Talkware points for code reviews, career advice, debugging, design feedback, interview practice, and more. Points are community utility—not money and not transferred to the peer.</p><div className="mt-8 flex flex-wrap gap-3"><button onClick={onDiscover} className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-black">Find a peer <ArrowRight className="h-4 w-4" /></button><button onClick={onRequests} className="rounded-xl border border-white/15 px-5 py-3 font-bold text-white/70">View requests</button></div></div></section>
    <section className="grid gap-4 md:grid-cols-3">{[
      [MessageSquareText, 'Focused help', 'Bring one clear topic and get useful, direct feedback.'],
      [Coins, 'Points with purpose', 'Put the points you earn through participation back into the community.'],
      [ShieldCheck, 'Safe by design', 'Fixed pricing and secure transactions keep every request accountable.'],
    ].map(([Icon, title, text]) => { const CardIcon = Icon as typeof MessageSquareText; return <article key={title as string} className="glass rounded-3xl p-6"><CardIcon className="h-6 w-6 text-emerald-200" /><h3 className="mt-5 text-xl font-bold">{title as string}</h3><p className="mt-2 text-sm leading-relaxed text-white/45">{text as string}</p></article>; })}</section>
    <section className="glass rounded-3xl p-6 md:p-9"><p className="text-xs font-bold uppercase tracking-[0.22em] text-white/35">How it works</p><div className="mt-6 grid gap-6 md:grid-cols-4">{['Choose an available member', 'Pick 15, 30, or 60 minutes', 'Confirm the point cost', 'They accept or decline'].map((step, index) => <div key={step}><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-black">{index + 1}</span><p className="mt-4 font-bold">{step}</p></div>)}</div></section>
    <section><h2 className="text-2xl font-bold">Simple, fixed pricing</h2><div className="mt-4 grid gap-3 sm:grid-cols-3">{DURATIONS.map(item => <div key={item.minutes} className="glass flex items-center justify-between rounded-2xl p-5"><span className="font-bold">{item.minutes} minutes</span><span className="text-emerald-200">{item.cost} points</span></div>)}</div></section>
  </div>;
}

function Discovery({ members, loading, onRequest }: { members: PeerSessionMember[]; loading: boolean; onRequest: (member: PeerSessionMember) => void }) {
  const [filter, setFilter] = useState<MemberFilter>('all');
  const [skill, setSkill] = useState('');
  const filtered = useMemo(() => members.filter(member => {
    const badge = memberBadge(member)?.toLowerCase();
    if (filter === 'creators' && badge !== 'creator') return false;
    if (filter === 'mentors' && badge !== 'mentor') return false;
    return !skill.trim() || [...(member.skills || []), ...(preferenceOf(member)?.topics || [])].some(value => value.toLowerCase().includes(skill.trim().toLowerCase()));
  }), [members, filter, skill]);
  return <section className="mt-8"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-2xl font-bold">Find the right person</h2><p className="mt-2 text-sm text-white/45">Only opted-in approved members appear here.</p></div><label className="relative block lg:w-72"><Search className="absolute left-3 top-3.5 h-4 w-4 text-white/30" /><input value={skill} onChange={event => setSkill(event.target.value)} placeholder="Filter by skill or topic" className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-3 text-sm outline-none focus:border-white/30" /></label></div><div className="mt-5 flex gap-2 overflow-x-auto pb-2"><Filter className="mt-2.5 h-4 w-4 shrink-0 text-white/30" />{(['all', 'creators', 'mentors', 'available'] as MemberFilter[]).map(item => <button key={item} onClick={() => setFilter(item)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold capitalize ${filter === item ? 'bg-white text-black' : 'bg-white/5 text-white/45'}`}>{item === 'all' ? 'All members' : item === 'available' ? 'Available for sessions' : item}</button>)}</div>
    {loading ? <div className="glass mt-5 rounded-3xl p-10 text-center text-white/40">Loading available peers…</div> : filtered.length ? <div className="mt-5 grid gap-4 lg:grid-cols-2">{filtered.map(member => { const pref = preferenceOf(member); const badge = memberBadge(member); return <article key={member.user_id} className="glass rounded-3xl p-5 md:p-6"><div className="flex gap-4"><Avatar member={member} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-xl font-bold">{member.display_name}</h3>{badge && <span className="rounded-full bg-violet-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-200">{badge}</span>}<span className="rounded-full bg-emerald-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200">Available</span></div>{member.headline && <p className="mt-1 text-sm text-white/45">{member.headline}</p>}</div></div><p className="mt-5 text-sm leading-relaxed text-white/50">{pref?.bio || member.bio || 'Open to helping fellow Talkware members.'}</p><div className="mt-4 flex flex-wrap gap-1.5">{[...(pref?.topics || []), ...(member.skills || [])].slice(0, 8).map(topic => <span key={topic} className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-bold text-white/40">{topic}</span>)}</div><button onClick={() => onRequest(member)} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-black">Request a session <ArrowRight className="h-4 w-4" /></button></article>; })}</div> : <div className="glass mt-5 rounded-3xl border-dashed p-10 text-center"><Users className="mx-auto h-8 w-8 text-white/25" /><p className="mt-4 font-bold">No matching peers</p><p className="mt-2 text-sm text-white/40">Try another filter or check back as more members opt in.</p></div>}
  </section>;
}

function RequestFlow({ peer, balance, onClose, onCreated }: { peer: PeerSessionMember; balance: number; onClose: () => void; onCreated: () => void }) {
  const [duration, setDuration] = useState<Duration>(30);
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [proposedAt, setProposedAt] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const cost = DURATIONS.find(item => item.minutes === duration)!.cost;
  const canSubmit = topic.trim().length >= 3 && description.trim().length >= 10 && balance >= cost;
  const submit = async () => { setSubmitting(true); setError(''); const { error: submitError } = await supabase.rpc('create_peer_session_request', { p_peer_id: peer.user_id, p_topic: topic, p_description: description, p_duration_minutes: duration, p_proposed_start_at: proposedAt ? new Date(proposedAt).toISOString() : null }); if (submitError) { setError(submitError.message); setSubmitting(false); return; } await onCreated(); };
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Create Peer Session request"><div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-neutral-950 p-5 sm:rounded-3xl sm:p-7"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><Avatar member={peer} small /><div><p className="text-xs text-white/35">Request a session with</p><h2 className="text-xl font-bold">{peer.display_name}</h2></div></div><button onClick={onClose} className="rounded-xl p-2 text-white/40 hover:bg-white/10"><X className="h-5 w-5" /></button></div>
    <div className="mt-7"><label className="text-xs font-bold uppercase tracking-wider text-white/40">Duration</label><div className="mt-2 grid grid-cols-3 gap-2">{DURATIONS.map(item => <button key={item.minutes} onClick={() => setDuration(item.minutes)} className={`rounded-xl border p-3 text-left ${duration === item.minutes ? 'border-emerald-300/40 bg-emerald-300/10' : 'border-white/10'}`}><span className="block font-bold">{item.minutes} min</span><span className="text-xs text-white/40">{item.cost} points</span></button>)}</div></div>
    <Field label="Topic"><input value={topic} maxLength={120} onChange={event => setTopic(event.target.value)} placeholder="e.g. Review my React architecture" className="field" /></Field><Field label="Message"><textarea value={description} maxLength={2000} rows={5} onChange={event => setDescription(event.target.value)} placeholder="Describe what you need help with and what a useful outcome looks like…" className="field resize-none" /></Field><Field label="Proposed date and time (optional)"><input type="datetime-local" value={proposedAt} min={new Date().toISOString().slice(0, 16)} onChange={event => setProposedAt(event.target.value)} className="field [color-scheme:dark]" /></Field>
    <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl bg-white/5 p-4 text-center"><BalanceItem label="Current" value={balance} /><BalanceItem label="Cost" value={-cost} /><BalanceItem label="Remaining" value={balance - cost} /></div>{balance < cost && <p className="mt-3 text-sm text-amber-200">You need {cost - balance} more points for this duration.</p>}{error && <p className="mt-3 text-sm text-rose-200">{error}</p>}<button disabled={!canSubmit} onClick={() => setConfirming(true)} className="mt-6 w-full rounded-xl bg-white px-5 py-3.5 font-bold text-black disabled:cursor-not-allowed disabled:opacity-35">Review request</button>
    {confirming && <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/85 p-5"><div className="glass max-w-md rounded-3xl bg-neutral-950 p-7 text-center"><Coins className="mx-auto h-9 w-9 text-emerald-200" /><h3 className="mt-5 text-2xl font-bold">Spend {cost} points?</h3><p className="mt-3 text-sm leading-relaxed text-white/50">This creates a {duration}-minute request for {peer.display_name}. Your remaining balance will be {balance - cost} points.</p><div className="mt-6 grid grid-cols-2 gap-3"><button disabled={submitting} onClick={() => setConfirming(false)} className="rounded-xl border border-white/10 px-4 py-3 font-bold text-white/60">Go back</button><button disabled={submitting} onClick={submit} className="rounded-xl bg-white px-4 py-3 font-bold text-black">{submitting ? 'Submitting…' : 'Confirm & spend'}</button></div></div></div>}
  </div></div>;
}

function RequestManagement({ requests, userId, loading, onChanged }: { requests: PeerSessionRequest[]; userId: string; loading: boolean; onChanged: () => void }) {
  const [section, setSection] = useState<'mine' | 'incoming'>('mine');
  const [status, setStatus] = useState<'all' | PeerSessionStatus>('all');
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState('');
  const mine = requests.filter(request => request.requester_id === userId);
  const incoming = requests.filter(request => request.peer_id === userId);
  const visible = (section === 'mine' ? mine : incoming).filter(request => status === 'all' || request.status === status);
  const act = async (id: string, action: 'accept' | 'decline' | 'cancel' | 'complete') => { setWorking(id); setError(''); const result = action === 'accept' || action === 'decline' ? await supabase.rpc('respond_to_peer_session_request', { p_request_id: id, p_accept: action === 'accept' }) : action === 'cancel' ? await supabase.rpc('cancel_peer_session_request', { p_request_id: id }) : await supabase.rpc('complete_peer_session_request', { p_request_id: id }); if (result.error) setError(result.error.message); else await onChanged(); setWorking(null); };
  return <section className="mt-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-bold">Session requests</h2><p className="mt-2 text-sm text-white/45">Manage the help you requested and requests sent to you.</p></div><div className="flex rounded-xl bg-white/5 p-1">{(['mine', 'incoming'] as const).map(item => <button key={item} onClick={() => setSection(item)} className={`rounded-lg px-4 py-2 text-sm font-bold ${section === item ? 'bg-white text-black' : 'text-white/45'}`}>{item === 'mine' ? `My requests (${mine.length})` : `Incoming (${incoming.length})`}</button>)}</div></div><div className="mt-5 flex gap-2 overflow-x-auto pb-2">{(['all', 'pending', 'accepted', 'completed', 'declined', 'cancelled'] as const).map(item => <button key={item} onClick={() => setStatus(item)} className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold capitalize ${status === item ? 'bg-white text-black' : 'bg-white/5 text-white/40'}`}>{item}</button>)}</div>{error && <p className="mt-4 text-sm text-rose-200">{error}</p>}
    {loading ? <div className="glass mt-4 rounded-3xl p-10 text-center text-white/40">Loading requests…</div> : visible.length ? <div className="mt-4 space-y-3">{visible.map(request => { const person = section === 'mine' ? request.peer : request.requester; return <article key={request.id} className="glass rounded-2xl p-5"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 gap-3">{person ? <Avatar member={person} small /> : <span className="rounded-full bg-white/5 p-3"><UserRound className="h-5 w-5" /></span>}<div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{request.topic}</h3><StatusBadge status={request.status} /></div><p className="mt-1 text-xs text-white/40">{section === 'mine' ? 'With' : 'From'} {person?.display_name || 'Member'} · {request.duration_minutes} min · {request.points_cost} points</p><p className="mt-3 text-sm leading-relaxed text-white/55">{request.description}</p>{request.proposed_start_at && <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-sky-200/70"><CalendarClock className="h-3.5 w-3.5" /> Proposed {new Date(request.proposed_start_at).toLocaleString()}</p>}<p className="mt-2 text-[11px] text-white/25">Requested {new Date(request.created_at).toLocaleDateString()}</p></div></div><div className="flex shrink-0 flex-wrap gap-2">{section === 'incoming' && request.status === 'pending' && <><ActionButton disabled={working === request.id} onClick={() => act(request.id, 'accept')}>Accept</ActionButton><ActionButton muted disabled={working === request.id} onClick={() => act(request.id, 'decline')}>Decline</ActionButton></>}{section === 'mine' && ['pending', 'accepted'].includes(request.status) && <ActionButton muted disabled={working === request.id} onClick={() => act(request.id, 'cancel')}>Cancel</ActionButton>}{section === 'mine' && request.status === 'accepted' && <ActionButton disabled={working === request.id} onClick={() => act(request.id, 'complete')}>Complete</ActionButton>}</div></div></article>; })}</div> : <div className="glass mt-4 rounded-3xl border-dashed p-10 text-center"><Handshake className="mx-auto h-8 w-8 text-white/25" /><p className="mt-4 font-bold">No {status === 'all' ? '' : `${status} `}{section === 'mine' ? 'requests yet' : 'incoming requests'}</p><p className="mt-2 text-sm text-white/40">{section === 'mine' ? 'Find an available peer when you need a hand.' : 'New requests sent to you will appear here.'}</p></div>}
  </section>;
}

function AvailabilitySettings({ userId, preference, onSaved }: { userId: string; preference: PeerSessionPreference | null; onSaved: () => void }) {
  const [enabled, setEnabled] = useState(preference?.enabled || false);
  const [topics, setTopics] = useState(preference?.topics.join(', ') || '');
  const [bio, setBio] = useState(preference?.bio || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { setEnabled(preference?.enabled || false); setTopics(preference?.topics.join(', ') || ''); setBio(preference?.bio || ''); }, [preference]);
  const save = async () => { setSaving(true); setMessage(''); const normalizedTopics = topics.split(',').map(item => item.trim()).filter(Boolean).slice(0, 20); const { error } = await supabase.from('peer_session_preferences').upsert({ user_id: userId, enabled, topics: normalizedTopics, bio: bio.trim() || null, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }); setMessage(error ? error.message : 'Availability saved.'); setSaving(false); if (!error) await onSaved(); };
  return <section className="mt-8 max-w-3xl"><h2 className="text-2xl font-bold">Session availability</h2><p className="mt-2 text-sm leading-relaxed text-white/45">Opt in when you are comfortable receiving requests. You can turn this off at any time; existing requests remain visible.</p><div className="glass mt-6 rounded-3xl p-6 md:p-8"><label className="flex cursor-pointer items-center justify-between gap-5"><div><span className="block font-bold">Accept Peer Session requests</span><span className="mt-1 block text-sm text-white/40">Show me in Peer Session discovery.</span></div><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} className="h-5 w-5 accent-emerald-300" /></label><Field label="Topics you can help with"><input value={topics} onChange={event => setTopics(event.target.value)} placeholder="React, Supabase, career advice" className="field" /><p className="mt-2 text-xs text-white/30">Separate topics with commas.</p></Field><Field label="Peer Session note"><textarea value={bio} maxLength={500} rows={4} onChange={event => setBio(event.target.value)} placeholder="Tell members what you can help with…" className="field resize-none" /></Field>{message && <p className={`mt-4 text-sm ${message.includes('saved') ? 'text-emerald-200' : 'text-rose-200'}`}>{message}</p>}<button disabled={saving || !userId} onClick={save} className="mt-6 rounded-xl bg-white px-5 py-3 font-bold text-black disabled:opacity-40">{saving ? 'Saving…' : 'Save availability'}</button></div></section>;
}

function Avatar({ member, small = false }: { member: { display_name: string; avatar_url?: string | null }; small?: boolean }) { return <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 ${small ? 'h-11 w-11' : 'h-16 w-16'}`}>{member.avatar_url ? <img src={member.avatar_url} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-5 w-5 text-white/30" />}</span>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="mt-5 block"><span className="mb-2 block text-xs font-bold uppercase tracking-wider text-white/40">{label}</span>{children}</label>; }
function BalanceItem({ label, value }: { label: string; value: number }) { return <div><span className="block text-[10px] uppercase tracking-wider text-white/30">{label}</span><strong className={value < 0 ? 'text-rose-200' : ''}>{value} pts</strong></div>; }
function StatusBadge({ status }: { status: PeerSessionStatus }) { return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[status]}`}>{status}</span>; }
function ActionButton({ children, muted = false, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { muted?: boolean }) { return <button {...props} className={`rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-35 ${muted ? 'border border-white/10 text-white/50' : 'bg-white text-black'}`}>{children}</button>; }
