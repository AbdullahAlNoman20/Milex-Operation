// src/Pages/modules/operations/context/LanguageContext.jsx   (সম্পূর্ণ বদলান)
import { useState, useEffect, useCallback, useMemo } from 'react';
import { LanguageContext } from './LanguageContextObject';
import { useOperationsAuth } from '../hooks/useOperationsAuth';
import { OPERATIONS_ROLES } from '../constants/operationsRoles';
import { DICTS } from '../i18n';

const SUPPORTED = ['en', 'zh', 'bn'];
// Which languages each role may use after login. (Before login every language is offered.)
const ALLOWED = { FOREIGN_ADMIN: ['zh', 'en'], CNF: ['bn', 'en'] };
const allowedFor = (role) => (role ? ALLOWED[role] || ['en'] : SUPPORTED);
const PREF_PREFIX = 'milex_ops_v3_lang_';
const warned = new Set();

const readPref = (id) => { try { return window.localStorage.getItem(PREF_PREFIX + id); } catch { return null; } };
const writePref = (id, v) => { try { window.localStorage.setItem(PREF_PREFIX + id, v); } catch { /* noop */ } };

// English for every role; only the Foreign Operations Supervisor (and the login screen) can switch to 中文.
export const LanguageProvider = ({ children }) => {
  const { currentUser } = useOperationsAuth();
  const email = currentUser?.email?.toLowerCase() || '';
  const allowed = allowedFor(currentUser?.role);
  const canToggle = allowed.length > 1;
  const [pref, setPref] = useState(() => readPref('guest') || 'en');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    const ok = allowedFor(currentUser?.role);
    const guest = readPref('guest');
    const pick = [email && readPref(email), guest, currentUser?.language, ok[0]].find((l) => l && ok.includes(l)) || 'en';
    setPref(email ? pick : guest || 'en');
  }, [email, currentUser?.language, currentUser?.role]);

  const lang = allowed.includes(pref) ? pref : allowed[0] || 'en';

  const setLang = useCallback((next) => {
    if (!allowed.includes(next)) return;
    setPref(next);
    writePref(email || 'guest', next);
  }, [allowed, email]);

  useEffect(() => { document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang === 'bn' ? 'bn' : 'en'; }, [lang]);

  const t = useCallback((key, fallback) => {
    const hit = DICTS[lang][key];
    if (hit !== undefined) return hit;
    if (lang !== 'en' && !warned.has(key)) { warned.add(key); console.warn(`[i18n] missing "${lang}" key: ${key}`); }
    return DICTS.en[key] ?? fallback ?? key;
  }, [lang]);

  const tStatus = useCallback((code, fallback) => t(`status.${code}`, fallback || code), [t]);
  const tException = useCallback((code, fallback) => t(`exception.${code}`, fallback || code), [t]);
  const tRole = useCallback((role) => t(`role.${role}`, role), [t]);

  const value = useMemo(() => ({ lang, setLang, canToggle, allowed, t, tStatus, tException, tRole }), [lang, setLang, canToggle, allowed, t, tStatus, tException, tRole]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};