import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowRight, Users, Globe, Github, User, Linkedin } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import MemberNetwork from "../components/MemberNetwork";

interface HighlightEvent {
  id: string;
  title: string;
  date: string | null;
  location: string | null;
  starts_at: string | null;
  highlight_image_url: string | null;
  highlight_note: string | null;
}

interface Contributor {
  id: string;
  name: string;
  role: string;
  tag: string;
  image_url: string;
  github_url?: string;
  linkedin_url?: string;
  telegram_url?: string;
  contact_email?: string;
  active: boolean;
  joined_at: string;
  points?: number;
}

interface ContributorTag {
  value: string;
  label: string;
  color: string;
}

interface PublicMember {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  headline?: string;
  bio?: string;
  skills?: string[];
  github_url?: string;
  linkedin_url?: string;
}

const DEFAULT_TAGS: ContributorTag[] = [
  { value: 'founding_team', label: 'Founding Team', color: '#f59e0b' },
  { value: 'co_creator', label: 'Co-Creator', color: '#8b5cf6' },
  { value: 'volunteer', label: 'Volunteer', color: '#34d399' },
  { value: 'website_contributor', label: 'Website Contributor', color: '#38bdf8' },
];

const DEFAULT_TAG_COLOR = '#94a3b8';

const formatContributorTag = (tag: string) =>
  tag.replace(/[_-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());

const isCommunityLead = (tag: string) => {
  const normalized = tag.toLowerCase().replace(/[\s-]+/g, '_');
  return ['community_lead', 'community_leads', 'founding_team', 'co_creator', 'lead'].includes(normalized);
};

const getContributorGroup = (contributor: Contributor) =>
  isCommunityLead(contributor.tag) ? 'community_leads' : 'contributors';

const getContributionTone = (points = 0, maxPoints = 0) => {
  const level = maxPoints > 0 ? Math.min(1, points / maxPoints) : 0;
  if (level >= 0.75) return 'rgba(57, 211, 83, 0.96)';
  if (level >= 0.45) return 'rgba(38, 166, 65, 0.82)';
  if (level > 0) return 'rgba(14, 99, 42, 0.68)';
  return 'rgba(22, 27, 34, 0.95)';
};

export default function LandingPage() {
  const { session, application, staffRole } = useAuth();
  const [highlights, setHighlights] = useState<HighlightEvent[]>([]);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [contributorTags, setContributorTags] = useState<ContributorTag[]>(DEFAULT_TAGS);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [openContributorId, setOpenContributorId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [eventsData, contributorsData, membersData] = await Promise.all([
          supabase.from('events').select('id, title, date, location, starts_at, highlight_image_url, highlight_note').eq('published', true).eq('archived', true).order('starts_at', { ascending: false, nullsFirst: false }),
          supabase.from('contributors').select('*').order('points', { ascending: false }).order('created_at', { ascending: true }),
          supabase.from('member_profiles').select('user_id, display_name, avatar_url, headline, bio, skills, github_url, linkedin_url, telegram_url, contact_email').eq('public_listing', true).order('display_name', { ascending: true })
        ]);
        const tagsData = await supabase.from('contributor_tags').select('*').order('label', { ascending: true });

        if (eventsData.data) setHighlights((eventsData.data as HighlightEvent[]).filter(event => Boolean(event.highlight_note?.trim() || event.highlight_image_url?.trim())));
        if (contributorsData.data && contributorsData.data.length > 0) setContributors(contributorsData.data as Contributor[]);
        if (membersData.data && membersData.data.length > 0) { setMembers(membersData.data as PublicMember[]); setSelectedMemberId(membersData.data[0].user_id); }
        if (tagsData.data && tagsData.data.length > 0) setContributorTags(tagsData.data as ContributorTag[]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        // Individual sections render their empty states when data is unavailable.
      }
    }

    fetchData();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const,
      },
    },
  };

  const maxContributionPoints = Math.max(0, ...contributors.map(contributor => contributor.points || 0));
  const teamFilters = [
    { value: 'all', label: 'All' },
    { value: 'community_leads', label: 'Community Leads' },
    { value: 'contributors', label: 'Contributors' },
  ];
  const visibleContributors = activeFilter === 'all'
    ? contributors
    : contributors.filter(contributor => getContributorGroup(contributor) === activeFilter);
  const sortedVisibleContributors = [...visibleContributors].sort((a, b) => {
    const pointDiff = (b.points || 0) - (a.points || 0);
    if (pointDiff !== 0) return pointDiff;
    return a.name.localeCompare(b.name);
  });
  const getContributorTag = (tag: string) =>
    contributorTags.find(option => option.value === tag) || { value: tag, label: formatContributorTag(tag), color: DEFAULT_TAG_COLOR };
  const communityHref = session
    ? (application?.status === 'approved' || staffRole ? '/community' : application ? '/application-status' : '/join')
    : '/auth';
  const joinHref = session ? communityHref : '/auth?mode=register';

  const displayHighlights = highlights;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text selection:bg-white selection:text-black">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Talkware Logo" className="w-8 h-8 object-contain" />
            <span className="font-display font-bold text-xl tracking-tighter uppercase">Talkware</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <a href="#mission" className="hover:text-white transition-colors">Home</a>
            <a href="#past-events" className="hover:text-white transition-colors">Past Events</a>
            <a href="#story" className="hover:text-white transition-colors">Our Story</a>
            <a href="#members" className="hover:text-white transition-colors">Members</a>
          </div>
          <Link
            to={communityHref}
            className="px-5 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-white/90 transition-all transform hover:scale-105 active:scale-95"
          >
            {session ? 'Community' : 'Join / Login'}
          </Link>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center pt-20 px-6 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30 pointer-events-none">
            <div className="absolute top-20 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-[120px]" />
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-7xl mx-auto text-center"
          >
            <motion.h1 variants={itemVariants} className="text-6xl md:text-8xl lg:text-9xl font-display font-bold leading-[0.9] tracking-tighter mb-8 text-gradient">
              TALKWARE <br /> COMMUNITY
            </motion.h1>

            <motion.p variants={itemVariants} className="max-w-2xl mx-auto text-lg md:text-xl text-white/60 font-light leading-relaxed mb-12">
              Home for passionate tech builders in Mandalay.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                to={joinHref}
                className="w-full sm:w-auto px-8 py-4 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-white/90 transition-all group"
              >
                {session ? 'Open Community' : 'Join Community'}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              {!session && <Link to="/auth" className="w-full sm:w-auto px-8 py-4 border border-white/15 font-bold rounded-xl flex items-center justify-center hover:bg-white/10 transition-all">Member Login</Link>}
            </motion.div>
          </motion.div>
        </section>

        {/* Mission Section */}
        <section id="mission" className="py-24 px-6 border-t border-white/5 bg-white/[0.02]">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">Mission</h2>
                <p className="text-white/60 text-lg leading-relaxed mb-8">
                  To create a place where passionate juniors can belong, connect with fellow builders, and grow together through shared learning, discussions, and product building.
                </p>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="p-6 glass rounded-2xl">
                    <Users className="w-8 h-8 mb-4 text-white" />
                    <h3 className="font-bold mb-2">Inclusive Network</h3>
                    <p className="text-sm text-white/50">Connecting creators from all walks of life to build something meaningful.</p>
                  </div>
                  <div className="p-6 glass rounded-2xl">
                    <Globe className="w-8 h-8 mb-4 text-white" />
                    <h3 className="font-bold mb-2">Builder Ecosystem</h3>
                    <p className="text-sm text-white/50">Acting as the discovery layer to find talent, build teams, and launch impact-driven ideas</p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative aspect-square rounded-3xl overflow-hidden"
              >
                <img
                  src="/assets/events/img-004.png"
                  alt="Talkware Community Team"
                  className="w-full h-full object-cover transition-all duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-8 left-8">
                  <p className="text-xs font-bold uppercase tracking-widest text-white/60 mb-1">Atmosphere</p>
                  <p className="text-xl font-display font-bold">Collaborative Energy</p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Past Events */}
        <section id="past-events" className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
              <div>
                <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">Past Events</h2>
                <p className="text-white/60 max-w-xl">From our very first meetup to a growing movement — here's how the Talkware community has evolved.</p>
              </div>
              <div className="text-sm text-white/40 font-mono">{displayHighlights.length} past events</div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayHighlights.map((event, i) => {
                const detailLink = `/event/${event.id}`;
                const eventDate = event.date || (event.starts_at ? new Date(event.starts_at).toLocaleDateString() : 'Date to be announced');
                const cardContent = (
                  <motion.div
                    key={event.id || i}
                    layoutId={`highlight-${event.id || i}`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="p-6 glass rounded-2xl group hover:bg-white/[0.06] transition-colors relative overflow-hidden flex flex-col"
                  >
                    <div className="absolute top-4 right-4 text-5xl font-display font-black text-white/[0.04] group-hover:text-white/[0.08] transition-colors select-none">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    {event.highlight_image_url && <div className="aspect-video mb-6 rounded-xl overflow-hidden bg-white/5">
                      <img
                        src={event.highlight_image_url}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                      />
                    </div>}
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-3">{eventDate}</p>
                    <h3 className="font-display font-bold text-lg mb-2">{event.title}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-white/40 mb-4">
                      <Globe className="w-3 h-3" />
                      <span>{event.location || 'Location to be announced'}</span>
                    </div>
                    {event.highlight_note && <p className="text-sm text-white/50 leading-relaxed">{event.highlight_note}</p>}
                    <div className="flex items-center gap-1 text-xs text-white/60 mt-auto pt-4 opacity-0 group-hover:opacity-100 transition-all"><span>View Details</span><ArrowRight className="w-3 h-3" /></div>
                  </motion.div>
                );

                return <Link key={event.id || i} to={detailLink} className="block">{cardContent}</Link>;
              })}
            </div>
          </div>
        </section>

        {/* Our Story */}
        <section id="story" className="py-24 px-6 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-4xl md:text-5xl font-display font-bold mb-8">Our Story</h2>
                <div className="space-y-6 text-white/60 text-lg leading-relaxed">
                  <p>
                    Talkware's journey began at the <span className="text-white font-bold">Venture Base Hackathon </span> as <span className="text-white font-bold">VentureOps Team</span> ,
                    where our founders realized that Mandalay's junior developers needed a supportive ecosystem
                    that didn't yet exist locally — a place to bridge the gap between learning and impact.
                  </p>
                </div>
              </motion.div>
              <div className="flex justify-center">
                <div className="relative rounded-3xl overflow-hidden glass aspect-4/3 w-full max-w-sm">
                  <img
                    src="/assets/founders/venturebase2.png"
                    alt="Hackathon Victory"
                    className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section id="contributors" className="py-24 px-6 border-t border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-gradient">Our Team</h2>
                <p className="text-white/60">Community Leads and Contributors</p>
              </div>
              <div className="glass inline-flex flex-wrap gap-1 rounded-2xl border border-white/10 p-1 md:justify-end">
                {teamFilters.map(filter => {
                  const count = filter.value === 'all'
                    ? contributors.length
                    : contributors.filter(c => getContributorGroup(c) === filter.value).length;
                  return (
                    <button
                      key={filter.value}
                      onClick={() => {
                        setActiveFilter(filter.value);
                        setOpenContributorId(null);
                      }}
                      className={`rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                        activeFilter === filter.value
                          ? 'bg-white text-black'
                          : 'text-white/45 hover:bg-white/10 hover:text-white'
                      }`}
                      title={`${filter.label} (${count})`}
                    >
                      {filter.label} <span className="opacity-60">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              {/* Contributor Cards */}
            {sortedVisibleContributors.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {sortedVisibleContributors
                  .map((contributor, i) => {
                    const contributionTone = getContributionTone(contributor.points, maxContributionPoints);
                    const tag = getContributorTag(contributor.tag);
                    const isOpen = openContributorId === contributor.id;
                    return (
                      <motion.div
                        key={contributor.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.06 }}
                        className={`glass rounded-2xl overflow-hidden group flex flex-col relative border transition-all ${
                          contributor.active ? 'hover:-translate-y-1' : 'bg-black/60'
                        }`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setOpenContributorId(isOpen ? null : contributor.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setOpenContributorId(isOpen ? null : contributor.id);
                          }
                        }}
                        style={{
                          borderColor: contributionTone,
                          boxShadow: `inset 0 0 0 2px ${contributionTone}`,
                        }}
                      >
                        {/* Image */}
                        <div className={`aspect-square overflow-hidden bg-white/[0.03] ${contributor.active ? '' : 'opacity-[0.45] grayscale'}`}>
                          {contributor.image_url ? (
                            <img
                              src={contributor.image_url}
                              alt={contributor.name}
                              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-white/5">
                              <User className="w-10 h-10 text-white/10" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className={`p-3 flex-1 flex flex-col gap-2 ${contributor.active ? '' : 'opacity-[0.45]'}`}>
                          {/* Tag badge */}
                          <div
                            className="self-start inline-flex px-2 py-0.5 rounded-md border text-[8px] font-bold uppercase tracking-wider"
                            style={{
                              borderColor: tag.color,
                              backgroundColor: `${tag.color}22`,
                              color: tag.color,
                            }}
                          >
                            {tag.label}
                          </div>

                          <h3 className="font-display font-bold text-xs leading-tight">{contributor.name}</h3>
                          <p className="text-[9px] text-white/40 leading-tight uppercase font-bold tracking-wider">{contributor.role}</p>
                          {isOpen && (
                            <div className="mt-1 flex items-center gap-2">
                              {contributor.github_url && (
                                <a
                                  href={contributor.github_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/60 hover:bg-white hover:text-black transition-all"
                                  aria-label={`${contributor.name} GitHub`}
                                >
                                  <Github className="h-3.5 w-3.5" />
                                </a>
                              )}
                              {contributor.linkedin_url && (
                                <a
                                  href={contributor.linkedin_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(event) => event.stopPropagation()}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white/60 hover:bg-white hover:text-black transition-all"
                                  aria-label={`${contributor.name} LinkedIn`}
                                >
                                  <Linkedin className="h-3.5 w-3.5" />
                                </a>
                              )}
                              {!contributor.github_url && !contributor.linkedin_url && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-white/25">No links</span>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center p-12 glass rounded-[3rem] border border-white/5">
                  <p className="text-white/40 uppercase tracking-widest text-sm font-bold">Team Members Coming Soon</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="members" className="py-24 px-6 border-t border-white/5 bg-white/[0.02]">
          <div className="max-w-7xl mx-auto">
            <div className="mb-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/30">People of Talkware</p>
                <h2 className="text-4xl md:text-5xl font-display font-bold text-gradient">Community Members</h2>
                <p className="mt-4 max-w-xl text-white/50">Builders who chose to share their community profile publicly.</p>
              </div>
              <Link to={joinHref} className="inline-flex items-center gap-2 self-start rounded-xl border border-white/15 px-5 py-3 text-sm font-bold hover:bg-white hover:text-black md:self-auto">Join them <ArrowRight className="h-4 w-4" /></Link>
            </div>
            {members.length > 0 ? (
              <MemberNetwork members={members} selectedId={selectedMemberId} onSelect={member => setSelectedMemberId(member.user_id)} />
            ) : (
              <div className="glass rounded-3xl p-12 text-center text-white/35">Approved members can opt in to appear here.</div>
            )}
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
              <p className="text-white/40 max-w-sm mb-8">
                Home for passionate tech builders in Mandalay.
              </p>
              <div className="flex items-center gap-4">
                <a href="https://github.com/orgs/talkware-mm/" target="_blank" rel="noopener noreferrer" className="p-3 glass rounded-full text-white/40 hover:text-white transition-all"><Github className="w-5 h-5" /></a>
              </div>
            </div>

            <div>
              <h4 className="font-display font-bold mb-6 uppercase tracking-wider text-sm">Community</h4>
              <ul className="space-y-4 text-sm text-white/40">
                <li><a href="#mission" className="hover:text-white transition-colors">Our Mission</a></li>
                <li><a href="#past-events" className="hover:text-white transition-colors">Past Events</a></li>
                <li><a href="#story" className="hover:text-white transition-colors">Our Story</a></li>
                <li><a href="#contributors" className="hover:text-white transition-colors">The Team</a></li>
                <li><a href="#members" className="hover:text-white transition-colors">Community Members</a></li>
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
            <p className="text-white/20 text-xs">
              © 2026 Talkware Community. All rights reserved.
            </p>
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
