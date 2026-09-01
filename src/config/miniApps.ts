export type MiniAppStatus = 'available' | 'beta' | 'coming_soon';

export interface MiniAppDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  route: string;
  status: MiniAppStatus;
}

export const MINI_APPS: readonly MiniAppDefinition[] = [
  {
    id: 'peer-sessions',
    name: 'Peer Sessions',
    slug: 'peer-session',
    description: 'Spend your community points to request 1:1 help, mentoring, feedback, or technical guidance from other Talkware members.',
    route: '/community/mini-apps/peer-session',
    status: 'beta',
  },
];
