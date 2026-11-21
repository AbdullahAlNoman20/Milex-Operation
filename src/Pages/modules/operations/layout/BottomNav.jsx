import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Bell, User, MapPinned, MessageSquarePlus } from 'lucide-react';
import { useOperationsAuth } from '../hooks/useOperationsAuth';
import { usePendingTasks } from '../hooks/usePendingTasks';
import { OPERATIONS_ROLES as R, ROLE_HOME } from '../constants/operationsRoles';

const ITEMS = {
  [R.COURIER]: [['', 'Home', LayoutDashboard], ['/notifications', 'Tasks', Bell], ['/profile', 'Profile', User]],
  [R.FOREIGN_ADMIN]: [['', 'Home', LayoutDashboard], ['/shipments', 'Shipments', FileText], ['/notifications', 'Tasks', Bell], ['/profile', 'Profile', User]],
  [R.KAM]: [['', 'Home', LayoutDashboard], ['/requests', 'Requests', MessageSquarePlus], ['/notifications', 'Tasks', Bell], ['/profile', 'Profile', User]],
  [R.CNF]: [['', 'Home', LayoutDashboard], ['/shipments', 'Shipments', FileText], ['/tracking', 'Track', MapPinned], ['/notifications', 'Tasks', Bell], ['/profile', 'Profile', User]],
};

export const hasBottomNav = (role) => !!ITEMS[role];

const BottomNav = () => {
  const { currentUser } = useOperationsAuth();
  const { totalCount } = usePendingTasks();
  const items = ITEMS[currentUser?.role];
  if (!items) return null;
  const base = ROLE_HOME[currentUser.role];
  return (
    <nav aria-label="Bottom navigation" className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 flex pb-[env(safe-area-inset-bottom)]">
      {items.map(([path, label, Icon]) => (
        <NavLink key={label} to={`${base}${path}`} end={path === ''}
          className={({ isActive }) => `relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-bold transition ${isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
          <span className="relative">
            <Icon size={20} />
            {label === 'Tasks' && totalCount > 0 && <span className="absolute -top-1.5 -right-2.5 min-w-[15px] h-[15px] px-1 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center">{totalCount}</span>}
          </span>
          {label}
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;