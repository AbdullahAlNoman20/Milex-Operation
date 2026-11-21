// src/Pages/modules/operations/pages/Documents/LabelPrintView.jsx
// Shows the label uploaded from the external labelling system. If none exists, staff get a clearly-marked provisional label.
import { useParams } from 'react-router-dom';
import PrintShell from '../../components/PrintShell';
import Barcode from '../../components/print/Barcode';
import { PrintLoading, PrintMessage, DocFooter } from '../../components/print/PrintStates';
import { usePrintDoc } from '../../hooks/usePrintDoc';
import { openDataUrl } from '../../utils/openFile';
import { isImageFile } from '../../utils/printFormat';
import { OPERATIONS_ROLES as R } from '../../constants/operationsRoles';
import { getDocStatus } from '../../utils/docCompleteness';

// Import label — same layout as the overseas courier label: barcode, order / tracking no., shipper, consignee, dimension table, value and weight.
const addr = (p = {}) => [p.address, p.city, p.postCode, p.country].filter(Boolean).join(', ');
const ImportLabel = ({ s, rows = [] }) => {
  const code = s.tracking?.trackingNumber || s.awbNumber || s.shipmentId;
  const cartons = Math.max(Number(s.parcel?.cartons) || rows.length || 1, 1);
  const list = rows.length ? rows : [{ lengthCm: s.parcel?.lengthCm, widthCm: s.parcel?.widthCm, heightCm: s.parcel?.heightCm, qty: s.parcel?.pieces }];
  const fill = Array.from({ length: Math.max(14, list.length) }, (_, i) => list[i] || null);
  const cell = 'border border-slate-800 px-1 py-0.5 text-center text-[10px]';
  return (
    <div className="mx-auto bg-white text-black avoid-break" style={{ width: '100mm', fontFamily: 'Arial, Helvetica, sans-serif' }}>
      <div className="text-center pt-1"><p className="text-[15px] font-bold uppercase leading-tight">{s.tracking?.principal || 'MILEX AIR'}</p></div>
      <div className="flex justify-center my-1"><Barcode value={String(code)} height={46} width={1.6} /></div>
      <p className="text-center text-[15px] font-bold tracking-wide">{s.shipmentId}</p>
      <div className="flex justify-between items-end px-1 mt-1 text-[11px]">
        <div><p><b>Order No.:</b> {s.refNo || s.shipmentId}</p><p><b>Tracking No.:</b> {s.tracking?.trackingNumber || s.awbNumber || '—'}</p></div>
        <p className="text-[10px]">{new Date().toISOString().slice(0, 19).replace('T', ' ')}</p>
      </div>
      <div className="border-t-2 border-black mt-1 flex justify-between items-start px-1 pt-1">
        <div className="text-[11px] leading-tight pr-2"><p className="text-[14px] font-semibold">Shipper Information:</p>
          <p className="font-semibold uppercase">{s.pickup?.companyName}</p><p className="uppercase">{addr(s.pickup)}</p>{s.pickup?.contactPhone && <p>{s.pickup.contactPhone}</p>}</div>
        <p className="text-[22px] font-light leading-none">1/{cartons}</p>
      </div>
      <div className="border-t-2 border-black mt-2 px-1 pt-1">
        <div className="flex justify-between items-baseline"><p className="text-[14px] font-semibold">Consignee Information:</p><p className="text-[10px]"><b>BIN:</b> {s.taxIds?.bin || '—'}</p></div>
        <div className="grid grid-cols-[1fr_46%] gap-1 mt-1">
          <div className="text-[11px] leading-tight uppercase">
            <p className="font-semibold">{s.receiver?.companyName}</p><p>{s.receiver?.contactPerson}</p><p>{addr(s.receiver)}</p>
            <div className="border-t border-black mt-3 pt-1 text-[11px]">{s.parcel?.remarks || s.parcel?.shipmentContents}</div>
          </div>
          <table className="w-full border-collapse"><thead><tr><th className={cell}>Length</th><th className={cell}>Width</th><th className={cell}>Height</th><th className={cell}>Pieces</th></tr></thead>
            <tbody>{fill.map((r, i) => <tr key={i}><td className={cell}>{r?.lengthCm ? Number(r.lengthCm).toFixed(2) : ''}</td><td className={cell}>{r?.widthCm ? Number(r.widthCm).toFixed(2) : ''}</td><td className={cell}>{r?.heightCm ? Number(r.heightCm).toFixed(2) : ''}</td><td className={cell}>{r ? (r.qty || 1) : ''}</td></tr>)}</tbody></table>
        </div>
      </div>
      <div className="px-1 mt-3 text-[13px] leading-snug pb-2"><p>Total Value (USD): <b>{s.parcel?.declaredValue ?? '—'}</b></p><p>Gross Weight (kg): <b>{s.parcel?.weightKg ?? '—'}</b></p></div>
    </div>
  );
};

const LabelPrintView = () => {
  const { shipmentId } = useParams();
  const { shipment: s, docs, isLoading, error, user } = usePrintDoc(shipmentId, ['LABEL', 'PACKING_LIST']);
  if (isLoading) return <PrintLoading label="Loading label..." />;
  const doc = docs.LABEL;
  const staff = [R.OPERATIONS_HEAD, R.DOMESTIC_ADMIN, R.FOREIGN_ADMIN].includes(user?.role);
  const file = doc?.file;
  const code = doc?.data?.barcode || s?.awbNumber || s?.tracking?.trackingNumber || s?.shipmentId;

  return (
    <PrintShell title="Shipping Label" fileName={`Label-${shipmentId}`} docStatus={doc ? getDocStatus('LABEL', s, doc) : null}>
      {error ? <PrintMessage>{error}</PrintMessage> : doc && file ? (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">Source: {doc.data?.source || '—'} · Status: <b>{doc.data?.labelStatus || '—'}</b> · Reference: {code}</p>
          {doc.data?.labelStatus === 'REJECTED' && <p className="text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg p-2.5 font-semibold">This label was rejected: {doc.data.discrepancyNote}</p>}
          {isImageFile(file) ? <img src={file.dataUrl} alt={`Label for ${shipmentId}`} className="max-w-full mx-auto border border-slate-300" />
            : <div className="border border-slate-300 rounded-lg p-6 text-center"><p className="text-sm font-semibold text-slate-700 mb-3">{file.name}</p><button type="button" onClick={() => openDataUrl(file)} className="text-xs font-bold bg-slate-800 text-white px-4 py-2 rounded-lg print:hidden">Open label PDF to print</button></div>}
          <DocFooter doc={doc} />
        </div>
      ) : staff && s && s.mode === 'IMPORT' ? (
        <div className="space-y-3">
          <p className="text-xs bg-sky-50 border border-sky-200 text-sky-800 rounded-lg p-2.5 font-semibold print:hidden">Import label generated from the shipment data (same layout as the overseas courier label). Upload the supplier / origin label in the Documents tab if you have the original.</p>
          <ImportLabel s={s} rows={docs.PACKING_LIST?.data?.rows || []} />
        </div>
      ) : staff && s ? (
        <div className="space-y-3">
          <p className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-2.5 font-semibold print:hidden">No external label has been uploaded. This provisional label is system-generated for reference — replace it with the label from the external labelling system.</p>
          <div className="border-4 border-slate-900 max-w-md mx-auto text-sm">
            <div className="flex justify-between border-b-4 border-slate-900 p-2"><p className="text-lg font-black">{s.parcel?.weightKg} KG</p><p className="text-lg font-black">{s.parcel?.pieces} PCS</p></div>
            <div className="p-3 border-b-4 border-slate-900"><p className="font-bold">{s.pickup?.companyName}</p><p>{[s.pickup?.address, s.pickup?.city, s.pickup?.country].filter(Boolean).join(', ')}</p><p className="mt-2 font-bold">SHIP TO:</p><p className="font-black text-base">{s.receiver?.companyName}</p><p>{s.receiver?.address}</p><p className="font-black uppercase">{s.receiver?.city} {s.receiver?.postCode}</p><p className="font-black uppercase">{s.receiver?.country}</p></div>
            <div className="p-3 border-b-4 border-slate-900 flex justify-center"><Barcode value={code} height={50} width={2} /></div>
            <div className="p-3 flex items-center justify-between"><div><p className="font-black text-lg">MILEX AIR</p><p className="text-xs">Ref: {s.shipmentId}</p></div><p className="text-3xl font-black">{s.mode === 'EXPORT' ? 'EXP' : 'IMP'}</p></div>
          </div>
          <p className="text-center text-[10px] font-bold text-red-600 tracking-widest">PROVISIONAL — NOT A CARRIER LABEL</p>
        </div>
      ) : <PrintMessage tone="slate">The label has not been uploaded yet, or it is not available to you.</PrintMessage>}
    </PrintShell>
  );
};

export default LabelPrintView;