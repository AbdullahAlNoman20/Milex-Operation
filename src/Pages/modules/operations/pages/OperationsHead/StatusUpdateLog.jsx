// src/Pages/modules/operations/pages/OperationsHead/StatusUpdateLog.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import SectionCard from "../../components/SectionCard";
import Chip from "../../components/Chip";
import Loader from "../../../../../Components/Shared/Loader";
import { useDataVersion } from "../../hooks/useDataVersion";
import { fetchStatusLogs } from "../../services/statusLogService";
import { getExceptionLabel } from "../../constants/shipmentStatus";

const PAGE = 20;

const StatusUpdateLog = () => {
  const version = useDataVersion();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [filter, setFilter] = useState("");
  const [source, setSource] = useState("ALL");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      setLogs(await fetchStatusLogs());
    } catch {
      setLoadError("Failed to load status logs.");
    } finally {
      setIsLoading(false);
    }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    load();
  }, [load, version]);

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return logs.filter(
      (l) =>
        (source === "ALL" || l.source === source) &&
        (!q ||
          [l.shipmentId, l.status, l.updatedBy, l.note].some((v) =>
            String(v || "")
              .toLowerCase()
              .includes(q),
          )),
    );
  }, [logs, filter, source]);

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-800">Status Update Log</h1>
        <p className="text-sm text-slate-500">
          Full audit trail — who changed what, when, and from which source.
        </p>
      </div>
      <SectionCard
        title={`Audit Trail (${rows.length})`}
        actions={
          <div className="flex flex-wrap gap-2">
            <input
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by ID / status / user"
              maxLength={40}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-slate-50 focus:border-emerald-500 outline-none"
            />
            <select
              value={source}
              onChange={(e) => { setSource(e.target.value); setPage(1); }}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-slate-50 outline-none"
            >
              <option value="ALL">All sources</option>
              <option value="MILEX">MILEX</option>
              <option value="API">Principal API</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>
        }
      >
        {isLoading ? (
          <Loader label="Loading logs..." />
        ) : loadError ? (
          <p className="text-sm text-red-600 font-semibold">{loadError}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-400">No entries found.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-black text-emerald-800 uppercase tracking-wide bg-emerald-50">
                    <th className="py-3 px-3 rounded-l-lg">Shipment</th>
                    <th className="py-3 px-3">Event</th>
                    <th className="py-3 px-3">Exception</th>
                    <th className="py-3 px-3">By</th>
                    <th className="py-3 px-3">Source</th>
                    <th className="py-3 px-3 rounded-r-lg">When</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice((page - 1) * PAGE, page * PAGE).map((l, i) => (
                    <tr
                      key={l.id}
                      className={`border-b border-slate-100 last:border-b-0 align-top transition-colors hover:bg-emerald-50/50 ${i % 2 ? "bg-slate-50/60" : ""}`}
                    >
                      <td className="py-3 px-3">
                        <Link
                          to={`/operations/head/shipments/${encodeURIComponent(l.shipmentId)}`}
                          className="font-bold text-emerald-600 hover:underline"
                        >
                          {l.shipmentId}
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        {l.status}
                        {l.note && (
                          <p className="text-[11px] text-slate-400">{l.note}</p>
                        )}
                        {l.oldValue && l.newValue && (
                          <p className="text-[10px] text-slate-400">
                            {String(l.oldValue)} ✈ {String(l.newValue)}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {l.exceptionCode ? (
                          <Chip tone="red">
                            {getExceptionLabel(l.exceptionCode)}
                          </Chip>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {l.updatedBy}
                        <p className="text-[10px] text-slate-400">{l.role}</p>
                      </td>
                      <td className="py-3 px-3">
                        <Chip
                          tone={
                            l.source === "API"
                              ? "purple"
                              : l.source === "MANUAL"
                                ? "amber"
                                : "slate"
                          }
                        >
                          {l.source}
                        </Chip>
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-xs whitespace-nowrap">
                        {new Date(l.updatedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > PAGE && (() => {
              const pages = Math.ceil(rows.length / PAGE);
              const nums = [...new Set([1, page - 1, page, page + 1, pages].filter((n) => n >= 1 && n <= pages))].sort((x, y) => x - y);
              return (
                <nav className="flex flex-wrap items-center justify-between gap-3 mt-4" aria-label="Pagination">
                  <p className="text-xs text-slate-500">Showing {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, rows.length)} of {rows.length}</p>
                  <div className="flex items-center gap-1">
                    <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 hover:bg-emerald-50 disabled:opacity-40">‹ Prev</button>
                    {nums.map((n, i) => (
                      <span key={n} className="flex items-center gap-1">
                        {i > 0 && n - nums[i - 1] > 1 && <span className="text-slate-400">…</span>}
                        <button type="button" onClick={() => setPage(n)} className={`min-w-[2rem] px-2 py-1.5 text-xs font-bold rounded-lg border ${n === page ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-300 hover:bg-emerald-50"}`}>{n}</button>
                      </span>
                    ))}
                    <button type="button" disabled={page === pages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 hover:bg-emerald-50 disabled:opacity-40">Next ›</button>
                  </div>
                </nav>
              );
            })()}
          </>
        )}
      </SectionCard>
    </div>
  );
};

export default StatusUpdateLog;
