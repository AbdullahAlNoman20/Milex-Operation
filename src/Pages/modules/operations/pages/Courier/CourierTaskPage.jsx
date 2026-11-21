// src/Pages/modules/operations/pages/Courier/CourierTaskPage.jsx
import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Phone, MapPin, FileText, Trash2, MessageSquare } from 'lucide-react';
import SectionCard from "../../components/SectionCard";
import Chip, { toneForStatus } from "../../components/Chip";
import Field, { inp } from "../../components/Field";
import Loader from "../../../../../Components/Shared/Loader";
import { useOperationsAuth } from "../../hooks/useOperationsAuth";
import { useDataVersion } from "../../hooks/useDataVersion";
import { useToast } from "../../../../../Components/hooks/useToast";
import {
  fetchTaskById,
  acceptTask,
  startTask,
  completeTask,
  ACTIVE_TASK_STATUSES,
  TASK_STATUS,
  FAILURE_TYPES,
  DISCREPANCY_TYPES,
} from "../../services/taskService";
import { fetchShipmentById, addMessage } from '../../services/shipmentService';
import { getLatestDocument } from '../../services/documentService';
import { prepareFile } from "../../services/fileService";
import { sameId } from "../../services/serviceUtils";
import {
  TASK_TYPES,
  PARCEL_CONDITION_OPTIONS,
} from "../../constants/shipmentFields";
import { openDataUrl } from "../../utils/openFile";

const nowLocal = () => {
  const d = new Date();
  const p = (x) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const MAX_FILES = 5;
const telHref = (p) => `tel:${String(p || "").replace(/[^\d+]/g, "")}`;
const blank = () => ({
  actualAt: nowLocal(),
  location: "",
  actualPieces: "",
  condition: "GOOD",
  seal: "",
  marks: "",
  invoicePLReceived: "",
  missingDocs: "",
  receiptNo: "",
  receivedBy: "",
  signatureText: "",
  remarks: "",
  discrepancyType: "",
  discrepancyReason: "",
  nextAction: "",
});

const CourierTaskPage = () => {
  const { taskId } = useParams();
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const version = useDataVersion();
  const [task, setTask] = useState(null);
  const [shipment, setShipment] = useState(null);
  const [invoice, setInvoice] = useState(null);
  const [state, setState] = useState('loading');
  const [mode, setMode] = useState("complete");
  const [f, setF] = useState(blank);
  const [evidence, setEvidence] = useState([]);
  const [fail, setFail] = useState({
    failureType: "",
    reason: "",
    nextAction: "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const t = await fetchTaskById(taskId);
      if (!t || !sameId(t.assignedTo?.email, currentUser.email)) {
        setState("missing");
        return;
      }
      setTask(t);
      setShipment(await fetchShipmentById(t.shipmentId));
      setInvoice(await getLatestDocument(t.shipmentId, 'INVOICE'));
      setState('ready');
    } catch {
      setState("missing");
    }
  }, [taskId, currentUser.email]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    load();
  }, [load, version]);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const run = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      showToast(msg);
      await load();
    } catch (e) {
      showToast(e?.message || "Action failed", "error");
    } finally {
      setBusy(false);
    }
  };

  const addFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (evidence.length + files.length > MAX_FILES)
      return showToast(`You can attach at most ${MAX_FILES} files`, "warning");
    for (const file of files) {
      try {
        const meta = await prepareFile(file);
        setEvidence((p) => [...p, meta]);
      } catch (err) {
        showToast(err.message, "warning");
      }
    }
  };

  if (state === "loading") return <Loader label="Loading task..." />;
  if (state === "missing" || !task)
    return (
      <div className="max-w-xl mx-auto p-6 text-center">
        <p className="text-sm font-semibold text-red-600 mb-3">
          This task was not found or is not assigned to you.
        </p>
        <Link
          to="/operations/courier"
          className="text-sm font-bold text-emerald-600 hover:underline"
        >
          Back to my tasks
        </Link>
      </div>
    );

  const t = task;
  const isActive = ACTIVE_TASK_STATUSES.includes(t.status);
  const expected = Number(t.expected?.pieces);
  const piecesMismatch =
    f.actualPieces !== "" && Number(f.actualPieces) !== expected;
  const damaged = f.condition !== "GOOD";
  const docsMissing =
    t.type === "PICKUP" && f.invoicePLReceived && f.invoicePLReceived !== "YES";
  const hasDiscrepancy = piecesMismatch || damaged || docsMissing;
  const returned =
    t.status === TASK_STATUS.ASSIGNED && t.review?.decision === "RETURN";
  const previous = [...(t.history || [])]
    .reverse()
    .find((h) => h.completion)?.completion;

  const validateComplete = () => {
    if (!f.actualAt) return "Actual date-time is required";
    if (new Date(f.actualAt).getTime() > Date.now() + 5 * 60000)
      return "Actual time cannot be in the future";
    if (
      !(Number(f.actualPieces) > 0) ||
      !Number.isInteger(Number(f.actualPieces))
    )
      return "Actual pieces must be a whole number greater than 0";
    if (t.type === "PICKUP" && !f.invoicePLReceived)
      return "Say whether the invoice / packing list was received";
    if (t.type === "AIRPORT_COLLECTION" && !f.receiptNo.trim())
      return "Warehouse receipt number is required";
    if (
      t.type === "DELIVERY" &&
      (!f.receivedBy.trim() || !f.signatureText.trim())
    )
      return "Recipient name and typed signature are required";
    if (evidence.length === 0)
      return "Attach at least one photo / receipt as evidence";
    if (
      hasDiscrepancy &&
      (!f.discrepancyType ||
        !f.discrepancyReason.trim() ||
        !f.nextAction.trim())
    )
      return "A discrepancy was detected — choose its type and give the reason and next action";
    return null;
  };

  const submitComplete = () => {
    const err = validateComplete();
    if (err) return showToast(err, "warning");
    run(
      () =>
        completeTask(
          t.id,
          {
            outcome: "COMPLETED",
            ...f,
            actualPieces: Number(f.actualPieces),
            evidence,
          },
          currentUser,
        ),
      "Task completed — sent to the Supervisor for review",
    );
  };
  const submitFail = () => {
    if (!fail.failureType)
      return showToast("Select the failure type", "warning");
    if (!fail.reason.trim() || !fail.nextAction.trim())
      return showToast(
        "Failure reason and next action are required",
        "warning",
      );
    run(
      () => completeTask(t.id, { outcome: "FAILED", ...fail }, currentUser),
      "Marked as failed — the Supervisor will reschedule",
    );
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link
            to="/operations/courier"
            className="text-xs font-bold text-slate-400 hover:text-emerald-600"
          >
            ← My tasks
          </Link>
          <h1 className="text-xl font-black text-slate-800 mt-1">
            {t.taskNo} · {TASK_TYPES[t.type] || t.type}
          </h1>
          <p className="text-sm text-slate-500">Shipment {t.shipmentId}</p>
        </div>
        <Chip tone={toneForStatus(t.status)}>{t.status}</Chip>
      </div>

      {returned && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
          <p className="text-sm font-bold text-amber-800">
            Returned by the Supervisor
          </p>
          <p className="text-xs text-amber-700 mt-1">{t.review.comment}</p>
          {previous && (
            <p className="text-[11px] text-amber-600 mt-1">
              Your previous entry: {previous.actualPieces} pcs ·{" "}
              {previous.condition}
            </p>
          )}
        </div>
      )}

      <SectionCard title="Task Details">
        <div className="space-y-3 text-sm">
          <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-3">
            <p className="text-[10px] font-black uppercase text-emerald-700 mb-1">{t.type === 'DELIVERY' ? 'Deliver to' : 'Collect from'}</p>
            <p className="flex gap-2 text-base"><MapPin size={18} className="text-emerald-700 shrink-0 mt-0.5" /><span><b>{t.address?.companyName}</b><br />{[t.address?.address, t.address?.city, t.address?.postCode, t.address?.country].filter(Boolean).join(', ')}</span></p>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([t.address?.address, t.address?.city, t.address?.country].filter(Boolean).join(', '))}`} className="inline-block mt-2 text-xs font-bold text-emerald-800 underline">Open in Maps</a>
          </div>
          {(t.address?.contactPerson || t.address?.contactPhone) && (
            <p className="flex gap-2 items-center">
              <Phone size={16} className="text-emerald-600 shrink-0" />
              <span>
                {t.address.contactPerson}{" "}
                {t.address.contactPhone && (
                  <a
                    href={telHref(t.address.contactPhone)}
                    className="font-bold text-emerald-700 underline"
                  >
                    {t.address.contactPhone}
                  </a>
                )}
              </span>
            </p>
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <p>
              <b>Window:</b> {new Date(t.window.from).toLocaleString()} ✈{" "}
              {new Date(t.window.to).toLocaleString()}
            </p>
            <p>
              <b>Expected:</b> {t.expected?.pieces} pcs
              {t.expected?.weightKg ? ` · ${t.expected.weightKg} kg` : ""}
            </p>
            <p className="col-span-2"><b>Contents:</b> {t.expected?.contents}</p>
            {shipment?.clientName && <p><b>Client:</b> {shipment.clientName}</p>}
            {shipment?.refNo && <p><b>Ref / PO:</b> {shipment.refNo}</p>}
            {shipment?.requestedPickupDate && <p><b>Requested date:</b> {shipment.requestedPickupDate}</p>}
            {shipment?.parcel?.cartons && <p><b>Cartons:</b> {shipment.parcel.cartons}</p>}
            {shipment?.parcel?.remarks && <p className="col-span-2"><b>Remarks:</b> {shipment.parcel.remarks}</p>}
            {t.address?.contactPhone && (
              <div className="col-span-2 grid grid-cols-2 gap-2 pt-2">
                <a href={telHref(t.address.contactPhone)} className="flex items-center justify-center gap-2 bg-emerald-600 text-white text-sm font-bold rounded-xl py-3"><Phone size={16} /> Call</a>
                <a href={`sms:${String(t.address.contactPhone).replace(/[^\d+]/g, '')}?body=${encodeURIComponent(`MILEX Air: courier for shipment ${t.shipmentId}. `)}`} className="flex items-center justify-center gap-2 bg-slate-800 text-white text-sm font-bold rounded-xl py-3"><MessageSquare size={16} /> Message</a>
              </div>
            )}
            {t.note && (
              <p className="col-span-2">
                <b>Supervisor note:</b> {t.note}
              </p>
            )}
          </div>
                    {t.type === 'PICKUP' && invoice?.data?.items?.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Products to collect (per invoice {invoice.data.invoiceNo})</p>
              <ul className="space-y-1">{invoice.data.items.map((it, i) => <li key={i} className="flex justify-between gap-3 text-xs text-slate-700"><span className="break-words">{it.description}</span><span className="font-bold shrink-0">× {it.pcs}</span></li>)}</ul>
            </div>
          )}
          {t.type === 'PICKUP' && t.expected?.invoiceDocId && (
            <Link
              to={`/operations/documents/invoice/${encodeURIComponent(t.shipmentId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold bg-slate-800 text-white px-4 py-2.5 rounded-lg hover:bg-slate-900 transition"
            >
              <FileText size={14} /> Open Commercial Invoice copy (v
              {t.expected.invoiceVersion}) — collect the printed copy with the
              parcel
            </Link>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Message Operations">
        <div className="flex gap-2">
          <input value={msg} maxLength={300} onChange={(e) => setMsg(e.target.value)} placeholder="e.g. Reached the factory, waiting for the parcel" className={inp} />
          <button type="button" disabled={busy || !msg.trim()} onClick={() => run(async () => { await addMessage(t.shipmentId, `[Courier ${t.taskNo}] ${msg}`, currentUser); setMsg(''); }, 'Message sent')} className="text-xs font-bold bg-emerald-600 text-white px-4 rounded-lg disabled:opacity-40">Send</button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">The Supervisor sees this in the shipment's Messages tab.</p>
      </SectionCard>

      {isActive && (
        <>
          <div className="flex flex-wrap gap-2">
            {t.status === TASK_STATUS.ASSIGNED && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(() => acceptTask(t.id, currentUser), "Task accepted")
                }
                className="text-xs font-bold bg-white border border-emerald-600 text-emerald-700 px-4 py-2.5 rounded-lg hover:bg-emerald-50 transition disabled:opacity-50"
              >
                Accept Task
              </button>
            )}
            {[TASK_STATUS.ASSIGNED, TASK_STATUS.ACCEPTED].includes(
              t.status,
            ) && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(
                    () => startTask(t.id, currentUser),
                    t.type === "DELIVERY"
                      ? "Marked out for delivery"
                      : "Task started",
                  )
                }
                className="text-xs font-bold bg-slate-800 text-white px-4 py-2.5 rounded-lg hover:bg-slate-900 transition disabled:opacity-50"
              >
                {t.type === "DELIVERY"
                  ? "Start — Out for Delivery"
                  : "Start Task"}
              </button>
            )}
            <div className="ml-auto flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setMode("complete")}
                className={`px-3 py-2 text-xs font-bold ${mode === "complete" ? "bg-emerald-600 text-white" : "bg-white text-slate-500"}`}
              >
                Complete
              </button>
              <button
                type="button"
                onClick={() => setMode("fail")}
                className={`px-3 py-2 text-xs font-bold ${mode === "fail" ? "bg-red-600 text-white" : "bg-white text-slate-500"}`}
              >
                Could not complete
              </button>
            </div>
          </div>

          {mode === "complete" ? (
            <SectionCard
              title={
                t.type === "DELIVERY"
                  ? "Delivery Details"
                  : t.type === "AIRPORT_COLLECTION"
                    ? "Collection Details"
                    : "Pickup Details"
              }
              subtitle="Record what actually happened. A mismatch is allowed — just explain it."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Actual date-time" required>
                  <input
                    type="datetime-local"
                    disabled={busy}
                    value={f.actualAt}
                    onChange={set("actualAt")}
                    className={inp}
                  />
                </Field>
                <Field label="Location">
                  <input
                    disabled={busy}
                    value={f.location}
                    maxLength={150}
                    onChange={set("location")}
                    className={inp}
                  />
                </Field>
                <Field label={`Actual pieces (expected ${expected})`} required>
                  <input
                    type="number"
                    min="1"
                    disabled={busy}
                    value={f.actualPieces}
                    onChange={set("actualPieces")}
                    className={`${inp} ${piecesMismatch ? "border-red-400 bg-red-50" : ""}`}
                  />
                </Field>
                <Field label="Parcel condition" required>
                  <select
                    disabled={busy}
                    value={f.condition}
                    onChange={set("condition")}
                    className={inp}
                  >
                    {PARCEL_CONDITION_OPTIONS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                {t.type !== "DELIVERY" && (
                  <>
                    <Field label="Seal no.">
                      <input
                        disabled={busy}
                        value={f.seal}
                        maxLength={60}
                        onChange={set("seal")}
                        className={inp}
                      />
                    </Field>
                    <Field label="Package marks">
                      <input
                        disabled={busy}
                        value={f.marks}
                        maxLength={100}
                        onChange={set("marks")}
                        className={inp}
                      />
                    </Field>
                  </>
                )}
                {t.type === "PICKUP" && (
                  <>
                    <Field label="Invoice / packing list received" required>
                      <select
                        disabled={busy}
                        value={f.invoicePLReceived}
                        onChange={set("invoicePLReceived")}
                        className={inp}
                      >
                        <option value="">Select...</option>
                        <option value="YES">Yes — all received</option>
                        <option value="PARTIAL">Partial</option>
                        <option value="NO">No</option>
                      </select>
                    </Field>
                    {f.invoicePLReceived && f.invoicePLReceived !== "YES" && (
                      <Field label="Missing documents">
                        <input
                          disabled={busy}
                          value={f.missingDocs}
                          maxLength={200}
                          onChange={set("missingDocs")}
                          className={inp}
                        />
                      </Field>
                    )}
                  </>
                )}
                {t.type === "AIRPORT_COLLECTION" && (
                  <Field label="Warehouse receipt no." required>
                    <input
                      disabled={busy}
                      value={f.receiptNo}
                      maxLength={60}
                      onChange={set("receiptNo")}
                      className={inp}
                    />
                  </Field>
                )}
                {t.type === "DELIVERY" && (
                  <>
                    <Field label="Received by (name)" required>
                      <input
                        disabled={busy}
                        value={f.receivedBy}
                        maxLength={100}
                        onChange={set("receivedBy")}
                        className={inp}
                      />
                    </Field>
                    <Field label="Signature (type full name)" required>
                      <input
                        disabled={busy}
                        value={f.signatureText}
                        maxLength={100}
                        onChange={set("signatureText")}
                        className={inp}
                        style={{ fontFamily: "cursive" }}
                      />
                    </Field>
                  </>
                )}
                <Field label="Remarks" className="sm:col-span-2">
                  <input
                    disabled={busy}
                    value={f.remarks}
                    maxLength={500}
                    onChange={set("remarks")}
                    className={inp}
                  />
                </Field>
              </div>

              {hasDiscrepancy && (
                <div className="mt-4 border border-red-300 bg-red-50 rounded-lg p-3 space-y-3">
                  <p className="text-xs font-bold text-red-700">
                    Discrepancy detected
                    {piecesMismatch
                      ? ` — pieces ${f.actualPieces} vs expected ${expected}`
                      : ""}
                    {damaged ? " — parcel not in good condition" : ""}
                    {docsMissing ? " — documents missing" : ""}. The Supervisor
                    must review before the shipment can move on.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Field label="Type" required>
                      <select
                        disabled={busy}
                        value={f.discrepancyType}
                        onChange={set("discrepancyType")}
                        className={inp}
                      >
                        <option value="">Select...</option>
                        {DISCREPANCY_TYPES.map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Reason" required>
                      <input
                        disabled={busy}
                        value={f.discrepancyReason}
                        maxLength={300}
                        onChange={set("discrepancyReason")}
                        className={inp}
                      />
                    </Field>
                    <Field label="Suggested next action" required>
                      <input
                        disabled={busy}
                        value={f.nextAction}
                        maxLength={300}
                        onChange={set("nextAction")}
                        className={inp}
                      />
                    </Field>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <p className="text-[10px] font-bold text-slate-500 mb-1">
                  Evidence — photos / receipt * ({evidence.length}/{MAX_FILES},
                  PDF/JPG/PNG, max 2MB each)
                </p>
                <div className="flex flex-wrap gap-2 items-center">
                  {evidence.map((e, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 text-[11px] bg-slate-100 rounded-lg px-2 py-1"
                    >
                      <button
                        type="button"
                        onClick={() => openDataUrl(e)}
                        className="font-bold text-slate-700 hover:underline max-w-[140px] truncate"
                      >
                        {e.name}
                      </button>
                      <button
                        type="button"
                        aria-label="Remove file"
                        disabled={busy}
                        onClick={() =>
                          setEvidence((p) => p.filter((_, idx) => idx !== i))
                        }
                        className="text-red-500"
                      >
                        <Trash2 size={12} />
                      </button>
                    </span>
                  ))}
                  {evidence.length < MAX_FILES && (
                    <label className="text-xs font-bold text-emerald-600 cursor-pointer hover:underline">
                      + Add file
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        multiple
                        className="hidden"
                        disabled={busy}
                        onChange={addFiles}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex justify-end mt-5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={submitComplete}
                  className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-lg shadow-md hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {busy ? "Submitting..." : "Submit Completion"}
                </button>
              </div>
            </SectionCard>
          ) : (
            <SectionCard
              title="Could Not Complete"
              subtitle="Tell the Supervisor what went wrong. They will reschedule or reassign the task."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Failure type" required>
                  <select
                    disabled={busy}
                    value={fail.failureType}
                    onChange={(e) =>
                      setFail((p) => ({ ...p, failureType: e.target.value }))
                    }
                    className={inp}
                  >
                    <option value="">Select...</option>
                    {Object.entries(FAILURE_TYPES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Reason" required>
                  <input
                    disabled={busy}
                    value={fail.reason}
                    maxLength={300}
                    onChange={(e) =>
                      setFail((p) => ({ ...p, reason: e.target.value }))
                    }
                    className={inp}
                  />
                </Field>
                <Field
                  label="Suggested next action"
                  required
                  className="sm:col-span-2"
                >
                  <input
                    disabled={busy}
                    value={fail.nextAction}
                    maxLength={300}
                    onChange={(e) =>
                      setFail((p) => ({ ...p, nextAction: e.target.value }))
                    }
                    className={inp}
                  />
                </Field>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  disabled={busy}
                  onClick={submitFail}
                  className="bg-red-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  {busy ? "Submitting..." : "Report Failure"}
                </button>
              </div>
            </SectionCard>
          )}
        </>
      )}

      {t.status === TASK_STATUS.COMPLETED && t.completion && (
        <SectionCard
          title="Your Submission"
          actions={
            <Chip
              tone={
                t.review
                  ? t.review.decision === "ACCEPT"
                    ? "green"
                    : "amber"
                  : "amber"
              }
            >
              {t.review ? t.review.decision : "Awaiting review"}
            </Chip>
          }
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-600">
            <p>
              <b>When:</b> {new Date(t.completion.actualAt).toLocaleString()}
            </p>
            <p>
              <b>Pieces:</b> {t.completion.actualPieces} (expected {expected})
            </p>
            <p>
              <b>Condition:</b> {t.completion.condition}
            </p>
            {t.completion.receivedBy && (
              <p>
                <b>Received by:</b> {t.completion.receivedBy}
              </p>
            )}
            {t.completion.receiptNo && (
              <p>
                <b>Receipt:</b> {t.completion.receiptNo}
              </p>
            )}
            {t.completion.discrepancy && (
              <p className="col-span-2 text-red-600 font-semibold">
                Discrepancy — {t.completion.discrepancy.type}:{" "}
                {t.completion.discrepancy.reason}
              </p>
            )}
          </div>
          {t.review?.comment && (
            <p className="text-xs text-slate-500 mt-2">
              Supervisor: {t.review.comment}
            </p>
          )}
        </SectionCard>
      )}
      {t.status === TASK_STATUS.FAILED && t.failure && (
        <SectionCard title="Reported as Failed">
          <p className="text-sm text-slate-700">
            <b>{FAILURE_TYPES[t.failure.type]}</b>: {t.failure.reason}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Next action: {t.failure.nextAction}. The Supervisor will reschedule
            or reassign this task.
          </p>
        </SectionCard>
      )}
      {t.status === TASK_STATUS.CANCELLED && (
        <SectionCard title="Cancelled">
          <p className="text-sm text-slate-600">
            {t.cancelReason || "This task was cancelled by the Supervisor."}
          </p>
        </SectionCard>
      )}
      {shipment?.exceptionCode && (
        <p className="text-[11px] text-slate-400">
          Shipment is currently flagged by Operations; follow the Supervisor's
          instructions.
        </p>
      )}
    </div>
  );
};

export default CourierTaskPage;
