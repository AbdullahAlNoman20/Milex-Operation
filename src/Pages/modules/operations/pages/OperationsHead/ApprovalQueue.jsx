// src/Pages/modules/operations/pages/OperationsHead/ApprovalQueue.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import SectionCard from "../../components/SectionCard";
import Chip, { toneForStatus } from "../../components/Chip";
import Loader from "../../../../../Components/Shared/Loader";
import { useOperationsAuth } from "../../hooks/useOperationsAuth";
import { useDataVersion } from "../../hooks/useDataVersion";
import { useToast } from "../../../../../Components/hooks/useToast";
import {
  fetchApprovals,
  decideApproval,
  APPROVAL_DECISIONS,
  APPROVAL_STATUS,
} from "../../services/approvalService";
import { fetchShipmentById } from "../../services/shipmentService";
import { fetchUsersByRole } from "../../services/userDirectoryService";
import { DOC_TYPE_LABELS } from "../../constants/shipmentFields";
import { OPERATIONS_ROLES as R } from "../../constants/operationsRoles";

const inp =
  "w-full border border-slate-300 rounded-lg p-2 text-sm bg-white focus:border-emerald-500 outline-none disabled:opacity-60";

const ApprovalQueue = () => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const version = useDataVersion();
  const [tab, setTab] = useState("PENDING");
  const [approvals, setApprovals] = useState([]);
  const [shipments, setShipments] = useState({});
  const [foreign, setForeign] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [draft, setDraft] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const all = await fetchApprovals();
      setApprovals(all);
      const ids = [
        ...new Set(
          all
            .filter((a) => a.status === APPROVAL_STATUS.PENDING || true)
            .map((a) => a.shipmentId),
        ),
      ].slice(0, 80);
      const map = {};
      await Promise.all(
        ids.map(async (id) => {
          map[id] = await fetchShipmentById(id);
        }),
      );
      setShipments(map);
      setForeign(await fetchUsersByRole(R.FOREIGN_ADMIN));
    } finally {
      setIsLoading(false);
    }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    load();
  }, [load, version]);

  const pending = useMemo(
    () =>
      approvals
        .filter((a) => a.status === APPROVAL_STATUS.PENDING)
        .sort((a, b) => (a.requestedAt > b.requestedAt ? 1 : -1)),
    [approvals],
  );
  const history = useMemo(
    () =>
      approvals
        .filter((a) => a.status !== APPROVAL_STATUS.PENDING)
        .sort((a, b) =>
          (a.decision?.at || a.requestedAt) < (b.decision?.at || b.requestedAt)
            ? 1
            : -1,
        )
        .slice(0, 40),
    [approvals],
  );
  const set = (id, k, v) =>
    setDraft((p) => ({ ...p, [id]: { ...(p[id] || {}), [k]: v } }));

  const decide = async (a, decision) => {
    const d = draft[a.id] || {};
    setBusyId(a.id);
    try {
      await decideApproval(
        a.id,
        decision,
        { comment: d.comment || "", foreignEmail: d.foreignEmail || "" },
        currentUser,
      );
      showToast(
        decision === APPROVAL_DECISIONS.APPROVE
          ? "Approved"
          : `Marked ${decision.replace("_", " ").toLowerCase()}`,
      );
      setOpenId(null);
      await load();
    } catch (e) {
      showToast(e?.message || "Decision failed", "error");
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) return <Loader label="Loading approvals..." />;
  const list = tab === "PENDING" ? pending : history;

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-xl font-black text-slate-800">Approval Queue</h1>
        <p className="text-sm text-slate-500">
          Booking, document-pack and release approvals. Approve, reject, ask for
          information or return.
        </p>
      </div>
      <div className="flex gap-1 border-b border-slate-200">
        {[
          ["PENDING", `Pending (${pending.length})`],
          ["HISTORY", "Decided"],
        ].map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition ${tab === k ? "border-emerald-600 text-emerald-700" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <SectionCard
        title={
          tab === "PENDING" ? "Waiting for Your Decision" : "Recent Decisions"
        }
      >
        {list.length === 0 ? (
          <p className="text-sm text-slate-400">
            {tab === "PENDING"
              ? "No approvals are waiting."
              : "No decisions yet."}
          </p>
        ) : (
          <div className="space-y-2">
            {list.map((a) => {
              const s = shipments[a.shipmentId];
              const open = openId === a.id;
              const d = draft[a.id] || {};
              const own =
                a.requestedBy.email?.toLowerCase() ===
                currentUser.email.toLowerCase();
              const needsForeign = a.gate === "GATE_1" && a.mode === "IMPORT";
              const foreignSorted = [...foreign].sort(
                (x, y) =>
                  Number(
                    y.originCountry?.toLowerCase() ===
                      s?.route?.originCountry?.toLowerCase(),
                  ) -
                  Number(
                    x.originCountry?.toLowerCase() ===
                      s?.route?.originCountry?.toLowerCase(),
                  ),
              );
              return (
                <div
                  key={a.id}
                  className="border border-slate-100 rounded-lg overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : a.id)}
                    className="w-full flex flex-wrap items-center justify-between gap-2 p-3 text-left hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {open ? (
                        <ChevronUp
                          size={15}
                          className="text-slate-400 shrink-0"
                        />
                      ) : (
                        <ChevronDown
                          size={15}
                          className="text-slate-400 shrink-0"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-700 truncate">
                          {a.shipmentId} — {a.gateLabel}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {s?.clientName} · requested by {a.requestedBy.name} ·{" "}
                          {new Date(a.requestedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Chip tone={toneForStatus(a.status)}>
                      {a.status.replace("_", " ")}
                    </Chip>
                  </button>
                  {open && (
                    <div className="bg-slate-50 border-t border-slate-100 p-4 space-y-4">
                      {s && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                              Route
                            </p>
                            <p>
                              {s.route?.originCity}, {s.route?.originCountry} ✈{" "}
                              {s.route?.destCity}, {s.route?.destCountry}
                            </p>
                            <p className="text-slate-500">
                              {s.route?.principal || "No principal"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                              Parcel
                            </p>
                            <p>{s.parcel?.shipmentContents}</p>
                            <p className="text-slate-500">
                              {s.parcel?.pieces} pcs · {s.parcel?.weightKg} kg
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                              Client confirmation
                            </p>
                            <p>{a.clientConfirmation || "—"}</p>
                            {a.note && (
                              <p className="text-slate-500">Note: {a.note}</p>
                            )}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Checklist at request time
                        </p>
                        <ul className="space-y-1">
                          {a.checklist.map((i) => (
                            <li
                              key={i.label}
                              className={`text-xs flex gap-2 ${i.ok ? "text-emerald-700" : i.required ? "text-red-600" : "text-slate-400"}`}
                            >
                              <span>{i.ok ? "✓" : i.required ? "✗" : "○"}</span>
                              <span>
                                {i.label}
                                {i.detail ? ` — ${i.detail}` : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {Object.keys(a.docVersions || {}).length > 0 && (
                        <p className="text-xs text-slate-500">
                          <span className="font-bold">
                            Document versions reviewed:
                          </span>{" "}
                          {Object.entries(a.docVersions)
                            .map(([t, v]) => `${DOC_TYPE_LABELS[t] || t} v${v}`)
                            .join(" · ")}
                        </p>
                      )}
                      {a.exceptions?.length > 0 && (
                        <p className="text-xs text-red-600 font-semibold">
                          Open exceptions: {a.exceptions.join(", ")}
                        </p>
                      )}
                      <Link
                        to={`/operations/head/shipments/${encodeURIComponent(a.shipmentId)}`}
                        className="inline-block text-xs font-bold text-emerald-600 hover:underline"
                      >
                        Open full shipment ✈
                      </Link>

                      {a.status === APPROVAL_STATUS.PENDING ? (
                        <div className="space-y-3 border-t border-slate-200 pt-4">
                          {own && (
                            <p className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-2 font-semibold">
                              You raised this request yourself — another
                              approver must decide it.
                            </p>
                          )}
                          {needsForeign && (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">
                                Assign Foreign Operations Supervisor (required
                                to approve)
                              </label>
                              <select
                                disabled={busyId === a.id}
                                value={d.foreignEmail || ""}
                                onChange={(e) =>
                                  set(a.id, "foreignEmail", e.target.value)
                                }
                                className={inp}
                              >
                                <option value="">Select...</option>
                                {foreignSorted.map((u) => (
                                  <option key={u.email} value={u.email}>
                                    {u.name}
                                    {u.originCountry
                                      ? ` — ${u.originCountry}`
                                      : ""}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">
                              Comment (required unless you approve)
                            </label>
                            <textarea
                              rows={2}
                              disabled={busyId === a.id}
                              maxLength={500}
                              value={d.comment || ""}
                              onChange={(e) =>
                                set(a.id, "comment", e.target.value)
                              }
                              className={inp}
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busyId === a.id || own}
                              onClick={() =>
                                decide(a, APPROVAL_DECISIONS.APPROVE)
                              }
                              className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition disabled:opacity-40"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={busyId === a.id || own}
                              onClick={() =>
                                decide(a, APPROVAL_DECISIONS.NEED_INFO)
                              }
                              className="text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-lg hover:bg-amber-100 transition disabled:opacity-40"
                            >
                              Need Information
                            </button>
                            <button
                              type="button"
                              disabled={busyId === a.id || own}
                              onClick={() =>
                                decide(a, APPROVAL_DECISIONS.RETURN)
                              }
                              className="text-xs font-bold bg-white text-slate-700 border border-slate-300 px-4 py-2 rounded-lg hover:bg-slate-50 transition disabled:opacity-40"
                            >
                              Return
                            </button>
                            <button
                              type="button"
                              disabled={busyId === a.id || own}
                              onClick={() =>
                                decide(a, APPROVAL_DECISIONS.REJECT)
                              }
                              className="text-xs font-bold bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 transition disabled:opacity-40"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        a.decision && (
                          <p className="text-xs text-slate-500 border-t border-slate-200 pt-3">
                            {a.status.replace("_", " ")} by {a.decision.by} ·{" "}
                            {new Date(a.decision.at).toLocaleString()}
                            {a.decision.comment
                              ? ` — ${a.decision.comment}`
                              : ""}
                          </p>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default ApprovalQueue;
