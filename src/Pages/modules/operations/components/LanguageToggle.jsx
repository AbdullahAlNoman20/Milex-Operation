// src/Pages/modules/operations/components/LanguageToggle.jsx
import { useLanguage } from '../hooks/useLanguage';

const LanguageToggle = () => {
  const { lang, setLang, canToggle, allowed } = useLanguage();
  if (!canToggle) return null;
  const btn = (code, label) => (
    <button
      type="button"
      onClick={() => setLang(code)}
      aria-pressed={lang === code}
      className={`px-3 py-1.5 text-xs font-bold transition-colors duration-200 ${lang === code ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 hover:bg-emerald-50 hover:text-emerald-700'}`}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="Language" className="inline-flex border border-slate-200 rounded-lg overflow-hidden shrink-0">
      {allowed.includes('bn') && btn('bn', 'বাংলা')}
      {allowed.includes('zh') && btn('zh', '中文')}
      {btn('en', 'EN')}
    </div>
  );
};

export default LanguageToggle;