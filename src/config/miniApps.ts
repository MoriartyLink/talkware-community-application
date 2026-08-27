export type MiniAppStatus = 'available' | 'beta' | 'coming_soon';

export interface MiniAppDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  route: string;
  status: MiniAppStatus;
}

export const MINI_APPS: readonly MiniAppDefinition[] = [];
