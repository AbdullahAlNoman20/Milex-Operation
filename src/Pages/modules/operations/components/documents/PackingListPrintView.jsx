// src/Pages/modules/operations/pages/Documents/PackingListPrintView.jsx
import { useParams } from 'react-router-dom';
import PrintShell from '../../components/PrintShell';
import { PrintLoading, PrintMessage, DocFooter } from '../../components/print/PrintStates';
import { usePrintDoc } from '../../hooks/usePrintDoc';
import { fmtDate } from '../../utils/printFormat';
import { getDocStatus } from '../../utils/docCompleteness';
import { packingTotals, volumetricOf } from '../../utils/chargeWeight';

const Party = ({ title, p = {} }) => (
  <div className="p-2 space-y-0.5 text-[11px]"><p className="font-bold">{title}</p><p>{p.companyName || '—'}</p><p>{[p.address, p.city, p.country].filter(Boolean).join(', ') || '—'}</p><p>{p.contactPhone || ''}</p></div>
);

const PackingListPrintView = () => {
  const { shipmentId } = useParams();
  const { shipment: s, docs, isLoading, error } = usePrintDoc(shipmentId, ['PACKING_LIST']);
  if (isLoading) return <PrintLoading label="Loading packing list..." />;
  const doc = docs.PACKING_LIST;
  const d = doc?.data || {};
  const rows = d.rows || [];
  const sum = (k) => rows.reduce((t, r) => t + (Number(r[k]) || 0), 0);
  const totals = packingTotals(rows);

  return (
    <PrintShell title="Packing List" fileName={`PackingList-${shipmentId}`} docStatus={doc ? getDocStatus('PACKING_LIST', s, doc) : null}>
      {error ? <PrintMessage>{error}</PrintMessage> : !doc ? <PrintMessage tone="slate">No packing list has been created for this shipment yet.</PrintMessage> : (
        <div className="text-[11px]">
          <div className="flex flex-wrap justify-between gap-2 mb-3"><p>Packing List No: <b>{d.packingNo || '—'}</b></p><p>Shipment: <b>{s.shipmentId}</b></p><p>Invoice / AWB: <b>{s.awbNumber || s.mawb?.mawbNumber || 'Pending'}</b></p><p>Date: <b>{fmtDate(doc.createdAt)}</b></p></div>
          <div className="grid grid-cols-2 border border-slate-800 mb-3"><div className="border-r border-slate-800"><Party title={s.mode === 'EXPORT' ? 'SHIPPER / SUPPLIER' : 'SUPPLIER'} p={s.pickup} /></div><Party title="CONSIGNEE" p={s.receiver} /></div>
          <p className="mb-2">Origin: <b>{s.route?.originCity}, {s.route?.originCountry}</b> ✈ Destination: <b>{s.route?.destCity}, {s.route?.destCountry}</b></p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] border border-slate-800">
              <thead><tr className="bg-slate-50 border-b border-slate-800 text-left"><th className="p-1.5">Carton / Mark</th><th className="p-1.5">Goods</th><th className="p-1.5 text-center">Qty</th><th className="p-1.5 text-center">L×W×H (cm)</th><th className="p-1.5 text-right">Net kg</th><th className="p-1.5 text-right">Gross kg</th><th className="p-1.5 text-right">Vol. kg</th></tr></thead>
              <tbody>
                {rows.map((r, i) => <tr key={i} className="border-b border-slate-200"><td className="p-1.5 font-semibold">{r.cartonNo}</td><td className="p-1.5">{r.description}</td><td className="p-1.5 text-center">{r.qty}</td><td className="p-1.5 text-center">{r.lengthCm && r.widthCm && r.heightCm ? `${r.lengthCm}×${r.widthCm}×${r.heightCm}` : '—'}</td><td className="p-1.5 text-right">{r.netKg || '—'}</td><td className="p-1.5 text-right">{r.grossKg || '—'}</td><td className="p-1.5 text-right">{volumetricOf(r.lengthCm, r.widthCm, r.heightCm, 1) || '—'}</td></tr>)}
                <tr className="border-t border-slate-800 font-bold bg-slate-50"><td className="p-1.5">{rows.length} carton(s)</td><td className="p-1.5 text-right">TOTAL</td><td className="p-1.5 text-center">{sum('qty')}</td><td className="p-1.5" /><td className="p-1.5 text-right">{sum('netKg').toFixed(2)}</td><td className="p-1.5 text-right">{totals.gross.toFixed(2)}</td><td className="p-1.5 text-right">{totals.volumetric.toFixed(2)}</td></tr>
                <tr className="border-t border-slate-800 font-black bg-emerald-50"><td className="p-1.5" colSpan={5}>CHARGEABLE WEIGHT (higher of Gross and Volumetric — {totals.basis === 'VOLUMETRIC' ? 'volumetric applies' : 'gross applies'})</td><td className="p-1.5 text-right" colSpan={2}>{totals.chargeable.toFixed(2)} kg</td></tr>
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3"><p>Marks: <b>{d.marks || '—'}</b></p><p>Seal: <b>{d.seal || '—'}</b></p><p>Remarks: <b>{d.remarks || '—'}</b></p></div>
          <div className="grid grid-cols-2 gap-8 mt-10"><p className="border-t border-slate-800 pt-1 text-slate-500">Prepared by: {doc.createdBy}</p><p className="border-t border-slate-800 pt-1 text-slate-500">Authorised signature / stamp</p></div>
          <DocFooter doc={doc} />
        </div>
      )}
    </PrintShell>
  );
};

export default PackingListPrintView;