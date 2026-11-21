// src/Pages/modules/operations/components/OperationsProfileModal.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, LogOut, User } from 'lucide-react';
import Avatar from './Avatar';
import { useOperationsAuth } from '../hooks/useOperationsAuth';
import { useLanguage } from '../hooks/useLanguage';
import { useToast } from '../../../../Components/hooks/useToast';
import { ROLE_HOME } from '../constants/operationsRoles';

const inp = 'w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60';

const OperationsProfileModal = ({ onClose }) => {
  const { currentUser, changePassword, logout } = useOperationsAuth();
  const { t, tRole } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!pw.current || !pw.next) return showToast(t('profile.fillAll'), 'warning');
    if (pw.next.length < 6) return showToast(t('profile.min6'), 'warning');
    if (pw.next !== pw.confirm) return showToast(t('profile.noMatch'), 'warning');
    setIsSaving(true);
    try { await changePassword(pw.current, pw.next); showToast(t('profile.updated')); setPw({ current: '', next: '', confirm: '' }); }
    catch (err) { showToast(err?.message || t('msg.failed'), 'error'); } finally { setIsSaving(false); }
  };
  const signOut = async () => { try { await logout(); } finally { navigate('/operations/login', { replace: true }); } };
  const openProfile = () => { onClose(); navigate(`${ROLE_HOME[currentUser.role]}/profile`); };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] relative" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-4 right-4 w-8 h-8 rounded-full text-slate-400 hover:bg-slate-100 flex items-center justify-center"><X size={18} /></button>
        <div className="flex items-center gap-4 mb-5 pr-8">
          <Avatar user={currentUser} size={64} className="text-xl" />
          <div className="min-w-0"><p className="text-sm font-black text-slate-800 truncate">{currentUser?.name}</p><p className="text-xs text-slate-400 truncate">{currentUser?.email}</p><p className="text-[10px] font-bold text-emerald-700 mt-0.5">{tRole(currentUser?.role)}</p></div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button type="button" onClick={openProfile} className="flex items-center justify-center gap-2 text-xs font-bold border border-slate-300 text-slate-700 rounded-lg py-2.5 hover:bg-slate-50"><User size={15} /> My Profile</button>
          <button type="button" onClick={signOut} className="flex items-center justify-center gap-2 text-xs font-bold bg-red-50 text-red-600 border border-red-200 rounded-lg py-2.5 hover:bg-red-100"><LogOut size={15} /> {t('common.logout', 'Logout')}</button>
        </div>
        <form onSubmit={submit} className="space-y-3" autoComplete="off">
          <p className="text-[10px] font-bold text-slate-400 uppercase">{t('profile.changePassword')}</p>
          <input type="password" autoComplete="current-password" placeholder={t('profile.current')} value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} disabled={isSaving} maxLength={200} className={inp} />
          <input type="password" autoComplete="new-password" placeholder={t('profile.new')} value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} disabled={isSaving} maxLength={200} className={inp} />
          <input type="password" autoComplete="new-password" placeholder={t('profile.confirm')} value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} disabled={isSaving} maxLength={200} className={inp} />
          <button type="submit" disabled={isSaving} className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">{isSaving ? t('profile.saving') : t('profile.update')}</button>
        </form>
      </div>
    </div>
  );
};

export default OperationsProfileModal;