import { useEffect, useState } from 'react';
import { ArrowRight, Boxes, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProjectCard from '../components/ProjectCard';
import { fetchCommunityProjects } from '../lib/projects';

const submissionHref = `mailto:team.talkware@gmail.com?subject=${encodeURIComponent('Talkware Project Submission')}&body=${encodeURIComponent('Project name:\nShort description:\nFull description / problem:\nCreator / contributors:\nGitHub URL:\nLive demo URL (if available):\nScreenshot / cover image:\nTech stack:\nCurrent status:\nAre contributors wanted? What help is needed?')}`;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Awaited<ReturnType<typeof fetchCommunityProjects>>['data']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { fetchCommunityProjects().then(result => { setProjects(result.data); setError(result.error?.message || ''); setLoading(false); }); }, []);
  return <div className="min-h-screen bg-black text-white">
    <header className="border-b border-white/10 px-5 py-5"><div className="mx-auto flex max-w-7xl"><Link to="/community" className="text-sm text-white/50 hover:text-white">Back to community</Link></div></header>
    <main className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
      <div className="flex flex-col items-start gap-8"><div><p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-white/35">Made by the community</p><h1 className="text-5xl font-bold md:text-7xl">Talkware Projects</h1><p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/50">A showcase of things Talkware members are imagining, building, and shipping together.</p></div><a href={submissionHref} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-black"><Mail className="h-4 w-4" /> Submit Your Project</a></div>
      {loading ? <div className="glass mt-14 rounded-3xl p-12 text-center text-white/45">Loading projects…</div> : error ? <div className="glass mt-14 rounded-3xl p-12 text-center text-rose-200">Unable to load projects: {error}</div> : projects.length ? <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{projects.map(project => <ProjectCard key={project.id} project={project} />)}</div> : <section className="glass mt-14 rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center"><Boxes className="mx-auto h-10 w-10 text-white/25" /><h2 className="mt-6 text-2xl font-bold">Your project could be next</h2><p className="mx-auto mt-3 max-w-lg text-sm text-white/45">Building something as a Talkware member? Submit your project and share what you're working on with the community.</p><a href={submissionHref} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-black">Submit Your Project <ArrowRight className="h-4 w-4" /></a></section>}
    </main>
  </div>;
}
