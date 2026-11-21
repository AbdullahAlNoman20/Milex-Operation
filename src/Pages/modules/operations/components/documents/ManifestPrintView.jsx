// src/Pages/modules/operations/pages/Documents/ManifestPrintView.jsx
// Front: consignment rows (columns follow the template). Back: authorisation. Client sees only its own rows.
import { useParams } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import PrintShell from '../../components/PrintShell';
import Barcode from '../print/Barcode';
import { PrintLoading, PrintMessage, DocFooter } from '../../components/print/PrintStates';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { fetchManifestById } from '../../services/manifestService';
import { fetchShipments } from '../../services/shipmentService';
import { filterVisibleShipments } from '../../services/accessService';
import { MANIFEST_TEMPLATES, MANIFEST_ROW_FIELDS } from '../../constants/manifestTemplates';
import { fmtDate, fmtDateTime, isImageFile } from '../../utils/printFormat';
import { openDataUrl } from '../../utils/openFile';
import { OPERATIONS_ROLES as R } from '../../constants/operationsRoles';

const DENIED = 'This manifest was not found, or you do not have access to it.';

const ManifestPrintView = () => {
  const { manifestId } = useParams();
  const { currentUser } = useOperationsAuth();
  const [st, setSt] = useState({ isLoading: true, error: null, manifest: null, rows: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const m = await fetchManifestById(manifestId);
        if (!alive) return;
        const fail = () => setSt({ isLoading: false, error: DENIED, manifest: null, rows: [] });
        if (!m) return fail();
        const role = currentUser.role;
        const released = ['APPROVED', 'FINAL'].includes(m.status);
        if ([R.OPERATIONS_HEAD, R.DOMESTIC_ADMIN].includes(role)) return setSt({ isLoading: false, error: null, manifest: m, rows: m.rows });
        if (!released) return fail();
        if (role === R.CLIENT) {
          const mine = m.rows.filter((r) => r.clientEmail?.toLowerCase() === currentUser.email.toLowerCase());
          return mine.length ? setSt({ isLoading: false, error: null, manifest: m, rows: mine }) : fail();
        }
        if ([R.CNF, R.FOREIGN_ADMIN].includes(role)) {
          const visible = new Set(filterVisibleShipments(currentUser, await fetchShipments()).map((s) => s.shipmentId));
          return m.rows.some((r) => visible.has(r.shipmentId)) ? setSt({ isLoading: false, error: null, manifest: m, rows: m.rows }) : fail();
        }
        return fail();
      } catch {
        if (alive) setSt({ isLoading: false, error: 'Failed to load the manifest.', manifest: null, rows: [] });
      }
    })();
    return () => { alive = false; };
  }, [manifestId, currentUser]);

  const m = st.manifest;
  // Import manifests hold ONE set of data, shown in two layouts: Foreign Supervisor → airline origin layout; Bangladesh → Dhaka customs layout.
  const isImportManifest = ['AIRLINE_ORIGIN_XLSX', 'DAC_CUSTOMS'].includes(m?.templateCode);
  const viewCode = isImportManifest ? (currentUser?.role === 'FOREIGN_ADMIN' ? 'AIRLINE_ORIGIN_XLSX' : 'DAC_CUSTOMS') : m?.templateCode;
  const tpl = MANIFEST_TEMPLATES[viewCode] || MANIFEST_TEMPLATES.EXPORT_STANDARD;
  const totals = useMemo(() => ({
    pieces: st.rows.reduce((t, r) => t + (Number(r.pieces) || 0), 0),
    weight: st.rows.reduce((t, r) => t + (Number(r.weightKg) || 0), 0),
    value: st.rows.reduce((t, r) => t + (Number(r.customsValue) || 0), 0),
  }), [st.rows]);

  if (st.isLoading) return <PrintLoading label="Loading manifest..." />;
  const a = m?.authorisation;
  const partial = currentUser.role === R.CLIENT;

  return (
    <PrintShell orientation="landscape" title={m ? `${tpl.label}` : 'Manifest'} fileName={`Manifest-${m?.manifestNo || manifestId}`}>
      {st.error ? <PrintMessage>{st.error}</PrintMessage> : (
        <div className="text-[10px]">
          {m.status === 'SUPERSEDED' && <p className="mb-3 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-2 font-semibold print:hidden">This is a superseded version of the manifest.</p>}
          <section className="break-after-page">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-800 pb-2 mb-3">
              <div><p className="text-sm font-black">MANIFEST {m.manifestNo} <span className="text-slate-500 font-semibold">v{m.version}</span></p><p className="text-slate-500">{m.route?.principal || ''}{m.route?.department ? ` · ${m.route.department}` : ''}{m.route?.area ? ` · ${m.route.area}` : ''}</p></div>
              <div className="flex flex-col items-end gap-1"><Barcode value={m.manifestNo} height={34} width={1.4} /><p className="font-bold uppercase text-slate-600">{m.status.replace('_', ' ')}</p></div>
            </div>
            {tpl.code === 'DAC_CUSTOMS' ? (
              <div className="mb-3 border-2 border-slate-800">
                <p className="text-center text-2xl font-black py-2 border-b-2 border-slate-800">MANIFEST</p>
                <div className="grid grid-cols-2 text-[11px]">
                  {[['Master AWB Number', m.flight?.mawbNo], ['Consignee', 'ANROOT LOGEX LIMITED'], ['Port of Discharge', m.flight?.loadingPort], ['Shipper', m.route?.principal], ['Flight No.', m.flight?.flightNo], ['No. of pieces RCP', totals.pieces]].map(([k, v]) => <p key={k} className="border-b border-slate-300 px-3 py-1.5"><span className="font-bold">{k}:</span> <b className="ml-1">{v || '—'}</b></p>)}
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-1 mb-3">
              <p>Date: <b>{fmtDate(m.createdAt)}</b></p><p>Origin: <b>{m.route?.origin || '—'}</b></p><p>Destination: <b>{m.route?.destination || '—'}</b></p><p>Run / total consignments: <b>{st.rows.length}</b></p>
              <p>MAWB No: <b>{m.flight?.mawbNo || '—'}</b></p><p>Flight: <b>{m.flight?.flightNo || '—'} {m.flight?.date ? `· ${fmtDate(m.flight.date)}` : ''}</b></p><p>Loading port: <b>{m.flight?.loadingPort || '—'}</b></p><p>Discharge port: <b>{m.flight?.dischargePort || '—'}</b></p>
              {tpl.headerFields.map((h) => <p key={h}>{h}: <b>{m.extraHeader?.[h] || '—'}</b></p>)}
            </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border border-slate-800">
                <thead><tr className="bg-slate-800 text-white text-left print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]"><th className="p-1.5">#</th>{tpl.columns.map((c) => <th key={c} className="p-1.5">{tpl.labels?.[c] || MANIFEST_ROW_FIELDS[c]}</th>)}</tr></thead>
                <tbody>
                  {st.rows.map((r, i) => <tr key={i} className="border-t border-slate-300 align-top"><td className="p-1.5">{i + 1}</td>{tpl.columns.map((c) => <td key={c} className="p-1.5">{r[c] === '' || r[c] == null ? '—' : String(r[c])}</td>)}</tr>)}
                  <tr className="border-t-2 border-slate-800 font-bold bg-slate-50"><td className="p-1.5" colSpan={2}>TOTAL</td><td className="p-1.5" colSpan={tpl.columns.length - 1}>{totals.pieces} pcs · {totals.weight.toFixed(2)} kg{totals.value ? ` · value ${totals.value.toFixed(2)}` : ''}</td></tr>
                </tbody>
              </table>
            </div>
            {partial && <p className="mt-2 text-[9px] text-slate-400">Showing only your consignments on this manifest.</p>}
          </section>

          <section>
            <p className="text-sm font-black border-b-2 border-slate-800 pb-1 mb-4">AUTHORISATION — {m.manifestNo} v{m.version}</p>
            {!a ? <p className="text-slate-400 text-xs">The authorisation (signature / stamp) has not been recorded yet.</p> : (
              <div className="space-y-2 text-[11px]">
                {a.text && <p className="whitespace-pre-line">{a.text}</p>}
                <p>Signatory: <b>{a.signatory}</b>{a.title ? `, ${a.title}` : ''}</p>
                <p>Signed on: <b>{a.signedAt ? fmtDate(a.signedAt) : '—'}</b> · C&F reference: <b>{a.cnfRef || '—'}</b></p>
                <p className="text-slate-500">Recorded by {a.recordedBy}</p>
                {a.file && (isImageFile(a.file) ? <img src={a.file.dataUrl} alt="Signed authorisation" className="max-h-72 border border-slate-300" /> : <button type="button" onClick={() => openDataUrl(a.file)} className="text-xs font-bold text-emerald-600 underline print:hidden">View signed scan: {a.file.name}</button>)}
              </div>
            )}
            <div className="grid grid-cols-2 gap-10 mt-16"><p className="border-t border-slate-800 pt-1 text-slate-500">Signature / stamp</p><p className="border-t border-slate-800 pt-1 text-slate-500">Date</p></div>
          </section>
          <DocFooter extra={`Generated by ${currentUser.name} · ${fmtDateTime(new Date())}`} />
        </div>
      )}
    </PrintShell>
  );
};

export default ManifestPrintView;