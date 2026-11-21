import { MapPin, Hourglass } from 'lucide-react';
import { getStatusNote } from '../utils/statusNote';

// dark=true হলে সবুজ হিরো কার্ডের ভেতরে (সাদা লেখা)
const StatusNote = ({ shipment, step, lastEvent, dark = false }) => {
  const n = getStatusNote(shipment, step, lastEvent);
  const box = dark ? 'bg-white/15 text-white' : 'bg-emerald-50 border border-emerald-100 text-slate-700';
  const sub = dark ? 'text-white/80' : 'text-slate-500';
  return (
    <div className={`mt-3 rounded-xl p-3 text-xs space-y-1.5 ${box}`}>
      <p className="flex items-start gap-2 font-bold"><MapPin size={14} className="shrink-0 mt-0.5" /><span>Now: {n.where}{n.fromApi && <span className="ml-2 text-[9px] font-black bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">via Principal API</span>}</span></p>
      <p className={`flex items-start gap-2 ${sub}`}><Hourglass size={14} className="shrink-0 mt-0.5" /><span>{n.next}</span></p>
    </div>
  );
};

export default StatusNote;