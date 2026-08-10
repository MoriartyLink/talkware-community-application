import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Share2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatEventDate, shareEvent } from '../../lib/community';
import type { CommunityEvent, EventRegistration } from '../../types/community';

export default function CommunityEventsPage() {
  const { session } = useAuth();
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [eventPhotos, setEventPhotos] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');

  const load = async () => {
    const [eventResult, registrationResult, photoResult] = await Promise.all([
      supabase.from('events').select('*').eq('published', true).eq('archived', false).order('starts_at', { ascending: true, nullsFirst: false }),
      supabase.from('event_registrations').select('*').eq('member_id', session!.user.id).neq('status', 'cancelled'),
      supabase.from('event_media').select('event_id, url').eq('media_type', 'photo').order('sort_order', { ascending: true }),
    ]);
    if (eventResult.error) console.error(eventResult.error);
    if (registrationResult.error) console.error(registrationResult.error);
    if (photoResult.error) console.error(photoResult.error);
    setEvents((eventResult.data as CommunityEvent[]) || []);
    setRegistrations((registrationResult.data as EventRegistration[]) || []);
    setEventPhotos((photoResult.data || []).reduce<Record<string, string>>((photos, photo) => {
      if (!photos[photo.event_id]) photos[photo.event_id] = photo.url;
      return photos;
    }, {}));
  };

  useEffect(() => { load(); }, []);

  const register = async (eventId: string) => {
    setNotice('');
    const { data, error } = await supabase.rpc('register_for_event', { p_event_id: eventId });
    if (error) setNotice(error.message);
    else {
      const status = data?.[0]?.registration_status;
      setNotice(status === 'waitlisted' ? 'You joined the waitlist.' : 'Your seat is confirmed.');
      await load();
    }
  };

  const cancel = async (registrationId: string) => {
    const { error } = await supabase.from('event_registrations').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', registrationId);
    setNotice(error ? error.message : 'Registration cancelled.');
    if (!error) await load();
  };

  const share = async (event: CommunityEvent) => {
    try { const result = await shareEvent(event); if (result === 'copied') setNotice('Event link copied.'); } catch (error) { if ((error as DOMException).name !== 'AbortError') setNotice('Could not share this event.'); }
  };

  return (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-white/35">Community events</p>
      <h1 className="text-4xl font-bold md:text-6xl">Upcoming gatherings</h1>
      <p className="mt-4 max-w-2xl text-white/50">Register your seat, share an event with a guest, and find member resources from each event page.</p>
      {notice && <div className="mt-7 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">{notice}</div>}
      <div className="mt-9 space-y-5">
        {events.map(event => {
          const registration = registrations.find(item => item.event_id === event.id);
          return (
            <article key={event.id} className="glass overflow-hidden rounded-3xl">
              {eventPhotos[event.id] && <Link to={`/event/${event.id}`}><img src={eventPhotos[event.id]} alt={`${event.title} event`} className="aspect-[16/7] w-full object-cover" loading="lazy" /></Link>}
              <div className="p-6 md:p-8">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-start">
                  <div className="max-w-2xl"><div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">{event.type}</span>{registration && <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${registration.status === 'confirmed' ? 'text-emerald-300' : 'text-amber-300'}`}>{registration.status === 'confirmed' ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}{registration.status}</span>}</div><h2 className="mt-5 text-2xl font-bold md:text-3xl">{event.title}</h2><p className="mt-3 flex items-center gap-2 text-sm text-white/45"><CalendarDays className="h-4 w-4" /> {formatEventDate(event)}</p><p className="mt-4 line-clamp-2 text-white/50">{event.description}</p></div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button onClick={() => share(event)} className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-bold hover:bg-white/10"><Share2 className="h-4 w-4" /> Share</button>
                    {registration ? <button onClick={() => cancel(registration.id)} className="rounded-xl border border-red-400/25 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-400/10">Cancel</button> : <button disabled={!event.registration_open} onClick={() => register(event.id)} className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-black disabled:opacity-40">{event.registration_open ? 'Register' : 'Closed'}</button>}
                  </div>
                </div>
                <Link to={`/event/${event.id}`} className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-white/60 hover:text-white">Event details & resources <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </article>
          );
        })}
        {events.length === 0 && <div className="glass rounded-3xl p-12 text-center"><CalendarDays className="mx-auto mb-4 h-8 w-8 text-white/20" /><p className="text-white/40">No upcoming events have been published.</p></div>}
      </div>
    </div>
  );
}
