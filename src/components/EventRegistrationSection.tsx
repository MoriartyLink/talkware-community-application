import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { CommunityEvent, EventRegistration } from '../types/community';

interface EventRegistrationSectionProps {
  event: CommunityEvent;
}

export default function EventRegistrationSection({ event }: EventRegistrationSectionProps) {
  const { session, application, staffRole } = useAuth();
  const [registration, setRegistration] = useState<EventRegistration | null>(null);
  const [guestForm, setGuestForm] = useState({ name: '', email: '', phone: '' });
  const [notice, setNotice] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const isApprovedMember = application?.status === 'approved' || Boolean(staffRole);

  const loadRegistration = useCallback(async () => {
    if (!session || !isApprovedMember) {
      setRegistration(null);
      return;
    }

    const { data, error } = await supabase
      .from('event_registrations')
      .select('*')
      .eq('event_id', event.id)
      .eq('member_id', session.user.id)
      .neq('status', 'cancelled')
      .maybeSingle();

    if (error) {
      console.error('Unable to load event registration:', error);
      return;
    }
    setRegistration((data as EventRegistration | null) ?? null);
  }, [event.id, isApprovedMember, session]);

  useEffect(() => {
    void loadRegistration();
  }, [loadRegistration]);

  if (!event.published || event.archived) return null;

  const registerMember = async () => {
    setActionLoading(true);
    setNotice('');
    try {
      const { data, error } = await supabase.rpc('register_for_event', { p_event_id: event.id });
      if (error) {
        setNotice(error.message);
        return;
      }
      const status = data?.[0]?.registration_status;
      setNotice(status === 'waitlisted' ? 'You joined the waitlist.' : 'Your seat is confirmed.');
      await loadRegistration();
    } finally {
      setActionLoading(false);
    }
  };

  const cancelRegistration = async () => {
    if (!registration || !session) return;
    setActionLoading(true);
    setNotice('');
    try {
      const { error } = await supabase
        .from('event_registrations')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', registration.id)
        .eq('member_id', session.user.id);
      setNotice(error ? error.message : 'Registration cancelled.');
      if (!error) await loadRegistration();
    } finally {
      setActionLoading(false);
    }
  };

  const registerGuest = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    setActionLoading(true);
    setNotice('');
    try {
      const { data, error } = await supabase.rpc('register_guest_for_event', {
        p_event_id: event.id,
        p_name: guestForm.name,
        p_email: guestForm.email,
        p_phone: guestForm.phone || null,
      });
      if (error) {
        setNotice(error.message);
        return;
      }
      const status = data?.[0]?.registration_status;
      setNotice(status === 'waitlisted' ? 'Guest registration added to the waitlist.' : 'Guest registration confirmed.');
      setGuestForm({ name: '', email: '', phone: '' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <section className="border-t border-white/5 px-6 py-12">
      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <div className="glass rounded-3xl p-6 md:p-8">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/35">Event registration</p>
          {isApprovedMember ? (
            <>
              <h2 className="text-2xl font-bold">Member seat</h2>
              {registration ? (
                <div className="mt-5">
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${registration.status === 'confirmed' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300'}`}>
                    {registration.status === 'confirmed' ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                    {registration.status === 'confirmed' ? 'Seat confirmed' : 'On the waitlist'}
                  </div>
                  <p className="mt-4 text-sm text-white/45">At the event, open your personal QR and let an organizer scan it.</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link to="/community/pass" className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-black">Open my QR</Link>
                    <button disabled={actionLoading} onClick={cancelRegistration} className="rounded-xl border border-red-400/25 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-400/10 disabled:opacity-40">Cancel registration</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-3 text-sm leading-relaxed text-white/50">Reserve a member seat. If capacity is full, you will automatically join the waitlist.</p>
                  <button disabled={actionLoading || !event.registration_open} onClick={registerMember} className="mt-5 rounded-xl bg-white px-5 py-3 font-bold text-black disabled:opacity-40">
                    {event.registration_open ? (actionLoading ? 'Registering…' : 'Register as member') : 'Registration closed'}
                  </button>
                </>
              )}
            </>
          ) : session ? (
            <>
              <h2 className="text-2xl font-bold">Membership approval required</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/50">Approved members use their account to register and access resources. You may sign out to register as a guest.</p>
              <Link to={application ? '/application-status' : '/join'} className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 font-bold text-black">View membership status</Link>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold">Already a member?</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/50">Sign in to register with your member profile and access presentation resources.</p>
              <Link to="/auth" state={{ from: `/event/${event.id}` }} className="mt-5 inline-flex rounded-xl bg-white px-5 py-3 font-bold text-black">Member login</Link>
            </>
          )}
        </div>

        {!session && (
          <form onSubmit={registerGuest} className="glass rounded-3xl p-6 md:p-8">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/35">No account needed</p>
            <h2 className="text-2xl font-bold">Guest registration</h2>
            <div className="mt-5 space-y-3">
              <input required minLength={2} placeholder="Full name" value={guestForm.name} onChange={event => setGuestForm(current => ({ ...current, name: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/35" />
              <input required type="email" placeholder="Email" value={guestForm.email} onChange={event => setGuestForm(current => ({ ...current, email: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/35" />
              <input type="tel" placeholder="Phone (optional)" value={guestForm.phone} onChange={event => setGuestForm(current => ({ ...current, phone: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none focus:border-white/35" />
            </div>
            <button disabled={actionLoading || !event.registration_open} className="mt-5 w-full rounded-xl border border-white/15 px-5 py-3 font-bold hover:bg-white/10 disabled:opacity-40">
              {event.registration_open ? (actionLoading ? 'Registering…' : 'Register as guest') : 'Registration closed'}
            </button>
          </form>
        )}
      </div>
      {notice && <div className="mx-auto mt-5 max-w-4xl rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">{notice}</div>}
    </section>
  );
}
