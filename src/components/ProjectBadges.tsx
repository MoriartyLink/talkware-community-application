import { getProjectBadgeLabel } from '../config/communityProjects';
import type { ProjectBadge } from '../types/projects';
export default function ProjectBadges({ badges = [], lookingForContributors }: { badges?: ProjectBadge[]; lookingForContributors?: boolean }) {
  const visible = [...badges]; if (lookingForContributors && !visible.includes('looking-for-contributors')) visible.push('looking-for-contributors');
  return visible.length ? <div className="flex flex-wrap gap-2">{visible.map(badge => <span key={badge} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/55">{getProjectBadgeLabel(badge)}</span>)}</div> : null;
}
