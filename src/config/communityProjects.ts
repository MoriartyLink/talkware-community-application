import type { ProjectBadge, ProjectStatus } from '../types/projects';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = { idea: 'Idea', building: 'Building', mvp: 'MVP', launched: 'Launched', maintaining: 'Maintaining' };
export const PROJECT_BADGE_LABELS: Record<string, string> = {
  'talkware-member-project': 'Talkware Member Project', 'built-at-talkware-meetup': 'Built at Talkware Meetup', 'open-source': 'Open Source', 'looking-for-contributors': 'Looking for Contributors',
};
export function getProjectBadgeLabel(badge: ProjectBadge) { return PROJECT_BADGE_LABELS[badge] || badge.replace(/[_-]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase()); }
