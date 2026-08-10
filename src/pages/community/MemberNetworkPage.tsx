import { useEffect, useState } from 'react';
import MemberNetwork from '../../components/MemberNetwork';
import type { NetworkMember } from '../../components/MemberNetwork';
import { supabase } from '../../lib/supabase';

export default function MemberNetworkPage() {
  const [members, setMembers] = useState<NetworkMember[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('member_profiles').select('user_id, display_name, avatar_url, headline, bio, skills, github_url, linkedin_url, telegram_url, contact_email').eq('public_listing', true).order('display_name').then(result => {
      if (result.error) console.error('Unable to load member network:', result.error);
      const rows = (result.data as NetworkMember[] | null) || [];
      setMembers(rows);
      setSelectedId(rows[0]?.user_id || null);
      setLoading(false);
    });
  }, []);

  return <div><p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-white/35">Community directory</p><h1 className="text-4xl font-bold md:text-6xl">Member Network</h1><p className="mt-4 max-w-2xl text-white/50">Explore members who chose to share their Member Card. Select a profile to view their work and contact links.</p><div className="mt-9">{loading ? <div className="glass rounded-3xl p-12 text-center text-white/35">Loading member network…</div> : <MemberNetwork members={members} selectedId={selectedId} onSelect={member => setSelectedId(member.user_id)} />}</div></div>;
}
