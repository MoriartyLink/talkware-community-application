import { supabase } from './supabase';
import type { CommunityEvent } from '../types/community';

export function formatEventDate(event: Pick<CommunityEvent, 'starts_at' | 'date'>) {
  if (!event.starts_at) return event.date || 'Date to be announced';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(event.starts_at));
}

export function getEventShareUrl(eventId: string) {
  return `${window.location.origin}/event/${eventId}`;
}

export async function shareEvent(event: Pick<CommunityEvent, 'id' | 'title'>) {
  const url = getEventShareUrl(event.id);
  if (navigator.share) {
    await navigator.share({ title: event.title, text: `Join me at ${event.title}`, url });
    return 'shared';
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}

export async function createResourceUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from('event-resources')
    .createSignedUrl(storagePath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}
