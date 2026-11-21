// src/Pages/modules/operations/pages/Documents/ClosurePrintView.jsx
// Staff see the full Closure Summary; the Client sees only a client-safe version.
import { useParams } from 'react-router-dom';
import PrintShell from '../../components/PrintShell';
import { PrintLoading, PrintMessage } from '../../components/print/PrintStates';
import { usePrintDoc } from '../../hooks/usePrintDoc';
import { canViewDocType } from '../../utils/documentAccess';
import { fmtDateTime } from '../../utils/printFormat';
import { OPERATIONS_ROLES as R } from '../../constants/operationsRoles';

const Sec = ({ title, children }) => <div className="mb-4 break-inside-avoid"><p className="text-xs font-black uppercase text-slate-600 border-b border-slate-300 mb-1.5 pb-0.5">{title}</p>{children}</div>;
const Row = ({ k, v }) => <p className="py-0.5"><span className="font-bold text-slate-600">{k}:</span> {v || v === 0 ? v : '—'}</p>;

const ClosurePrintView = () => {
  const { shipmentId } = useParams();
  const { shipment: s, isLoading, error, user } = usePrintDoc(shipmentId, []);
  if (isLoading) return <PrintLoading label="Loading closure summary..." />;
  const allowed = s && canViewDocType(user, s, 'CLOSURE');
  const c = s?.closure;
  const sum = c?.summary;
  const isClient = user?.role === R.CLIENT;

  return (
    <PrintShell title="Shipment Closure Summary" fileName={`Closure-${shipmentId}`}>
      {error ? <PrintMessage>{error}</PrintMessage> : !allowed || !c ? <PrintMessage tone="slate">This shipment has not been closed yet.</PrintMessage> : (
        <div className="text-xs">
          <Sec title="Shipment">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <Row k="Closure reference" v={sum?.ref} /><Row k="Shipment ID" v={s.shipmentId} /><Row k="Mode" v={s.mode} />
              {!isClient && <Row k="Client" v={s.clientName} />}
              <Row k="Route" v={`${s.route?.originCity || ''}, ${s.route?.originCountry || ''} ✈ ${s.route?.destCity || ''}, ${s.route?.destCountry || ''}`} />
              <Row k="AWB / MAWB" v={s.awbNumber || s.mawb?.mawbNumber} /><Row k="Principal tracking no." v={s.tracking?.trackingNumber} />
              <Row k="Final outcome" v={c.outcome} /><Row k="Closed" v={`${fmtDateTime(c.closedAt)}${isClient ? '' : ` by ${c.closedBy}`}`} />
            </div>
          </Sec>

          <Sec title="Milestone Timeline">
            {(sum?.timeline || []).length === 0 ? <p className="text-slate-400">No milestones recorded.</p> : (
              <table className="w-full"><tbody>{(isClient ? sum.clientSafe?.milestones || [] : sum.timeline).map((t, i) => (
                <tr key={i} className="border-b border-slate-100"><td className="py-1 pr-3 text-slate-500 w-40">{fmtDateTime(t.at)}</td><td className="py-1 font-semibold">{(t.label || t.code || '').replace(/_/g, ' ')}</td>{!isClient && <td className="py-1 text-slate-400 text-right">{t.source}</td>}</tr>))}</tbody></table>
            )}
          </Sec>

          {sum?.proof && <Sec title="Proof"><Row k="Type" v={sum.proof.type === 'POD' ? 'Proof of delivery' : 'Client Self-Cleared confirmation'} /><Row k="Recorded" v={fmtDateTime(sum.proof.at)} />{sum.proof.type === 'POD' && !isClient && <Row k="Validated by Supervisor" v={sum.proof.validated ? 'Yes' : 'No'} />}</Sec>}

          {!isClient && (
            <>
              <Sec title="Final Documents">
                {(sum?.documents || []).length === 0 ? <p className="text-slate-400">None.</p> : <p>{sum.documents.map((d) => `${d.type.replace(/_/g, ' ')} v${d.version} (${d.status.replace('_', ' ')})`).join(' · ')}</p>}
              </Sec>
              <Sec title="Approvals">
                {(sum?.approvals || []).length === 0 ? <p className="text-slate-400">None.</p> : sum.approvals.map((a) => <p key={a.no} className="py-0.5">{a.no} · {a.gate.replace('_', ' ')} — <b>{a.status}</b>{a.by ? ` by ${a.by}` : ''}{a.at ? ` · ${fmtDateTime(a.at)}` : ''}</p>)}
              </Sec>
              <Sec title="Exceptions and Resolution">
                {(sum?.exceptions || []).length === 0 ? <p className="text-slate-400">No exceptions were raised.</p> : sum.exceptions.map((e, i) => <p key={i} className="py-0.5"><b>{e.code.replace(/_/g, ' ')}</b> — raised by {e.raisedBy} ({fmtDateTime(e.at)}){e.resolvedAt ? `; resolved ${fmtDateTime(e.resolvedAt)}: ${e.resolution}` : '; NOT RESOLVED'}</p>)}
              </Sec>
              <Sec title="Audit">
                <Row k="Evidence records" v={sum?.evidenceCount} /><Row k="Tracking events" v={sum?.trackingEventCount} />
                <Row k="Closure note" v={c.note} />
                <Row k="Operations Head audit" v={c.headAudit ? `${c.headAudit.result} — ${c.headAudit.by}, ${fmtDateTime(c.headAudit.at)}${c.headAudit.comment ? ` — ${c.headAudit.comment}` : ''}` : 'Awaiting audit'} />
              </Sec>
            </>
          )}
        </div>
      )}
    </PrintShell>
  );
};

export default ClosurePrintView;