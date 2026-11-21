// src/Pages/modules/operations/pages/Documents/PodPrintView.jsx
import { useParams } from 'react-router-dom';
import PrintShell from '../../components/PrintShell';
import { PrintLoading, PrintMessage } from '../../components/print/PrintStates';
import { usePrintDoc } from '../../hooks/usePrintDoc';
import { canViewDocType } from '../../utils/documentAccess';
import { fmtDate, fmtDateTime } from '../../utils/printFormat';

const Cell = ({ k, v }) => <div><p className="text-[10px] font-bold text-slate-400 uppercase">{k}</p><p className="font-semibold text-slate-800">{v || '—'}</p></div>;

const PodPrintView = () => {
  const { shipmentId } = useParams();
  const { shipment: s, isLoading, error, user } = usePrintDoc(shipmentId, []);
  if (isLoading) return <PrintLoading label="Loading proof of delivery..." />;
  const allowed = s && canViewDocType(user, s, 'POD');
  const pod = s?.pod;

  return (
    <PrintShell title="Proof of Delivery" fileName={`POD-${shipmentId}`}>
      {error ? <PrintMessage>{error}</PrintMessage> : !allowed || !pod?.deliveredAt ? <PrintMessage tone="slate">No proof of delivery has been recorded for this shipment yet.</PrintMessage> : (
        <div className="text-sm">
          <p className="mb-1">{fmtDate(pod.deliveredAt)}</p>
          <p className="mb-1">Dear Customer,</p>
          <p className="mb-4">This is a proof of delivery / statement of final status for shipment <b>{s.shipmentId}</b>{s.awbNumber ? ` (AWB ${s.awbNumber})` : ''}. Thank you for choosing MILEX Air.</p>
          <div className="bg-amber-50 border border-amber-200 text-amber-800 font-bold px-4 py-3 rounded mb-4 print:[-webkit-print-color-adjust:exact]">Your shipment {s.shipmentId} was delivered on {fmtDateTime(pod.deliveredAt)}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 border-t border-b border-slate-200 py-4 mb-4">
            <Cell k="Signed / received by" v={pod.receivedBy} />
            <Cell k="Destination" v={[s.receiver?.city, s.receiver?.country].filter(Boolean).join(', ')} />
            <div><p className="text-[10px] font-bold text-slate-400 uppercase">Signature</p><p className="italic text-lg text-slate-700" style={{ fontFamily: 'cursive' }}>{pod.signatureText || pod.receivedBy || '—'}</p></div>
            <Cell k="Shipment status" v={pod.validated ? 'Delivered — POD validated' : 'Delivered — POD awaiting validation'} />
            <Cell k="Pieces delivered" v={pod.pieces ?? s.parcel?.pieces} />
            <Cell k="Condition" v={pod.condition} />
            <Cell k="Source" v={pod.source === 'API' ? 'Carrier tracking record' : pod.source === 'COURIER' ? 'MILEX courier' : pod.source} />
            <Cell k="Validated" v={pod.validatedAt ? `${pod.validatedBy} · ${fmtDateTime(pod.validatedAt)}` : ''} />
          </div>
          <p className="font-bold text-xs uppercase text-slate-500 mb-2">Additional Shipment Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
            <p><b className="text-slate-600">Service:</b> {(s.services || []).join(', ') || 'Standard'}</p><p><b className="text-slate-600">Origin:</b> {s.route?.originCity}, {s.route?.originCountry}</p>
            <p><b className="text-slate-600">Contents:</b> {s.parcel?.shipmentContents}</p><p><b className="text-slate-600">Remarks:</b> {pod.remarks || '—'}</p>
            {pod.url && <p className="sm:col-span-2"><b className="text-slate-600">Carrier POD reference:</b> {pod.reference || pod.url}</p>}
          </div>
        </div>
      )}
    </PrintShell>
  );
};

export default PodPrintView;