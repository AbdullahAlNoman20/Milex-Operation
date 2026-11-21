// src/Pages/modules/operations/components/LanguageNotice.jsx
// Foreign Supervisor: the system is shown in Chinese, but every input must be typed in English.
import { useState } from 'react';
import { Languages, X } from 'lucide-react';
import { useOperationsAuth } from '../hooks/useOperationsAuth';
import { useLanguage } from '../hooks/useLanguage';
import { OPERATIONS_ROLES as R } from '../constants/operationsRoles';

const KEY = 'milex_ops_v3_lang_notice_seen';
const LanguageNotice = () => {
  const { currentUser } = useOperationsAuth();
  const { lang } = useLanguage();
  const [seen, setSeen] = useState(() => { try { return window.sessionStorage.getItem(KEY) === '1'; } catch { return false; } });
  if (currentUser?.role !== R.FOREIGN_ADMIN || lang !== 'zh' || seen) return null;
  const close = () => { setSeen(true); try { window.sessionStorage.setItem(KEY, '1'); } catch { /* noop */ } };
  return (
    <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border-2 border-emerald-400 bg-emerald-50 p-4 animate-[hintIn_.4s_ease-out]">
      <Languages size={22} className="shrink-0 text-emerald-600 mt-0.5" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-black text-emerald-800" translate="no">您现在看到的是中文界面，但所有输入内容必须使用英文填写。</p>
        <p className="text-xs text-emerald-700 mt-1" translate="no">You see the system in Chinese, but you must type every input in ENGLISH. Data from outside stays in English.</p>
      </div>
      <button type="button" onClick={close} aria-label="OK" className="shrink-0 w-8 h-8 rounded-lg text-emerald-700 hover:bg-emerald-100 transition flex items-center justify-center"><X size={16} /></button>
    </div>
  );
};

export default LanguageNotice;
