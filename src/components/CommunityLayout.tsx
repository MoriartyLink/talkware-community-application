import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Boxes, CalendarDays, Coins, Home, LogOut, Newspaper, QrCode, UserRound, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import MemberPassCard from './MemberPassCard';

const links = [
  { to: '/community', label: 'Home', icon: Home, end: true },
  { to: '/community/events', label: 'Events', icon: CalendarDays },
  { to: '/community/updates', label: 'Updates', icon: Newspaper },
  { to: '/community/mini-apps', label: 'Mini Apps', icon: Boxes },
  { to: '/member/points', label: 'Points', icon: Coins },
  { to: '/community/profile', label: 'Profile', icon: UserRound },
];

export default function CommunityLayout() {
  const { profile, session, signOut } = useAuth();
  const navigate = useNavigate();
  const [qrOpen, setQrOpen] = useState(false);
  const qrMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!qrOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!qrMenuRef.current?.contains(event.target as Node)) setQrOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setQrOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [qrOpen]);
  const leave = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/85 px-4 backdrop-blur-xl md:px-6">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Talkware" className="h-8 w-8 object-contain" />
            <div><span className="block font-display font-bold uppercase tracking-tight">Talkware</span><span className="block text-[9px] uppercase tracking-[0.24em] text-white/35">Community</span></div>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block"><p className="text-sm font-semibold">{profile?.display_name || session?.user.email}</p><p className="text-xs text-emerald-300/70">Approved member</p></div>
            <div ref={qrMenuRef} className="relative">
              <button type="button" onClick={() => setQrOpen(current => !current)} aria-expanded={qrOpen} aria-haspopup="dialog" aria-label="Open member QR" className={`rounded-xl border p-2.5 transition ${qrOpen ? 'border-white bg-white text-black' : 'border-white/10 text-white/50 hover:bg-white/10 hover:text-white'}`}><QrCode className="h-4 w-4" /></button>
              {qrOpen && <div role="dialog" aria-label="Member QR pass" className="absolute right-0 top-12 z-50 w-[min(340px,calc(100vw-2rem))] rounded-3xl border border-white/10 bg-neutral-950 p-3 shadow-2xl shadow-black/60"><div className="mb-3 flex items-center justify-between px-2 pt-1"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">Attendance pass</p><p className="mt-1 font-bold text-white">My member QR</p></div><button type="button" onClick={() => setQrOpen(false)} aria-label="Close member QR" className="rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button></div><MemberPassCard compact /></div>}
            </div>
            <button onClick={leave} className="rounded-xl border border-white/10 p-2.5 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Sign out"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl md:grid-cols-[220px_1fr]">
        <aside className="hidden min-h-[calc(100vh-72px)] border-r border-white/10 p-5 md:block">
          <nav className="sticky top-24 space-y-1">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${isActive ? 'bg-white text-black' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}>
                <Icon className="h-4 w-4" /> {label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 px-5 py-8 pb-28 md:px-10 md:py-12 md:pb-12"><Outlet /></main>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-6 border-t border-white/10 bg-black/90 px-1 py-2 backdrop-blur-xl md:hidden">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-semibold ${isActive ? 'bg-white text-black' : 'text-white/45'}`}>
            <Icon className="h-4 w-4" /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
