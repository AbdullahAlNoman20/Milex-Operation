import { useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import SectionCard from '../../components/SectionCard';
import Avatar from '../../components/Avatar';
import Field, { inp } from '../../components/Field';
import { Kv, KvGrid } from '../../components/customer/ProfileBits';
import LanguageToggle from '../../components/LanguageToggle';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useToast } from '../../../../../Components/hooks/useToast';
import { saveAvatarFile, removeAvatar, getAvatar } from '../../utils/avatar';

const ProfilePage = () => {
  const { currentUser, changePassword } = useOperationsAuth();
  const { tRole } = useLanguage();
  const { showToast } = useToast();
  const [hasPic, setHasPic] = useState(!!getAvatar(currentUser.email));
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);

  const pick = async (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { await saveAvatarFile(currentUser.email, f); setHasPic(true); showToast('Profile picture updated'); } catch (err) { showToast(err.message, 'warning'); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!pw.current || !pw.next) return showToast('Fill in all password fields', 'warning');
    if (pw.next.length < 6) return showToast('New password must be at least 6 characters', 'warning');
    if (pw.next !== pw.confirm) return showToast('New passwords do not match', 'warning');
    setBusy(true);
    try { await changePassword(pw.current, pw.next); showToast('Password updated'); setPw({ current: '', next: '', confirm: '' }); }
    catch (err) { showToast(err?.message || 'Failed', 'error'); } finally { setBusy(false); }
  };

  return (
    <div className="w-full space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-wrap items-center gap-5">
        <div className="relative">
          <Avatar key={String(hasPic)} user={currentUser} size={88} className="text-3xl" />
          <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center cursor-pointer hover:bg-emerald-700 shadow" title="Change picture"><Camera size={15} /><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} /></label>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-black text-slate-800 truncate">{currentUser.name}</h1>
          <p className="text-sm text-slate-500 truncate">{currentUser.email}</p>
          <p className="text-xs font-bold text-emerald-700 mt-1">{tRole(currentUser.role)}</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          {hasPic && <button type="button" onClick={() => { removeAvatar(currentUser.email); setHasPic(false); }} className="flex items-center gap-1.5 text-xs font-bold text-red-600 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-50"><Trash2 size={14} /> Remove</button>}
        </div>
      </div>

      <SectionCard title="Account">
        <KvGrid><Kv k="Name" v={currentUser.name} /><Kv k="Email" v={currentUser.email} /><Kv k="Role" v={tRole(currentUser.role)} />{currentUser.originCountry && <Kv k="Origin country" v={currentUser.originCountry} />}</KvGrid>
      </SectionCard>

      <SectionCard title="Change Password">
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-3 gap-3" autoComplete="off">
          <Field label="Current password" required><input type="password" autoComplete="current-password" disabled={busy} value={pw.current} maxLength={200} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} className={inp} /></Field>
          <Field label="New password" required><input type="password" autoComplete="new-password" disabled={busy} value={pw.next} maxLength={200} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} className={inp} /></Field>
          <Field label="Confirm new password" required><input type="password" autoComplete="new-password" disabled={busy} value={pw.confirm} maxLength={200} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))} className={inp} /></Field>
          <div className="sm:col-span-3"><button type="submit" disabled={busy} className="text-sm font-bold bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50">{busy ? 'Saving...' : 'Update Password'}</button></div>
        </form>
      </SectionCard>
    </div>
  );
};

export default ProfilePage;