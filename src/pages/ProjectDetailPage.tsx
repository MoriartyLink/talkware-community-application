import { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Github, Image as ImageIcon } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import ProjectBadges from '../components/ProjectBadges';
import { PROJECT_STATUS_LABELS } from '../config/communityProjects';
import { fetchCommunityProject } from '../lib/projects';
import type { CommunityProject } from '../types/projects';

export default function ProjectDetailPage() {
  const { slug } = useParams();
  const [project, setProject] = useState<CommunityProject>();
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (slug) fetchCommunityProject(slug).then(result => { setProject(result.data); setLoading(false); }); }, [slug]);
  if (!loading && !project) return <Navigate to="/projects" replace />;
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-black text-white/45">Loading project…</div>;
  return <div className="min-h-screen bg-black text-white">
    <header className="border-b border-white/10 px-5 py-5"><div className="mx-auto flex max-w-5xl"><Link to="/community" className="inline-flex items-center gap-2 text-sm text-white/55"><ArrowLeft className="h-4 w-4" /> Back to community</Link></div></header>
    <main className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-20">
      <ProjectBadges badges={project!.badges} lookingForContributors={project!.lookingForContributors} /><h1 className="mt-6 text-5xl font-bold md:text-7xl">{project!.name.replace(/^Talkware\s+/i, '')}</h1><p className="mt-5 max-w-3xl text-xl leading-relaxed text-white/55">{project!.shortDescription}</p>
      <div className="mt-9 flex flex-wrap gap-3">{project!.demoUrl && <a href={project!.demoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-bold text-black">View Demo <ExternalLink className="h-4 w-4" /></a>}{project!.githubUrl && <a href={project!.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-3 font-bold"><Github className="h-4 w-4" /> View GitHub</a>}</div>
      <div className="mt-12 overflow-hidden rounded-3xl border border-white/10 bg-white/5">{project!.coverImage ? <img src={project!.coverImage} alt={`${project!.name} cover`} className="max-h-[560px] w-full object-cover" /> : <div className="flex aspect-video items-center justify-center text-white/20"><ImageIcon className="h-12 w-12" /></div>}</div>
      <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_280px]"><section><h2 className="text-2xl font-bold">About the project</h2><p className="mt-4 leading-relaxed text-white/55">{project!.description}</p>{project!.problem && <><h2 className="mt-10 text-2xl font-bold">The problem</h2><p className="mt-4 leading-relaxed text-white/55">{project!.problem}</p></>}</section><aside className="glass h-fit rounded-3xl p-6"><p className="text-xs font-bold uppercase tracking-widest text-white/35">Status</p><p className="mt-2 font-semibold">{PROJECT_STATUS_LABELS[project!.status]}</p><p className="mt-6 text-xs font-bold uppercase tracking-widest text-white/35">Creators</p><p className="mt-2 font-semibold">{project!.creators.map(creator => creator.name).join(' · ') || 'Community project'}</p><p className="mt-6 text-xs font-bold uppercase tracking-widest text-white/35">Tech stack</p><div className="mt-3 flex flex-wrap gap-2">{project!.techStack.map(tech => <span key={tech} className="rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white/60">{tech}</span>)}</div><p className="mt-6 text-xs font-bold uppercase tracking-widest text-white/35">Tags</p><div className="mt-3 flex flex-wrap gap-2">{project!.tags.map(tag => <span key={tag} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/50">{tag}</span>)}</div></aside></div>
    </main>
  </div>;
}
