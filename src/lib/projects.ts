import { supabase } from './supabase';
import type { CommunityProject } from '../types/projects';

type ProjectRow = {
  id: string; slug: string; name: string; short_description: string; description: string; problem: string | null;
  cover_image_url: string | null; screenshots: string[]; status: CommunityProject['status']; tech_stack: string[]; tags: string[];
  github_url: string | null; demo_url: string | null; looking_for_contributors: boolean; contribution_needs: string[];
  featured: boolean; published_at: string | null;
  community_project_members: { display_name: string; role: string | null; is_creator: boolean; sort_order: number }[];
};

function toCommunityProject(row: ProjectRow): CommunityProject {
  const members = [...(row.community_project_members || [])].sort((a, b) => a.sort_order - b.sort_order);
  return {
    id: row.id, slug: row.slug, name: row.name, shortDescription: row.short_description, description: row.description,
    problem: row.problem || undefined, coverImage: row.cover_image_url || undefined, screenshots: row.screenshots || [],
    creators: members.filter(member => member.is_creator).map(member => ({ name: member.display_name })), status: row.status,
    techStack: row.tech_stack || [], tags: row.tags || [], githubUrl: row.github_url || undefined, demoUrl: row.demo_url || undefined,
    lookingForContributors: row.looking_for_contributors, contributionNeeds: row.contribution_needs || [], featured: row.featured, publishedAt: row.published_at || undefined,
  };
}

const projectSelect = '*, community_project_members(display_name, role, is_creator, sort_order)';

export async function fetchCommunityProjects() {
  const { data, error } = await supabase.from('community_projects').select(projectSelect).eq('publication_status', 'published').order('featured', { ascending: false }).order('published_at', { ascending: false });
  return { data: (data as unknown as ProjectRow[] | null)?.map(toCommunityProject) || [], error };
}

export async function fetchCommunityProject(slug: string) {
  const { data, error } = await supabase.from('community_projects').select(projectSelect).eq('publication_status', 'published').eq('slug', slug).maybeSingle();
  return { data: data ? toCommunityProject(data as unknown as ProjectRow) : undefined, error };
}
