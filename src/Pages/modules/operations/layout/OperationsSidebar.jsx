// src/Pages/modules/operations/layout/OperationsSidebar.jsx   (সম্পূর্ণ বদলান)
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, PlusCircle, MapPinned, CheckCircle2, Users, History, Bell, User,
  MessageSquarePlus, Package, Upload, X, LogOut, PanelLeftClose,BarChart3,
} from 'lucide-react';
import Avatar from '../components/Avatar';
import { useOperationsAuth } from '../hooks/useOperationsAuth';
import { useLanguage } from '../hooks/useLanguage';
import { OPERATIONS_ROLES as R, ROLE_HOME } from '../constants/operationsRoles';

const DASH = ['', 'nav.dashboard', 'Dashboard', LayoutDashboard];
const SHIP = ['/shipments', 'nav.shipments', 'Shipments', FileText];
const TRACK = ['/tracking', 'nav.tracking', 'Track Shipment', MapPinned];
const INBOX = ['/notifications', 'nav.inbox', 'Tasks & Notifications', Bell];

const NAV = {
  [R.CLIENT]: [DASH, SHIP, ['/new-export', 'nav.newExport', 'New Export', PlusCircle], ['/new-import', 'nav.newImport', 'New Import', Package], TRACK,
    ['/documents', 'nav.documents', 'Documents Upload', Upload], ['/profile', 'nav.profile', 'My Profile', User], ['/requests', 'nav.requests', 'Requests', MessageSquarePlus], INBOX],
  [R.OPERATIONS_HEAD]: [DASH, ['/approvals', 'nav.approvals', 'Approval Queue', CheckCircle2], SHIP, TRACK,
    ['/performance', 'nav.performance', 'Performance', BarChart3], ['/customers', 'nav.customers', 'Clients', Users], ['/requests', 'nav.requests', 'Requests', MessageSquarePlus], ['/status-log', 'nav.statusLog', 'Status Log', History], INBOX],
  [R.DOMESTIC_ADMIN]: [DASH, SHIP, ['/manifests', 'nav.manifests', 'Manifests', FileText], TRACK, INBOX],
  [R.FOREIGN_ADMIN]: [DASH, SHIP, TRACK, ['/manifests', 'nav.manifests', 'Manifests', FileText], INBOX],
  [R.COURIER]: [DASH, INBOX],
  [R.CNF]: [DASH, SHIP, TRACK, INBOX],
  [R.KAM]: [DASH, ['/requests', 'nav.requests', 'Client Requests', MessageSquarePlus], INBOX],
};

// open = মোবাইল drawer, collapsed = ল্যাপটপে বন্ধ
const OperationsSidebar = ({ open, collapsed, onClose, onCollapse }) => {
  const { currentUser, logout } = useOperationsAuth();
  const { t, tRole } = useLanguage();
  const navigate = useNavigate();
  const base = ROLE_HOME[currentUser?.role] || '/operations';
  const items = NAV[currentUser?.role] || [DASH];
  const signOut = async () => { try { await logout(); } finally { navigate('/operations/login', { replace: true }); } };

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        aria-label="Sidebar"
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white border-r border-slate-200 flex flex-col transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:max-w-none lg:z-auto shrink-0 ${collapsed ? 'lg:hidden' : ''}`}
      >
        <div className="flex items-center justify-between gap-2 px-4 h-16 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/log.jpeg" alt="MILEX" className="h-9 w-auto object-contain" />
            <div className="min-w-0"><p className="text-sm font-black text-slate-800 italic leading-none">MILEX</p><p className="text-[9px] font-bold text-emerald-600 tracking-widest uppercase truncate">{t('common.operationsModule', 'Operations')}</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close menu" className="lg:hidden w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center"><X size={18} /></button>
          <button type="button" onClick={onCollapse} aria-label="Hide sidebar" title="Hide sidebar" className="hidden lg:flex w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 items-center justify-center"><PanelLeftClose size={16} /></button>
        </div>

        {/* ইউজার info শুধু ফোনে — ল্যাপটপে header-এ আছে */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-100 shrink-0">
          <Avatar user={currentUser} size={36} />
          <div className="min-w-0"><p className="text-xs font-bold text-slate-800 truncate">{currentUser?.name}</p><p className="text-[10px] font-bold text-emerald-700 truncate">{tRole(currentUser?.role)}</p></div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1" aria-label="Main">
          {items.map(([path, key, fallback, Icon]) => (
            <NavLink key={`${path}-${key}`} to={`${base}${path}`} end={path === ''} onClick={onClose}
              className={({ isActive }) => `h-10 shrink-0 flex items-center gap-3 px-3 rounded-lg text-sm font-semibold transition ${isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
              <Icon size={17} className="shrink-0" /><span className="truncate">{t(key, fallback)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100 shrink-0">
          <button type="button" onClick={signOut} className="w-full h-10 flex items-center gap-3 px-3 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition"><LogOut size={17} /> {t('common.logout', 'Logout')}</button>
        </div>
      </aside>
    </>
  );
};

export default OperationsSidebar;