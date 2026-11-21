// src/Pages/modules/operations/layout/OperationsLayout.jsx   (সম্পূর্ণ বদলান)
import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import OperationsSidebar from './OperationsSidebar';
import BottomNav, { hasBottomNav } from './BottomNav';
import NotificationBell from '../components/NotificationBell';
import LanguageToggle from '../components/LanguageToggle';
import PageHint from '../components/PageHelp';
import LanguageNotice from '../components/LanguageNotice';
import OperationsProfileModal from '../components/OperationsProfileModal';
import Avatar from '../components/Avatar';
import Toast from '../../../../Components/Shared/Toast';
import { useOperationsAuth } from '../hooks/useOperationsAuth';
import { useLanguage } from '../hooks/useLanguage';
import { useTrackingSync } from '../hooks/useTrackingSync';

const PREF = 'milex_ops_v3_sidebar_collapsed';
const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;
const readCollapsed = () => { try { return window.localStorage.getItem(PREF) === '1'; } catch { return false; } };

const OperationsLayout = ({ children }) => {
  const { currentUser } = useOperationsAuth();
  const { tRole } = useLanguage();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [profile, setProfile] = useState(false);
  useTrackingSync();

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open]);

  const setCollapsedPref = (v) => { setCollapsed(v); try { window.localStorage.setItem(PREF, v ? '1' : '0'); } catch { /* noop */ } };
  const openMenu = () => { if (isDesktop()) setCollapsedPref(false); else setOpen(true); };

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <Toast />
      <OperationsSidebar open={open} collapsed={collapsed} onClose={() => setOpen(false)} onCollapse={() => setCollapsedPref(true)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur border-b border-slate-200 px-3 sm:px-5 flex items-center justify-between gap-3">
                    <button type="button" onClick={openMenu} aria-label="Open menu" className={`w-10 h-10 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center justify-center ${collapsed ? '' : 'lg:hidden'} `}><Menu size={22} /></button>
          <div className="hidden md:block flex-1 min-w-0 max-w-3xl"><PageHint /></div>
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <LanguageToggle />
            <NotificationBell />
            <button type="button" onClick={() => setProfile(true)} className="flex items-center gap-2 rounded-full hover:bg-slate-50 pr-1 sm:pr-3 transition" aria-label="My profile">
              <Avatar user={currentUser} size={36} />
              <span className="hidden sm:block text-left min-w-0"><span className="block text-xs font-bold text-slate-800 truncate max-w-[160px]">{currentUser?.name}</span><span className="block text-[10px] font-bold text-emerald-700">{tRole(currentUser?.role)}</span></span>
            </button>
          </div>
        </header>
        <main className={`flex-1 min-w-0 overflow-x-hidden p-3 sm:p-5 lg:p-8 ${hasBottomNav(currentUser?.role) ? 'pb-24 lg:pb-8' : ''}`}><div className="md:hidden mb-3"><PageHint compact /></div><LanguageNotice /><div key={pathname} className="anim-fade-up">{children ?? <Outlet />}</div></main>
      </div>
      <BottomNav />
      {profile && <OperationsProfileModal onClose={() => setProfile(false)} />}
    </div>
  );
};

export default OperationsLayout;