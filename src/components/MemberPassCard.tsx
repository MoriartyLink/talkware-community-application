import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { MemberPass } from '../types/community';

interface MemberPassCardProps {
  compact?: boolean;
}

export default function MemberPassCard({ compact = false }: MemberPassCardProps) {
  const { profile, session } = useAuth();
  const [pass, setPass] = useState<MemberPass | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.user.id) return;
    supabase.from('member_passes').select('*').eq('user_id', session.user.id).maybeSingle().then(({ data, error: loadError }) => {
      if (loadError) setError(loadError.message); else setPass(data as MemberPass | null);
    });
  }, [session?.user.id]);

  const qrValue = pass ? `talkware:member:${pass.token}` : '';

  return <div className={`rounded-[2rem] bg-white text-black shadow-2xl shadow-white/5 ${compact ? 'p-5' : 'max-w-md p-6 md:p-9'}`}>
      <div className="mb-6 flex items-center justify-between"><div className="flex items-center gap-2"><img src="/logo.png" className="h-8 w-8 object-contain invert" alt="" /><span className="font-display font-bold uppercase">Talkware</span></div><ShieldCheck className="h-6 w-6" /></div>
      {pass?.active ? <><div className={`mx-auto flex aspect-square items-center justify-center rounded-2xl bg-white p-2 ${compact ? 'max-w-[220px]' : 'max-w-[280px]'}`}><QRCodeSVG value={qrValue} size={compact ? 204 : 260} level="M" marginSize={2} /></div><h3 className={`${compact ? 'mt-4 text-xl' : 'mt-6 text-2xl'} text-center font-bold`}>{profile?.display_name}</h3><p className="mt-1 text-center text-sm text-black/50">Approved community member</p><p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-black/30">Do not share a screenshot of this pass</p></> : <div className="rounded-2xl bg-black/5 p-8 text-center text-sm text-black/50">{error || 'Your member pass is being prepared. Please contact an admin if it does not appear.'}</div>}
  </div>;
}
