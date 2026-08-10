import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import { supabase } from "../lib/supabase";
import { ArrowLeft, Calendar, Globe, User, Play, Image as ImageIcon, Trophy, Zap, Gamepad2, Sparkles, ChevronDown, ChevronUp, Github, Share2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { formatEventDate, shareEvent } from "../lib/community";
import type { CommunityEvent } from "../types/community";
import EventRegistrationSection from "../components/EventRegistrationSection";
import EventResourcesSection from "../components/EventResourcesSection";

type Event = CommunityEvent;

interface EventMedia {
  id: string;
  event_id: string;
  media_type: 'photo' | 'video';
  title?: string;
  url: string;
  caption?: string;
  sort_order: number;
}

interface EventSection {
  id: string;
  event_id: string;
  section_type: 'highlight' | 'activity' | 'game' | 'win';
  title: string;
  description?: string;
  subtitle?: string;
  icon?: string;
  sort_order: number;
}

const sectionIcons: Record<string, React.ReactNode> = {
  highlight: <Sparkles className="w-5 h-5" />,
  activity: <Zap className="w-5 h-5" />,
  game: <Gamepad2 className="w-5 h-5" />,
  win: <Trophy className="w-5 h-5" />,
};

const sectionLabels: Record<string, string> = {
  highlight: "Past Events",
  activity: "Activities",
  game: "Game Sessions",
  win: "What We Got Today",
};

const sectionColors: Record<string, string> = {
  highlight: "from-yellow-400/20 to-yellow-400/5 border-yellow-400/20 text-yellow-400",
  activity: "from-blue-400/20 to-blue-400/5 border-blue-400/20 text-blue-400",
  game: "from-purple-400/20 to-purple-400/5 border-purple-400/20 text-purple-400",
  win: "from-emerald-400/20 to-emerald-400/5 border-emerald-400/20 text-emerald-400",
};

function getYouTubeEmbedId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session, application, staffRole } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [media, setMedia] = useState<EventMedia[]>([]);
  const [sections, setSections] = useState<EventSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [shareNotice, setShareNotice] = useState('');
  const isApprovedMember = application?.status === 'approved' || Boolean(staffRole);

  useEffect(() => {
    if (!id) return;
    
    async function fetchData() {
      try {
        const [eventRes, mediaRes, sectionsRes] = await Promise.all([
          supabase.from('events').select('*').eq('id', id).single(),
          supabase.from('event_media').select('*').eq('event_id', id).order('sort_order', { ascending: true }),
          supabase.from('event_sections').select('*').eq('event_id', id).order('sort_order', { ascending: true }),
        ]);

        if (eventRes.data) setEvent(eventRes.data as Event);
        if (mediaRes.data) setMedia(mediaRes.data as EventMedia[]);
        if (sectionsRes.data) setSections(sectionsRes.data as EventSection[]);
      } catch (err) {
        console.error('Error fetching event detail:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-white/40 text-lg">Loading...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold mb-4">Event Not Found</h1>
          <Link to="/" className="text-white/60 hover:text-white underline">Back to Home</Link>
        </div>
      </div>
    );
  }

  const photos = media.filter(m => m.media_type === 'photo');
  const videos = media.filter(m => m.media_type === 'video');
  const groupedSections = sections.reduce((acc, s) => {
    if (!acc[s.section_type]) acc[s.section_type] = [];
    acc[s.section_type].push(s);
    return acc;
  }, {} as Record<string, EventSection[]>);

  const sectionTypes = ['highlight', 'activity', 'game', 'win'] as const;
  const visiblePhotos = showAllPhotos ? photos : photos.slice(0, 4);
  const handleShare = async () => {
    setShareNotice('');
    try { const result = await shareEvent(event); if (result === 'copied') setShareNotice('Event link copied.'); } catch (error) { if ((error as DOMException).name !== 'AbortError') setShareNotice('Could not share this event.'); }
  };


  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="Talkware Logo" className="w-8 h-8 object-contain" />
            <span className="font-display font-bold text-xl tracking-tighter uppercase">Talkware</span>
          </Link>
          <Link to={isApprovedMember ? "/community/events" : "/"} className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> {isApprovedMember ? 'Community Events' : 'Back to Home'}
          </Link>
        </div>
      </nav>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-20 px-6 overflow-hidden">
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl opacity-30 pointer-events-none" />
          <div className="max-w-4xl mx-auto relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <span className="px-4 py-1.5 bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest">{event.type}</span>
                <span className="flex items-center gap-2 text-sm text-white/40">
                  <Calendar className="w-4 h-4" /> {formatEventDate(event)}
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 leading-tight">{event.title}</h1>
              {event.speaker && (
                <p className="flex items-center gap-2 text-lg text-white/60 mb-4">
                  <User className="w-5 h-5" /> Guest Speaker: {event.speaker}
                </p>
              )}
              {event.location && (
                <p className="flex items-center gap-2 text-white/40 mb-6">
                  <Globe className="w-4 h-4" /> {event.location}
                </p>
              )}
              {event.description && (
                <p className="text-lg text-white/60 leading-relaxed max-w-2xl">{event.description}</p>
              )}
              <button onClick={handleShare} className="mt-8 inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-bold hover:bg-white/10"><Share2 className="h-4 w-4" /> Share event</button>
              {shareNotice && <p className="mt-4 text-sm text-white/55">{shareNotice}</p>}
            </motion.div>
          </div>
        </section>

        <EventRegistrationSection event={event} />
        <EventResourcesSection eventId={event.id} />

        {/* Event Photos Section */}
        {photos.length > 0 && (
          <section className="py-16 px-6 border-t border-white/5">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="mb-8"
              >
                <div className="flex items-center gap-3 mb-2">
                  <ImageIcon className="w-6 h-6 text-white/60" />
                  <h2 className="text-2xl md:text-3xl font-display font-bold">Event Photo</h2>
                </div>
                <p className="text-white/40 text-sm">{photos.length} photo{photos.length !== 1 ? 's' : ''}</p>
              </motion.div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {visiblePhotos.map((photo, index) => (
                  <motion.a
                    key={photo.id}
                    href={photo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/5 hover:border-white/20 transition-all cursor-pointer"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || photo.title || `Photo ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    {photo.caption && (
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs text-white/80">{photo.caption}</p>
                      </div>
                    )}
                  </motion.a>
                ))}
              </div>

              {photos.length > 4 && (
                <motion.button
                  onClick={() => setShowAllPhotos(!showAllPhotos)}
                  className="mt-6 flex items-center gap-2 mx-auto px-6 py-3 glass rounded-xl text-sm text-white/60 hover:text-white hover:border-white/20 transition-all border border-white/5"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {showAllPhotos ? (
                    <>Show Less <ChevronUp className="w-4 h-4" /></>
                  ) : (
                    <>View All {photos.length} Photos <ChevronDown className="w-4 h-4" /></>
                  )}
                </motion.button>
              )}
            </div>
          </section>
        )}

        {/* Videos Section */}
        {videos.length > 0 && (
          <section className="py-16 px-6 border-t border-white/5">
            <div className="max-w-6xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="mb-8"
              >
                <div className="flex items-center gap-3 mb-2">
                  <Play className="w-6 h-6 text-white/60" />
                  <h2 className="text-2xl md:text-3xl font-display font-bold">Videos</h2>
                </div>
                <p className="text-white/40 text-sm">{videos.length} video{videos.length !== 1 ? 's' : ''}</p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((video, index) => {
                  const youtubeId = getYouTubeEmbedId(video.url);
                  const isLocalVideo = !youtubeId && (video.url.endsWith('.mp4') || video.url.endsWith('.webm') || video.url.endsWith('.mov'));
                  return (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="glass rounded-2xl overflow-hidden border border-white/5"
                    >
                      {youtubeId ? (
                        <div className="relative aspect-video">
                          <iframe
                            src={`https://www.youtube.com/embed/${youtubeId}`}
                            title={video.title || `Video ${index + 1}`}
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : isLocalVideo ? (
                        <video controls className="w-full aspect-video object-cover">
                          <source src={video.url} />
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <a href={video.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center aspect-video bg-white/5 group"
                        >
                          <Play className="w-12 h-12 text-white/20 group-hover:text-white/60 transition-colors" />
                        </a>
                      )}
                      {(video.title || video.caption) && (
                        <div className="p-4">
                          {video.title && <h4 className="font-semibold text-sm mb-1">{video.title}</h4>}
                          {video.caption && <p className="text-white/40 text-xs">{video.caption}</p>}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
        
        {/* Event Sections */}
        {sectionTypes.map((type) => {
          const items = groupedSections[type];
          if (!items || items.length === 0) return null;
          return (
            <section key={type} className="py-16 px-6 border-t border-white/5">
              <div className="max-w-4xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                  className="mb-8"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-white/60">{sectionIcons[type]}</span>
                    <h2 className="text-2xl md:text-3xl font-display font-bold">{sectionLabels[type]}</h2>
                  </div>
                </motion.div>
                <div className="grid gap-4">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className={`bg-gradient-to-br ${sectionColors[type]} border rounded-2xl p-6`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                          {sectionIcons[type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg mb-1">{item.title}</h3>
                          {item.subtitle && <p className="text-sm text-white/40 mb-2">{item.subtitle}</p>}
                          {item.description && <p className="text-sm text-white/60 leading-relaxed">{item.description}</p>}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>
          );
        })}

        {/* Back to All Events */}
        <section className="py-20 px-6 border-t border-white/5">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Link
                to={isApprovedMember ? "/community/events" : "/"}
                className="inline-flex items-center gap-3 px-8 py-4 glass rounded-2xl border border-white/10 text-white/80 hover:text-white hover:border-white/30 transition-all font-bold"
              >
                <ArrowLeft className="w-5 h-5" /> {isApprovedMember ? 'Back to Community Events' : 'Back to Talkware'}
              </Link>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="pt-24 pb-12 px-6 border-t border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <img src="/logo.png" alt="Talkware Logo" className="w-8 h-8 object-contain" />
                <span className="font-display font-bold text-xl tracking-tighter uppercase">Talkware</span>
              </div>
              <p className="text-white/40 max-w-sm mb-8">Home for passionate tech builders in Mandalay.</p>
              <div className="flex items-center gap-4">
                <a href="https://github.com/orgs/talkware-mm/" target="_blank" rel="noopener noreferrer"
                  className="p-3 glass rounded-full text-white/40 hover:text-white transition-all"
                >
                  <Github className="w-5 h-5" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-display font-bold mb-6 uppercase tracking-wider text-sm">Community</h4>
              <ul className="space-y-4 text-sm text-white/40">
                <li><a href="/#mission" className="hover:text-white transition-colors">Our Mission</a></li>
                <li><a href="/#past-events" className="hover:text-white transition-colors">Past Events</a></li>
                <li><a href="/#story" className="hover:text-white transition-colors">Our Story</a></li>
                <li><a href="/#contributors" className="hover:text-white transition-colors">The Team</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-bold mb-6 uppercase tracking-wider text-sm">Contact</h4>
              <ul className="space-y-4 text-sm text-white/40">
                <li><a href="mailto:team.talkware@gmail.com" className="hover:text-white transition-colors">team.talkware@gmail.com</a></li>
                <li><a href="tel:+959792470107" className="hover:text-white transition-colors">+95 979 247 010 7</a></li>
                <li><a href="tel:+959789910866" className="hover:text-white transition-colors">+959 789 910 866</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-white/20 text-xs">© 2026 Talkware Community. All rights reserved.</p>
            <div className="flex items-center gap-8 text-[10px] font-bold uppercase tracking-widest text-white/20">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
