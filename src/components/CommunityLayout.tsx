import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { CalendarDays, Home, LogOut, Newspaper, QrCode, UserRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const links = [
  { to: '/community', label: 'Home', icon: Home, end: true },
  { to: '/community/events', label: 'Events', icon: CalendarDays },
  { to: '/community/updates', label: 'Updates', icon: Newspaper },
  { to: '/community/pass', label: 'My QR', icon: QrCode },
  { to: '/community/profile', label: 'Profile', icon: UserRound },
];

export default function CommunityLayout() {
  const { profile, session, signOut } = useAuth();
  const navigate = useNavigate();
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-white/10 bg-black/90 px-1 py-2 backdrop-blur-xl md:hidden">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-semibold ${isActive ? 'bg-white text-black' : 'text-white/45'}`}>
            <Icon className="h-4 w-4" /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
