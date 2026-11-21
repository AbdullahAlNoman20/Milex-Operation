// src/Pages/modules/operations/pages/DomesticAdmin/ManifestBuilder.jsx
// Create a new manifest, or revise an existing one (?revise=<id>) — a revision is saved as a new version.
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Trash2, Lock, ArrowLeft } from "lucide-react";
import SectionCard from "../../components/SectionCard";
import Field, { inp } from "../../components/Field";
import Loader from "../../../../../Components/Shared/Loader";
import { useOperationsAuth } from "../../hooks/useOperationsAuth";
import { useToast } from "../../../../../Components/hooks/useToast";
import { fetchShipments } from "../../services/shipmentService";
import {
  createManifest,
  reviseManifest,
  fetchManifestById,
  fetchManifests,
} from "../../services/manifestService";
import { countryCode } from "../../utils/countryCodes";
import { ROLE_HOME } from "../../constants/operationsRoles";
import { missingForOrigin, missingForDhaka } from "../../utils/manifestExcel";
import {
  MANIFEST_TEMPLATES,
  MANIFEST_TEMPLATE_LIST,
  MANIFEST_ROW_FIELDS,
  emptyManifestRow,
} from "../../constants/manifestTemplates";

const NUMERIC = new Set(["pieces", "weightKg", "customsValue"]);

const rowFromShipment = (s) => ({
  ...emptyManifestRow(),
  shipmentId: s.shipmentId,
  clientEmail: s.clientEmail,
  hawbNo: s.awbNumber || s.tracking?.trackingNumber || s.shipmentId,
  consignmentNo: s.awbNumber || s.tracking?.trackingNumber || s.shipmentId,
  shipperCity: s.pickup?.city || "",
  shipperProvince: s.pickup?.state || "",
  shipperCountry: s.pickup?.country || "",
  shipperPostCode: s.pickup?.postCode || "",
  consigneeCity: s.receiver?.city || "",
  consigneePostCode: s.receiver?.postCode || "",
  consigneeCountry: s.receiver?.country || "",
  originCountry: countryCode(s.pickup?.country) || s.pickup?.country || "",
  shipperName: s.pickup?.companyName || "",
  shipperAddress: [s.pickup?.address, s.pickup?.city, s.pickup?.country]
    .filter(Boolean)
    .join(", "),
  consigneeName: s.receiver?.companyName || "",
  consigneeAddress: [
    s.receiver?.address,
    s.receiver?.city,
    s.receiver?.postCode,
    s.receiver?.country,
  ]
    .filter(Boolean)
    .join(", "),
  phone: s.receiver?.contactPhone || "",
  commodity: s.parcel?.shipmentContents || "",
  hsCode: s.parcel?.hsCode || "",
  pieces: s.parcel?.pieces || "",
  weightKg: s.parcel?.weightKg || "",
  destCountry: s.receiver?.country || "",
  originStation: s.route?.originAirport || "",
  destStation: s.route?.destAirport || "",
  customsValue: s.parcel?.declaredValue || "",
  currency: s.parcel?.currency || "USD",
  bin: s.taxIds?.bin || "",
  serviceProvider: s.route?.principal || "",
  labelNo: "",
});

const ManifestBuilder = () => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reviseId = params.get("revise");
  const [shipments, setShipments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [templateCode, setTemplateCode] = useState(currentUser?.role === "FOREIGN_ADMIN" ? "AIRLINE_ORIGIN_XLSX" : "EXPORT_STANDARD");
  const [route, setRoute] = useState({
    principal: "",
    department: "",
    area: "",
    origin: "",
    destination: "",
  });
  const [flight, setFlight] = useState({
    mawbNo: "",
    flightNo: "",
    date: "",
    loadingPort: "",
    dischargePort: "",
  });
  const [extraHeader, setExtraHeader] = useState({});
  const [rows, setRows] = useState([]);
  const [inOther, setInOther] = useState({});
  const [filterMode, setFilterMode] = useState("ALL");
  const [busy, setBusy] = useState(false);
  const [revising, setRevising] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const all = await fetchShipments();
        const mans = await fetchManifests();
        if (alive) {
          const map = {};
          mans.filter((m) => !(reviseId && String(m.id) === String(reviseId))).forEach((m) => (m.rows || []).forEach((r) => { if (r.shipmentId) map[r.shipmentId] = m.manifestNo; }));
          setInOther(map);
        }
        if (alive) setShipments(all.filter((s) => s.statusCode !== 'CLOSED' && s.statusCode !== 'DRAFT'));
        const pre = all.find((x) => x.shipmentId === params.get('shipment'));
        if (alive && pre && !reviseId) { setRows([rowFromShipment(pre)]); setFlight((p) => ({ ...p, mawbNo: pre.mawb?.mawbNumber || '', flightNo: pre.mawb?.flightNo || '' })); }
        if (reviseId) {
          const m = await fetchManifestById(reviseId);
          if (!m || m.status === "SUPERSEDED") {
            showToast(
              "Only the latest manifest version can be revised",
              "warning",
            );
            return;
          }
          if (alive) {
            setRevising(m);
            setTemplateCode(m.templateCode);
            setRoute({
              principal: "",
              department: "",
              area: "",
              origin: "",
              destination: "",
              ...m.route,
            });
            setFlight({
              mawbNo: "",
              flightNo: "",
              date: "",
              loadingPort: "",
              dischargePort: "",
              ...m.flight,
            });
            setExtraHeader(m.extraHeader || {});
            setRows(m.rows.map((r) => ({ ...r })));
          }
        }
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviseId]);

  const tpl = MANIFEST_TEMPLATES[templateCode];
  const totals = useMemo(
    () => ({
      pieces: rows.reduce((t, r) => t + (Number(r.pieces) || 0), 0),
      weight: rows.reduce((t, r) => t + (Number(r.weightKg) || 0), 0),
      value: rows.reduce((t, r) => t + (Number(r.customsValue) || 0), 0),
    }),
    [rows],
  );
  const modeOk = (s) => (filterMode === "ALL" || s.mode === filterMode) && !rows.some((r) => r.shipmentId === s.shipmentId);
  const available = shipments.filter((s) => modeOk(s) && !inOther[s.shipmentId]);
  const lockedList = shipments.filter((s) => modeOk(s) && inOther[s.shipmentId]);
  const missing = useMemo(() => {
    const m = { flight, route, rows };
    return { origin: missingForOrigin(m), dhaka: missingForDhaka(m) };
  }, [flight, route, rows]);
  // Fill header values from the first shipment so the Supervisor does not type them again.
  const autoHeader = (s) => {
    setRoute((p) => ({ ...p, principal: p.principal || s.tracking?.principal || s.route?.principal || '', origin: p.origin || s.route?.originCountry || '', destination: p.destination || s.route?.destCountry || '' }));
    setFlight((p) => ({ ...p, mawbNo: p.mawbNo || s.mawb?.mawbNumber || '', flightNo: p.flightNo || s.mawb?.flightNo || '', date: p.date || s.mawb?.flightDate || '', loadingPort: p.loadingPort || s.route?.originAirport || '', dischargePort: p.dischargePort || s.route?.destAirport || (s.mode === 'IMPORT' ? 'DAC' : '') }));
  };
  const addShipment = (s) => { if (inOther[s.shipmentId]) { showToast(`${s.shipmentId} is already in manifest ${inOther[s.shipmentId]}`, 'error'); return; } if (rows.length === 0) autoHeader(s); setRows((p) => [...p, rowFromShipment(s)]); };
  const setRow = (i, k, v) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  const save = async () => {
    setBusy(true);
    try {
      const draft = {
        templateCode,
        route,
        flight,
        extraHeader,
        rows,
      };
      if (revising) await reviseManifest(revising.id, draft, currentUser);
      else await createManifest(draft, currentUser);
      showToast(revising ? "New manifest version saved" : "Manifest created");
      navigate(`${ROLE_HOME[currentUser.role]}/manifests`);
    } catch (e) {
      showToast(e?.message || "Failed to save manifest", "error");
      setBusy(false);
    }
  };

  if (isLoading) return <Loader label="Loading..." />;
  const r = (k) => (e) => setRoute((p) => ({ ...p, [k]: e.target.value }));
  const fl = (k) => (e) => setFlight((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="w-full space-y-6">
      <div>
        <button type="button" onClick={() => navigate(`${ROLE_HOME[currentUser.role]}/manifests`)} className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 hover:-translate-x-0.5 transition"><ArrowLeft size={14} />Back to Manifest Register</button>
        <h1 className="text-xl font-black text-slate-800">
          {revising
            ? `Revise Manifest ${revising.manifestNo} (v${revising.version} ✈ v${revising.version + 1})`
            : "New Manifest"}
        </h1>
        <p className="text-sm text-slate-500">
          Pick the template, add consignments and review totals. It is saved as final as soon as you create it.
        </p>
      </div>

      <SectionCard title="Template & Route">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Manifest template" required>
            <select
              disabled={!!revising || busy}
              value={templateCode}
              onChange={(e) => setTemplateCode(e.target.value)}
              className={inp}
            >
              {MANIFEST_TEMPLATE_LIST.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Principal">
            <input
              disabled={busy}
              value={route.principal}
              maxLength={100}
              onChange={r("principal")}
              className={inp}
            />
          </Field>
          <Field label="Origin">
            <input
              disabled={busy}
              value={route.origin}
              maxLength={100}
              onChange={r("origin")}
              className={inp}
            />
          </Field>
          <Field label="Destination">
            <input
              disabled={busy}
              value={route.destination}
              maxLength={100}
              onChange={r("destination")}
              className={inp}
            />
          </Field>
          <Field label="MAWB no.">
            <input
              disabled={busy}
              value={flight.mawbNo}
              maxLength={30}
              onChange={fl("mawbNo")}
              className={inp}
            />
          </Field>
          <Field label="Flight no.">
            <input
              disabled={busy}
              value={flight.flightNo}
              maxLength={20}
              onChange={fl("flightNo")}
              className={inp}
            />
          </Field>
          <Field label="Flight date">
            <input
              type="date"
              disabled={busy}
              value={flight.date}
              onChange={fl("date")}
              className={inp}
            />
          </Field>
          <Field label="Loading port">
            <input
              disabled={busy}
              value={flight.loadingPort}
              maxLength={60}
              onChange={fl("loadingPort")}
              className={inp}
            />
          </Field>
          <Field label="Discharge port">
            <input
              disabled={busy}
              value={flight.dischargePort}
              maxLength={60}
              onChange={fl("dischargePort")}
              className={inp}
            />
          </Field>
          {tpl.headerFields.map((h) => (
            <Field key={h} label={h}>
              <input
                disabled={busy}
                value={extraHeader[h] || ""}
                maxLength={60}
                onChange={(e) =>
                  setExtraHeader((p) => ({ ...p, [h]: e.target.value }))
                }
                className={inp}
              />
            </Field>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-2">
          Unknown flight / MAWB values stay blank — they are never guessed.
        </p>
      </SectionCard>

      <SectionCard
        title={`Add Shipments (${available.length} available)`}
        subtitle="Add one shipment at a time, or press “Add All” to put every listed shipment into this one manifest."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={available.length === 0}
              onClick={() => { if (rows.length === 0 && available[0]) autoHeader(available[0]); setRows((p) => [...p, ...available.map((s) => rowFromShipment(s))]); if (lockedList.length) showToast(`${lockedList.length} shipment(s) skipped — already in another manifest`, 'warning'); }}
              className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              + Add All ({available.length})
            </button>
            <button
              type="button"
              disabled={rows.length === 0}
              onClick={() => setRows([])}
              className="text-xs font-bold border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Remove All
            </button>
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs bg-slate-50 outline-none"
          >
            <option value="ALL">All modes</option>
            <option value="EXPORT">Export</option>
            <option value="IMPORT">Import</option>
          </select>
          </div>
        }
      >
        {available.length === 0 ? (
          <p className="text-sm text-slate-400">No more shipments to add.</p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {available.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => addShipment(s)}
                className="text-[11px] font-bold border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-emerald-50 hover:border-emerald-400 hover:-translate-y-0.5 active:translate-y-0 transition"
              >
                + {s.shipmentId} · {s.clientName}
              </button>
            ))}
          </div>
        )}
        {lockedList.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {lockedList.map((s) => (
              <button key={s.id} type="button" onClick={() => addShipment(s)} className="text-[11px] font-bold border border-slate-200 bg-slate-50 text-slate-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-not-allowed" title={`Already in ${inOther[s.shipmentId]}`}>
                <Lock size={11} />{s.shipmentId} · in {inOther[s.shipmentId]}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setRows((p) => [...p, emptyManifestRow()])}
          className="mt-3 text-xs font-bold text-emerald-600 hover:underline"
        >
          + Add a manual consignment row
        </button>
      </SectionCard>

      <SectionCard
        title={`Consignments (${rows.length})`}
        subtitle={`Totals: ${totals.pieces} pcs · ${totals.weight.toFixed(2)} kg · value ${totals.value.toFixed(2)}`}
      >
        {rows.length === 0 ? (
          <p className="text-sm text-slate-400">No consignments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-xs min-w-full">
              <thead>
                <tr className="text-left text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                  <th className="py-2 pr-2">#</th>
                  {tpl.columns.map((c) => (
                    <th key={c} className="py-2 pr-2 whitespace-nowrap">
                      {MANIFEST_ROW_FIELDS[c]}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 align-top">
                    <td className="py-2 pr-2 text-slate-400">{i + 1}</td>
                    {tpl.columns.map((c) => (
                      <td key={c} className="py-1.5 pr-2">
                        <input
                          disabled={busy}
                          type={NUMERIC.has(c) ? "number" : "text"}
                          min={NUMERIC.has(c) ? 0 : undefined}
                          step={NUMERIC.has(c) ? "0.01" : undefined}
                          value={row[c] ?? ""}
                          maxLength={200}
                          onChange={(e) => setRow(i, c, e.target.value)}
                          className="border border-slate-300 rounded-lg p-1.5 text-xs bg-slate-50 focus:border-emerald-500 outline-none min-w-[110px]"
                        />
                      </td>
                    ))}
                    <td className="py-1.5">
                      <button
                        type="button"
                        aria-label="Remove row"
                        onClick={() =>
                          setRows((p) => p.filter((_, idx) => idx !== i))
                        }
                        className="text-red-500"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Before you save"
        subtitle="The manifest is printed or saved as PDF in landscape A4 from the Manifest Register. Anything missing for the airline or Dhaka customs layout is listed here."
      >
        {(missing.origin.length > 0 || missing.dhaka.length > 0) ? (
          <ul className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 list-disc pl-6 space-y-0.5 max-h-32 overflow-y-auto">
            {[...new Set([...missing.origin, ...missing.dhaka])].slice(0, 10).map((x) => <li key={x}>{x}</li>)}
          </ul>
        ) : <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">All information is present for both layouts.</p>}
        <div className="flex justify-end mt-4">
          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-emerald-700 hover:-translate-y-0.5 active:translate-y-0 transition disabled:opacity-50"
          >
            {busy ? "Saving..." : revising ? "Save New Version" : "Create Manifest"}
          </button>
        </div>
      </SectionCard>
    </div>
  );
};

export default ManifestBuilder;
