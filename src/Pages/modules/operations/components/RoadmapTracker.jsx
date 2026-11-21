// src/Pages/modules/operations/components/RoadmapTracker.jsx
// Roadmap / tracking with the MILEX logo on every step. Export = green theme, Import = blue theme so they are easy to tell apart.
import { Check } from "lucide-react";
import { getStageGroups } from "../constants/shipmentStatus";
import { SYSTEM_ACTOR } from "../constants/operationsRoles";
import { useLanguage } from "../hooks/useLanguage";

const THEME = {
  EXPORT: { name: "Export", head: "bg-emerald-50 border-emerald-200", chip: "bg-emerald-600 text-white", done: "bg-emerald-500", ring: "ring-emerald-200 border-emerald-500", line: "bg-emerald-500", text: "text-emerald-700", soft: "bg-emerald-50", bar: "bg-emerald-500" },
  IMPORT: { name: "Import", head: "bg-sky-50 border-sky-200", chip: "bg-sky-600 text-white", done: "bg-sky-500", ring: "ring-sky-200 border-sky-500", line: "bg-sky-500", text: "text-sky-700", soft: "bg-sky-50", bar: "bg-sky-500" },
};

const when = (iso) => {
  const d = new Date(iso);
  return iso && !Number.isNaN(d.getTime()) ? d.toLocaleString() : "";
};

const RoadmapTracker = ({ shipment: s, sequence, currentIndex = -1, times = {}, sources = {}, compact = false }) => {
  const { t, tStatus, tRole } = useLanguage();
  const th = THEME[s.mode] || THEME.EXPORT;
  const groups = getStageGroups(s.mode, s.handlingPath);
  const indexOf = (code) => sequence.findIndex((x) => x.code === code);
  const closed = s.statusCode === "CLOSED";
  // API runs: a contiguous block of steps updated automatically from the tracking number. We mark where it starts and ends.
  const isApi = (x) => x && x.owner === SYSTEM_ACTOR;
  const apiStart = (code) => { const i = indexOf(code); return isApi(sequence[i]) && !isApi(sequence[i - 1]); };
  const apiEnd = (code) => { const i = indexOf(code); return isApi(sequence[i]) && !isApi(sequence[i + 1]); };
  const pct = sequence.length ? Math.max(0, Math.min(100, Math.round(((currentIndex + 1) / sequence.length) * 100))) : 0;

  return (
    <div>
      {!compact && <div className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 mb-6 ${th.head}`}>
        <div className="flex items-center gap-3 min-w-0">
          <img src="/log.jpeg" alt="MILEX" className="h-12 w-auto object-contain rounded bg-white p-1 border border-slate-100" />
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-800 truncate">{s.shipmentId} <span className={`ml-1 align-middle text-[10px] font-black px-2 py-0.5 rounded-full ${th.chip}`}>{s.mode}</span></p>
            <p className="text-xs text-slate-500 truncate">{s.route?.originCity || s.route?.originCountry || "—"} ✈ {s.route?.destCity || s.route?.destCountry || "—"}</p>
          </div>
        </div>
        <div className="w-full sm:w-64">
          <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1"><span>{tStatus(s.statusCode, s.statusLabel)}</span><span>{pct}%</span></div>
          <div className="h-2 rounded-full bg-white overflow-hidden border border-slate-200"><div className={`h-full ${th.bar} transition-all duration-700`} style={{ width: `${pct}%` }} /></div>
        </div>
      </div>}

      <div className="space-y-6">
        {groups.map((g) => {
          const steps = g.codes.map((c) => sequence[indexOf(c)]).filter(Boolean);
          if (steps.length === 0) return null;
          const doneCount = steps.filter((x) => indexOf(x.code) <= currentIndex).length;
          return (
            <div key={g.title}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[11px] font-black uppercase tracking-wide ${th.text}`}>{t(`group.${g.title}`, g.title)}</span>
                <span className="text-[10px] font-bold text-slate-400">{doneCount}/{steps.length}</span>
                <span className="flex-1 border-t border-dashed border-slate-200" />
              </div>
              <ol>
                {steps.map((step, i) => {
                  const idx = indexOf(step.code);
                  const done = idx <= currentIndex;
                  const current = idx === currentIndex && !closed;
                  const last = i === steps.length - 1;
                  return (
                    <li key={step.code} className="relative pl-14 pb-6 last:pb-0 anim-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                      {!last && <span aria-hidden="true" className={`absolute left-[19px] top-10 bottom-0 ${done && idx < currentIndex ? `w-0.5 ${th.line}` : "border-l-2 border-dashed border-slate-300"}`} />}
                      <span className={`absolute left-0 top-0 w-10 h-10 rounded-full flex items-center justify-center bg-white border-2 ${current ? `ring-4 ${th.ring} animate-pulse` : done ? `border-transparent ${th.done}` : "border-slate-200"}`}>
                        <img src="/log.jpeg" alt="" className={`w-7 h-7 object-contain rounded-full bg-white ${done || current ? "" : "opacity-30 grayscale"}`} />
                        {done && !current && <span className={`absolute inset-0 rounded-full ${th.chip} bg-opacity-80 flex items-center justify-center`}><Check size={20} strokeWidth={3} /></span>}
                      </span>
                      <p className={`text-sm font-bold leading-tight pt-1 ${done ? "text-slate-800" : "text-slate-400"}`}>
                        {tStatus(step.code, step.label)}
                        {isApi(step) && <span className="ml-2 align-middle text-[9px] font-black bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">API</span>}
                      </p>
                      <p className={`text-[11px] mt-0.5 ${current ? `font-bold ${th.text}` : "text-slate-400"}`}>
                        {current ? "Now" : done ? `Done${times[step.code] ? ` · ${when(times[step.code])}` : ""}` : "Next"}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoadmapTracker;
