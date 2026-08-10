import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createResourceUrl } from '../lib/community';
import { supabase } from '../lib/supabase';
import type { EventResource } from '../types/community';

interface EventResourcesSectionProps {
  eventId: string;
}

export default function EventResourcesSection({ eventId }: EventResourcesSectionProps) {
  const { application, staffRole } = useAuth();
  const [resources, setResources] = useState<EventResource[]>([]);
  const [notice, setNotice] = useState('');
  const isApprovedMember = application?.status === 'approved' || Boolean(staffRole);

  useEffect(() => {
    let active = true;

    if (!isApprovedMember) {
      setResources([]);
      return () => { active = false; };
    }

    const loadResources = async () => {
      const { data, error } = await supabase
        .from('event_resources')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true });

      if (!active) return;
      if (error) {
        console.error('Unable to load event resources:', error);
        setNotice(error.message);
        return;
      }
      setResources((data as EventResource[]) || []);
    };

    void loadResources();
    return () => { active = false; };
  }, [eventId, isApprovedMember]);

  if (!isApprovedMember) return null;

  const openResource = async (resource: EventResource) => {
    setNotice('');
    try {
      const url = await createResourceUrl(resource.storage_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not open this resource.');
    }
  };

  return (
    <section className="border-t border-white/5 px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <div className="mb-7 flex items-center gap-3">
          <FileText className="h-6 w-6 text-white/50" />
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">Member resources</h2>
            <p className="mt-1 text-sm text-white/35">Available to every approved community member.</p>
          </div>
        </div>
        {resources.length > 0 ? (
          <div className="grid gap-3">
            {resources.map(resource => (
              <button key={resource.id} onClick={() => openResource(resource)} className="glass flex items-center justify-between rounded-2xl p-5 text-left hover:bg-white/10">
                <span>
                  <span className="block font-bold">{resource.title}</span>
                  <span className="mt-1 block text-xs text-white/35">
                    {resource.mime_type || 'Event resource'}
                    {resource.file_size ? ` · ${(resource.file_size / 1024 / 1024).toFixed(1)} MB` : ''}
                  </span>
                </span>
                <Download className="h-5 w-5 text-white/45" />
              </button>
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl p-7 text-center text-sm text-white/35">Resources will appear here when organizers publish them.</div>
        )}
        {notice && <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">{notice}</div>}
      </div>
    </section>
  );
}
