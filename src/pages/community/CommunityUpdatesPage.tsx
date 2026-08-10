import { useEffect, useMemo, useState } from 'react';
import { Heart, Sparkles, ThumbsUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { CommunityPost, PostReaction, ReactionType } from '../../types/community';

const reactionOptions: { value: ReactionType; label: string; icon: typeof Heart }[] = [
  { value: 'like', label: 'Like', icon: ThumbsUp },
  { value: 'celebrate', label: 'Celebrate', icon: Sparkles },
  { value: 'support', label: 'Support', icon: Heart },
];

export default function CommunityUpdatesPage() {
  const { session } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [reactions, setReactions] = useState<PostReaction[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    const [postResult, reactionResult] = await Promise.all([
      supabase.from('community_posts').select('*').eq('published', true).order('published_at', { ascending: false }),
      supabase.from('post_reactions').select('*'),
    ]);
    if (postResult.error) setError(postResult.error.message);
    else setPosts((postResult.data as CommunityPost[]) || []);
    if (reactionResult.error) setError(reactionResult.error.message);
    else setReactions((reactionResult.data as PostReaction[]) || []);
  };

  useEffect(() => { load(); }, []);
  const counts = useMemo(() => reactions.reduce<Record<string, number>>((acc, item) => { const key = `${item.post_id}:${item.reaction}`; acc[key] = (acc[key] || 0) + 1; return acc; }, {}), [reactions]);

  const react = async (postId: string, reaction: ReactionType) => {
    const current = reactions.find(item => item.post_id === postId && item.member_id === session!.user.id);
    const result = current?.reaction === reaction
      ? await supabase.from('post_reactions').delete().eq('post_id', postId).eq('member_id', session!.user.id)
      : await supabase.from('post_reactions').upsert({ post_id: postId, member_id: session!.user.id, reaction }, { onConflict: 'post_id,member_id' });
    if (result.error) setError(result.error.message); else await load();
  };

  return (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-white/35">From the community</p>
      <h1 className="text-4xl font-bold md:text-6xl">Updates</h1>
      <p className="mt-4 max-w-2xl text-white/50">Announcements, progress, and news from Talkware organizers.</p>
      {error && <div className="mt-7 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}
      <div className="mt-9 space-y-6">
        {posts.map(post => {
          const mine = reactions.find(item => item.post_id === post.id && item.member_id === session!.user.id)?.reaction;
          return <article key={post.id} className="glass rounded-3xl p-6 md:p-8"><div className="mb-5 flex flex-wrap items-start justify-between gap-3"><h2 className="text-2xl font-bold">{post.title}</h2><time className="text-xs text-white/30">{new Date(post.published_at || post.created_at).toLocaleDateString()}</time></div><p className="whitespace-pre-wrap leading-7 text-white/60">{post.body}</p><div className="mt-7 flex flex-wrap gap-2">{reactionOptions.map(({ value, label, icon: Icon }) => <button key={value} onClick={() => react(post.id, value)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition ${mine === value ? 'border-white bg-white text-black' : 'border-white/10 text-white/45 hover:border-white/30 hover:text-white'}`}><Icon className="h-3.5 w-3.5" /> {label} <span className="opacity-60">{counts[`${post.id}:${value}`] || 0}</span></button>)}</div></article>;
        })}
        {posts.length === 0 && <div className="glass rounded-3xl p-12 text-center text-white/40">No community updates have been published yet.</div>}
      </div>
    </div>
  );
}
