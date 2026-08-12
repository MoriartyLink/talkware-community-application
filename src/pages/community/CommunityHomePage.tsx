import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Newspaper, QrCode } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatEventDate } from '../../lib/community';
import type { CommunityEvent, CommunityPost } from '../../types/community';

export default function CommunityHomePage() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [eventPhotos, setEventPhotos] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      supabase.from('events').select('*').eq('published', true).eq('archived', false).order('starts_at', { ascending: true, nullsFirst: false }).limit(3),
      supabase.from('community_posts').select('*').eq('published', true).order('published_at', { ascending: false }).limit(2),
      supabase.from('event_media').select('event_id, url').eq('media_type', 'photo').order('sort_order', { ascending: true }),
    ]).then(([eventResult, postResult, photoResult]) => {
      if (eventResult.error) console.error(eventResult.error);
      if (postResult.error) console.error(postResult.error);
      if (photoResult.error) console.error(photoResult.error);
      setEvents((eventResult.data as CommunityEvent[]) || []);
      setPosts((postResult.data as CommunityPost[]) || []);
      setEventPhotos((photoResult.data || []).reduce<Record<string, string>>((photos, photo) => {
        if (!photos[photo.event_id]) photos[photo.event_id] = photo.url;
        return photos;
      }, {}));
    });
  }, []);

  return (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-white/35">Member home</p>
      <h1 className="text-4xl font-bold md:text-6xl">Welcome, {profile?.display_name?.split(' ')[0] || 'builder'}.</h1>
      <p className="mt-4 max-w-2xl text-lg text-white/50">Catch the next gathering, see what the community is building, and keep your member pass ready.</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Link to="/community/events" className="glass group rounded-2xl p-5 hover:bg-white/10"><CalendarDays className="mb-6 h-6 w-6 text-white/50" /><span className="flex items-center justify-between font-bold">Browse events <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></Link>
        <Link to="/community/updates" className="glass group rounded-2xl p-5 hover:bg-white/10"><Newspaper className="mb-6 h-6 w-6 text-white/50" /><span className="flex items-center justify-between font-bold">Community updates <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></Link>
        <Link to="/community/profile#member-qr" className="glass group rounded-2xl p-5 hover:bg-white/10"><QrCode className="mb-6 h-6 w-6 text-white/50" /><span className="flex items-center justify-between font-bold">Open my QR <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span></Link>
      </div>

      <section className="mt-14">
        <div className="mb-6 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-white/30">Announcements</p><h2 className="mt-2 text-2xl font-bold">Upcoming events</h2></div><Link to="/community/events" className="text-sm text-white/45 hover:text-white">View all</Link></div>
        <div className="grid gap-4 lg:grid-cols-3">
          {events.map(event => <Link key={event.id} to={`/event/${event.id}`} className="glass group overflow-hidden rounded-2xl hover:bg-white/10">{eventPhotos[event.id] && <img src={eventPhotos[event.id]} alt={`${event.title} event`} className="aspect-video w-full object-cover transition duration-300 group-hover:scale-[1.02]" loading="lazy" />}<div className="p-5"><span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest">{event.type}</span><h3 className="mt-5 text-lg font-bold">{event.title}</h3><p className="mt-2 text-sm text-white/45">{formatEventDate(event)}</p><p className="mt-1 text-sm text-white/35">{event.location || 'Location to be announced'}</p></div></Link>)}
          {events.length === 0 && <div className="glass col-span-full rounded-2xl p-8 text-center text-white/40">No upcoming event has been announced yet.</div>}
        </div>
      </section>

      <section className="mt-14">
        <div className="mb-6 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-white/30">From the team</p><h2 className="mt-2 text-2xl font-bold">Latest updates</h2></div><Link to="/community/updates" className="text-sm text-white/45 hover:text-white">View all</Link></div>
        <div className="space-y-4">{posts.map(post => <article key={post.id} className="glass rounded-2xl p-6"><h3 className="text-xl font-bold">{post.title}</h3><p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed text-white/50">{post.body}</p></article>)}{posts.length === 0 && <div className="glass rounded-2xl p-8 text-center text-white/40">Community updates will appear here.</div>}</div>
      </section>
    </div>
  );
}
