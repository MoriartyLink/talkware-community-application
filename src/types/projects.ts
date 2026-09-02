export type ProjectStatus = 'idea' | 'building' | 'mvp' | 'launched' | 'maintaining';
export type ProjectBadge = string;
export interface CommunityProject {
  id: string; slug: string; name: string; shortDescription: string; description: string; problem?: string; coverImage?: string; screenshots?: string[];
  creators: { name: string; profileUrl?: string }[]; status: ProjectStatus; techStack: string[]; tags: string[]; badges?: ProjectBadge[];
  githubUrl?: string; demoUrl?: string; lookingForContributors?: boolean; contributionNeeds?: string[]; featured?: boolean; publishedAt?: string;
}
