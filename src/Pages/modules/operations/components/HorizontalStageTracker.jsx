// src/Pages/modules/operations/components/HorizontalStageTracker.jsx
import { Check } from 'lucide-react';
import { getStageGroups } from '../constants/shipmentStatus';
import { useLanguage } from '../hooks/useLanguage';

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const HorizontalStageTracker = ({ sequence, currentIndex, mode, path = null, updatedAt }) => {
  const { t } = useLanguage();
  const groups = getStageGroups(mode, path);
  const indexOf = (code) => sequence.findIndex((s) => s.code === code);
  const stages = groups.map((g) => ({ title: g.title, idx: indexOf(g.codes[g.codes.length - 1]) })).filter((s) => s.idx !== -1);
  const activeIdx = stages.findIndex((s) => currentIndex <= s.idx);
  const pos = activeIdx === -1 ? stages.length - 1 : activeIdx;
  const allDone = currentIndex >= (stages[stages.length - 1]?.idx ?? 0);
  const progressPct = stages.length > 1 ? ((allDone ? stages.length - 1 : pos) / (stages.length - 1)) * 100 : 0;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative min-w-[560px] px-2 pt-2">
        <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-200" style={{ marginLeft: '4%', marginRight: '4%' }} />
        <div className="absolute left-0 top-4 h-0.5 bg-blue-600 transition-all duration-500" style={{ marginLeft: '4%', width: `calc(${progressPct}% * 0.92)` }} />
        <div className="relative flex justify-between">
          {stages.map((stage, i) => {
            const isDone = allDone || i < pos;
            const isCurrent = !allDone && i === pos;
            return (
              <div key={stage.title} className="flex flex-col items-center gap-2 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${isDone ? 'bg-blue-600 text-white' : isCurrent ? 'bg-white text-blue-600 border-2 border-blue-600 ring-4 ring-blue-100' : 'bg-white text-slate-300 border-2 border-slate-200'}`}>
                  {isDone ? <Check size={14} /> : <span className={`w-2 h-2 rounded-full ${isCurrent ? 'bg-blue-600' : 'bg-slate-200'}`} />}
                </div>
                <div className="text-center px-1">
                  <p className={`text-[11px] font-bold ${isDone || isCurrent ? 'text-slate-800' : 'text-slate-400'}`}>{t(`group.${stage.title}`, stage.title)}</p>
                  {isCurrent && updatedAt && <p className="text-[9px] text-slate-400 mt-0.5">{formatDate(updatedAt)}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HorizontalStageTracker;