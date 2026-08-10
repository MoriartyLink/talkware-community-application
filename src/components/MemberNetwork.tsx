import { Github, Linkedin, Mail, Send, UserRound } from 'lucide-react';
import { motion } from 'motion/react';

export interface NetworkMember {
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  headline?: string | null;
  bio?: string | null;
  skills?: string[];
  github_url?: string | null;
  linkedin_url?: string | null;
  telegram_url?: string | null;
  contact_email?: string | null;
}

interface Props {
  members: NetworkMember[];
  selectedId?: string | null;
  onSelect?: (member: NetworkMember) => void;
  emptyMessage?: string;
}

export default function MemberNetwork({ members, selectedId, onSelect, emptyMessage = 'No public Member Cards yet.' }: Props) {
  const visibleMembers = members.slice(0, 12);
  const selected = members.find(member => member.user_id === selectedId) || visibleMembers[0];
  if (!members.length) return <div className="glass rounded-3xl p-12 text-center text-white/35">{emptyMessage}</div>;

  const nodes = visibleMembers.map((member, index) => {
    const angle = (Math.PI * 2 * index / visibleMembers.length) - Math.PI / 2;
    return { member, x: 50 + Math.cos(angle) * 42, y: 50 + Math.sin(angle) * 38 };
  });

  return <div className="min-w-0">
    <div className="glass relative h-[430px] overflow-hidden rounded-[2rem] sm:h-[560px] lg:h-[620px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.12),transparent_45%)]" />
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-40" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {nodes.map(({ member, x, y }) => <motion.line key={member.user_id} x1="50" y1="50" x2={x} y2={y} stroke="rgba(110,231,183,.45)" strokeWidth=".18" strokeDasharray="1.2 1.2" initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.9 }} />)}
      </svg>
      <motion.div className="absolute left-1/2 top-1/2 z-10 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-emerald-300/30 bg-black/80 shadow-[0_0_60px_rgba(16,185,129,.25)] sm:h-32 sm:w-32" animate={{ boxShadow: ['0 0 35px rgba(16,185,129,.12)', '0 0 75px rgba(16,185,129,.3)', '0 0 35px rgba(16,185,129,.12)'] }} transition={{ duration: 4, repeat: Infinity }}><img src="/logo.png" alt="Talkware" className="h-9 w-9 object-contain sm:h-12 sm:w-12" /><span className="mt-2 text-[9px] font-bold uppercase tracking-[0.2em] text-emerald-200/60">Network</span></motion.div>
      {nodes.map(({ member, x, y }, index) => <motion.button key={member.user_id} type="button" onClick={() => onSelect?.(member)} style={{ left: `${x}%`, top: `${y}%` }} className="absolute z-20 -translate-x-1/2 -translate-y-1/2 text-center" initial={{ opacity: 0, scale: 0.5 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} animate={{ y: [0, index % 2 ? -5 : 5, 0] }} transition={{ opacity: { delay: index * 0.05 }, scale: { delay: index * 0.05 }, y: { duration: 3.5 + index * 0.15, repeat: Infinity, ease: 'easeInOut' } }} aria-label={`Open ${member.display_name}'s Member Card`}>
        <span className={`mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 bg-black shadow-xl transition sm:h-16 sm:w-16 lg:h-20 lg:w-20 ${selected?.user_id === member.user_id ? 'border-emerald-300 shadow-emerald-400/30' : 'border-white/20 hover:border-white/60'}`}>{member.avatar_url ? <img src={member.avatar_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <UserRound className="h-5 w-5 text-white/30 sm:h-7 sm:w-7" />}</span>
        <span className="mt-1 block max-w-20 truncate rounded-full bg-black/70 px-2 py-1 text-[8px] font-bold text-white/70 backdrop-blur sm:max-w-28 sm:text-[10px]">{member.display_name}</span>
      </motion.button>)}
      {members.length > 12 && <div className="absolute bottom-4 right-4 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white/40">+{members.length - 12} more members</div>}
    </div>
    {members.length > 12 && <div className="mt-3 flex gap-2 overflow-x-auto pb-2"><span className="flex shrink-0 items-center px-2 text-[10px] font-bold uppercase tracking-wider text-white/30">All members</span>{members.map(member => <button key={member.user_id} type="button" onClick={() => onSelect?.(member)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${selected?.user_id === member.user_id ? 'border-emerald-300/50 bg-emerald-400/10 text-emerald-200' : 'border-white/10 text-white/45'}`}>{member.display_name}</button>)}</div>}
    {selected && <motion.article key={selected.user_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass mt-4 grid gap-5 rounded-3xl p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/5">{selected.avatar_url ? <img src={selected.avatar_url} alt={selected.display_name} className="h-full w-full object-cover" /> : <UserRound className="h-7 w-7 text-white/25" />}</div>
      <div className="min-w-0"><h3 className="text-xl font-bold">{selected.display_name}</h3>{selected.headline && <p className="mt-1 text-sm text-emerald-200/65">{selected.headline}</p>}{selected.bio && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/45">{selected.bio}</p>}{selected.skills?.length ? <div className="mt-3 flex flex-wrap gap-1.5">{selected.skills.slice(0, 6).map(skill => <span key={skill} className="rounded-md bg-white/5 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/35">{skill}</span>)}</div> : null}</div>
      <div className="flex flex-wrap gap-2 sm:max-w-28 sm:justify-end">{selected.linkedin_url && <ContactLink href={selected.linkedin_url} label="LinkedIn"><Linkedin className="h-4 w-4" /></ContactLink>}{selected.telegram_url && <ContactLink href={selected.telegram_url} label="Telegram"><Send className="h-4 w-4" /></ContactLink>}{selected.contact_email && <ContactLink href={`mailto:${selected.contact_email}`} label="Email"><Mail className="h-4 w-4" /></ContactLink>}{selected.github_url && <ContactLink href={selected.github_url} label="GitHub"><Github className="h-4 w-4" /></ContactLink>}</div>
    </motion.article>}
  </div>;
}

function ContactLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  const external = !href.startsWith('mailto:');
  return <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} aria-label={label} title={label} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/50 hover:bg-white hover:text-black">{children}</a>;
}
