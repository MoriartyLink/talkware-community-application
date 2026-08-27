import { ArrowRight, Boxes, Clock3, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MINI_APPS } from '../../config/miniApps';

const statusLabel = { available: 'Available', beta: 'Beta', coming_soon: 'Coming Soon' } as const;

export default function MiniAppsPage() {
  return (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-white/35">Community tools</p>
      <h1 className="text-4xl font-bold md:text-6xl">Mini Apps</h1>
      <p className="mt-4 max-w-2xl text-lg text-white/50">Small tools built for the Talkware community to learn, contribute, collaborate, and connect.</p>

      {MINI_APPS.length > 0 ? <div className="mt-10 grid gap-5 lg:grid-cols-2">{MINI_APPS.map(app => {
        const enabled = app.status !== 'coming_soon';
        const card = <><div className="flex items-start justify-between gap-4"><span className={`rounded-2xl p-3 ${enabled ? 'bg-emerald-300/10 text-emerald-200' : 'bg-white/5 text-white/30'}`}>{enabled ? <Sparkles className="h-6 w-6" /> : <Clock3 className="h-6 w-6" />}</span><span className={`rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest ${enabled ? 'bg-emerald-300/10 text-emerald-200' : 'bg-white/5 text-white/35'}`}>{statusLabel[app.status]}</span></div><h2 className="mt-8 text-2xl font-bold">{app.name}</h2><p className="mt-3 min-h-12 text-sm leading-relaxed text-white/45">{app.description}</p><span className={`mt-7 inline-flex items-center gap-2 text-sm font-bold ${enabled ? 'text-white/70 group-hover:text-white' : 'text-white/30'}`}>{enabled ? <>Open Mini App <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></> : 'Coming Soon'}</span></>;
        return enabled ? <Link key={app.id} to={app.route} className="glass group rounded-3xl p-6 transition hover:bg-white/10 md:p-8">{card}</Link> : <article key={app.id} className="glass rounded-3xl p-6 md:p-8">{card}</article>;
      })}</div> : <section className="glass mt-10 rounded-3xl border border-dashed border-white/10 px-6 py-14 text-center md:px-10 md:py-20"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5"><Boxes className="h-7 w-7 text-white/25" /></span><h2 className="mt-6 text-2xl font-bold">Mini Apps are coming soon</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-white/45">This space is ready for focused community tools. New Mini Apps will appear here when they are available.</p></section>}
    </div>
  );
}
