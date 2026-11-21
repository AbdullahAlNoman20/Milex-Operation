// src/Pages/modules/operations/components/print/AwbBack.jsx
import { CARRIAGE_TERMS, CARRIAGE_TERMS_INTRO, CARRIAGE_TERMS_VERSION } from '../../constants/carriageTerms';

const AwbBack = ({ version = CARRIAGE_TERMS_VERSION }) => (
  <div className="text-[9px] leading-snug">
    <div className="flex justify-between items-baseline border-b-2 border-slate-800 pb-1 mb-2">
      <p className="text-sm font-black">MILEX AIR TERMS AND CONDITIONS OF CARRIAGE</p><p className="text-slate-500">Terms {version}</p>
    </div>
    <p className="mb-2 text-slate-700"><b>IMPORTANT NOTICE.</b> {CARRIAGE_TERMS_INTRO}</p>
    <div className="columns-2 gap-5">
      {CARRIAGE_TERMS.map((c) => (
        <div key={c.no} className="mb-2 break-inside-avoid"><p className="font-bold">{c.no}. {c.title}</p><p className="text-slate-700">{c.text}</p></div>
      ))}
    </div>
  </div>
);

export default AwbBack;