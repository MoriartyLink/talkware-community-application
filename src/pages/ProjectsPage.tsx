import { useEffect, useState } from 'react';
import { ArrowRight, Boxes, Mail, X } from 'lucide-react';
import ProjectCard from '../components/ProjectCard';
import { fetchCommunityProjects } from '../lib/projects';

const submissionHref = `mailto:team.talkware@gmail.com?subject=${encodeURIComponent('Talkware Project Submission')}&body=${encodeURIComponent('Project name:\nShort description:\nFull description / problem:\nCreator / contributors:\nGitHub URL:\nLive demo URL (if available):\nScreenshot / cover image:\nTech stack:\nCurrent status:\nAre contributors wanted? What help is needed?')}`;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Awaited<ReturnType<typeof fetchCommunityProjects>>['data']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitOpen, setSubmitOpen] = useState(false);
  useEffect(() => { fetchCommunityProjects().then(result => { setProjects(result.data); setError(result.error?.message || ''); setLoading(false); }); }, []);
  return <div className="text-white">
    <main className="max-w-7xl">
      <div className="flex flex-col items-start gap-8"><div><p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-white/35">Made by the community</p><h1 className="text-5xl font-bold md:text-7xl">Talkware Projects</h1><p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/50">A showcase of things Talkware members are imagining, building, and shipping together.</p></div><button type="button" onClick={() => setSubmitOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-black"><Mail className="h-4 w-4" /> Submit Your Project</button></div>
      {loading ? <div className="glass mt-14 rounded-3xl p-12 text-center text-white/45">Loading projects…</div> : error ? <div className="glass mt-14 rounded-3xl p-12 text-center text-rose-200">Unable to load projects: {error}</div> : projects.length ? <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{projects.map(project => <ProjectCard key={project.id} project={project} />)}</div> : <section className="glass mt-14 rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center"><Boxes className="mx-auto h-10 w-10 text-white/25" /><h2 className="mt-6 text-2xl font-bold">Your project could be next</h2><p className="mx-auto mt-3 max-w-lg text-sm text-white/45">Building something as a Talkware member? Submit your project and share what you're working on with the community.</p><button type="button" onClick={() => setSubmitOpen(true)} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-black">Submit Your Project <ArrowRight className="h-4 w-4" /></button></section>}
      {submitOpen && <ProjectSubmissionOverlay onClose={() => setSubmitOpen(false)} />}
    </main>
  </div>;
}

function ProjectSubmissionOverlay({ onClose }: { onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="project-submission-title" onClick={onClose}>
    <section className="glass max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-neutral-950 p-6 md:p-8" onClick={event => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">Project showcase</p><h2 id="project-submission-title" className="mt-2 text-2xl font-bold">Before you submit</h2></div><button type="button" onClick={onClose} aria-label="Close submission information" className="rounded-xl p-2 text-white/40 hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button></div>
      <p className="mt-5 text-sm leading-relaxed text-white/55">Please include the following information in your email so we can review and publish your project:</p>
      <ul className="mt-5 space-y-3 text-sm text-white/70">{['Project name and short description', 'Full project description and the problem it solves', 'Creator and contributor names', 'GitHub repository and live demo URL, if available', 'Screenshot or cover image', 'Tech stack and current project status', 'Whether you are looking for contributors and what help you need'].map(item => <li key={item} className="flex gap-3"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />{item}</li>)}</ul>
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white/60 hover:text-white">Cancel</button><a href={submissionHref} onClick={onClose} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-black"><Mail className="h-4 w-4" /> Open submission email</a></div>
    </section>
  </div>;
}
