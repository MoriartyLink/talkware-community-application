import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, Coins, Handshake, RotateCcw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { PointLedgerEntry } from '../../types/community';

export default function MemberPointsPage() {
  const { session } = useAuth();
  const [pointLedger, setPointLedger] = useState<PointLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const totalPoints = useMemo(() => pointLedger.reduce((total, entry) => total + entry.points, 0), [pointLedger]);

  useEffect(() => {
    if (!session?.user.id) return;
    let active = true;
    setLoading(true);
    setError('');
    supabase.from('point_ledger')
      .select('id, member_id, event_id, attendance_id, points, reason, event_type, source_type, source_id, earned_at, created_at, event:events(title, type)')
      .eq('member_id', session.user.id).order('earned_at', { ascending: false })
      .then(({ data, error: loadError }) => {
        if (!active) return;
        if (loadError) { setError('Your points could not be loaded right now.'); console.error('Unable to load member point ledger:', loadError); }
        else setPointLedger((data as unknown as PointLedgerEntry[]) || []);
        setLoading(false);
      });
    return () => { active = false; };
  }, [session?.user.id]);

  return <div className="max-w-4xl">
    <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-white/35">Community utility points</p>
    <h1 className="text-4xl font-bold md:text-6xl">My Points</h1>
    <p className="mt-4 max-w-2xl text-white/50">Earn points through community participation and use them in Talkware Mini Apps.</p>
    <section className="glass mt-9 rounded-3xl p-5 md:p-8"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-white/35">Current balance</p><p className="mt-2 text-sm text-white/45">Your balance is calculated from every immutable ledger entry.</p></div><div className="min-w-44 rounded-2xl border border-emerald-300/15 bg-emerald-300/10 p-5"><div className="flex items-center gap-2 text-emerald-200"><Coins className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-widest">Total points</span></div><p className="mt-2 text-5xl font-bold text-white">{loading ? '—' : totalPoints}</p></div></div></section>
    <section className="mt-8"><div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-white/35">Ledger</p><h2 className="mt-2 text-2xl font-bold">Point history</h2></div>{!loading && !error && <span className="text-sm text-white/35">{pointLedger.length} {pointLedger.length === 1 ? 'entry' : 'entries'}</span>}</div>
      {error ? <div className="glass rounded-2xl border border-amber-300/15 bg-amber-300/5 p-5 text-sm text-amber-100/70">{error}</div> : loading ? <div className="glass rounded-2xl p-6 text-sm text-white/40">Loading point history…</div> : pointLedger.length ? <div className="space-y-3">{pointLedger.map(entry => {
        const Icon = entry.source_type === 'peer_session_refund' ? RotateCcw : entry.source_type === 'peer_session' ? Handshake : CalendarCheck2;
        return <article key={entry.id} className="glass flex items-center justify-between gap-4 rounded-2xl p-4 md:p-5"><div className="flex min-w-0 items-center gap-3"><div className="rounded-xl bg-white/5 p-2.5"><Icon className="h-5 w-5 text-white/50" /></div><div className="min-w-0"><h3 className="truncate font-bold">{entry.event?.title || entry.reason}</h3><p className="mt-1 text-xs text-white/40">{entry.event_type || 'Peer Sessions'} · {new Date(entry.earned_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p></div></div><span className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-bold ${entry.points > 0 ? 'bg-emerald-300/10 text-emerald-200' : 'bg-rose-300/10 text-rose-200'}`}>{entry.points > 0 ? '+' : ''}{entry.points} pts</span></article>;
      })}</div> : <div className="glass rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/40">Attend an event and check in with your member QR to earn your first points.</div>}
    </section>
  </div>;
}
