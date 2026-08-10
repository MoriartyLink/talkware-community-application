import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { MemberPass } from '../../types/community';

export default function MemberPassPage() {
  const { profile, session } = useAuth();
  const [pass, setPass] = useState<MemberPass | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    supabase.from('member_passes').select('*').eq('user_id', session!.user.id).maybeSingle().then(({ data, error: loadError }) => {
      if (loadError) setError(loadError.message); else setPass(data as MemberPass | null);
    });
  }, [session]);
  const qrValue = pass ? `talkware:member:${pass.token}` : '';

  return (
    <div>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-white/35">Attendance pass</p>
      <h1 className="text-4xl font-bold md:text-6xl">My member QR</h1>
      <p className="mt-4 max-w-2xl text-white/50">Show this pass to an organizer at a registered event. It contains an opaque token and no personal information.</p>
      <div className="mt-10 max-w-md rounded-[2rem] bg-white p-6 text-black shadow-2xl shadow-white/5 md:p-9">
        <div className="mb-6 flex items-center justify-between"><div className="flex items-center gap-2"><img src="/logo.png" className="h-8 w-8 object-contain invert" alt="" /><span className="font-display font-bold uppercase">Talkware</span></div><ShieldCheck className="h-6 w-6" /></div>
        {pass?.active ? <><div className="mx-auto flex aspect-square max-w-[280px] items-center justify-center rounded-2xl bg-white p-2"><QRCodeSVG value={qrValue} size={260} level="M" marginSize={2} /></div><h2 className="mt-6 text-center text-2xl font-bold">{profile?.display_name}</h2><p className="mt-1 text-center text-sm text-black/50">Approved community member</p><p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-black/30">Do not share a screenshot of this pass</p></> : <div className="rounded-2xl bg-black/5 p-10 text-center text-black/50">{error || 'Your member pass is being prepared. Please contact an admin if it does not appear.'}</div>}
      </div>
    </div>
  );
}
