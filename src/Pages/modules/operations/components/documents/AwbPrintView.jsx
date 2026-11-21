// src/Pages/modules/operations/pages/Documents/AwbPrintView.jsx
// ?copy=Shipper|Revenue|Invoice|Hub|Recipient|ALL  — each copy = front + back (Terms and Conditions).
import { useParams, useSearchParams } from 'react-router-dom';
import PrintShell from '../../components/PrintShell';
import DocumentLinksPanel from '../../components/DocumentLinksPanel';
import AwbFront from '../../components/print/AwbFront';
import AwbBack from '../../components/print/AwbBack';
import { PrintLoading, PrintMessage, DocFooter } from '../../components/print/PrintStates';
import { usePrintDoc } from '../../hooks/usePrintDoc';
import { AWB_COPY_TYPES } from '../../constants/shipmentFields';
import { OPERATIONS_ROLES as R } from '../../constants/operationsRoles';
import { getDocStatus } from '../../utils/docCompleteness';

const AwbPrintView = () => {
  const { shipmentId } = useParams();
  const [params, setParams] = useSearchParams();
  const { shipment: s, docs, isLoading, error, user } = usePrintDoc(shipmentId, ['AWB']);
  if (isLoading) return <PrintLoading label="Loading AWB..." />;

  const doc = docs.AWB;
  const isClient = user?.role === R.CLIENT;
  const raw = params.get('copy') || 'Shipper';
  const copies = isClient ? ['Shipper'] : raw === 'ALL' ? AWB_COPY_TYPES : [AWB_COPY_TYPES.includes(raw) ? raw : 'Shipper'];
  const active = raw === 'ALL' ? 'ALL' : copies[0];

  return (
    <PrintShell orientation="landscape" title="International Air Waybill" docStatus={doc ? getDocStatus('AWB', s, doc) : null} fileName={`AWB-${shipmentId}${raw === 'ALL' ? '-all-copies' : `-${active}`}`}
      sidebar={s && !error && user?.role !== R.COURIER ? <DocumentLinksPanel shipment={s} /> : null}>
      {error ? <PrintMessage>{error}</PrintMessage> : !doc ? <PrintMessage tone="slate">The AWB has not been created yet, or it is not available to you.</PrintMessage> : (
        <>
          {!isClient && (
            <div className="flex flex-wrap gap-2 mb-4 print:hidden">
              {[...AWB_COPY_TYPES, 'ALL'].map((c) => (
                <button key={c} type="button" onClick={() => setParams({ copy: c })} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition ${active === c ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{c === 'ALL' ? 'All 5 copies' : `${c} copy`}</button>
              ))}
            </div>
          )}
          {doc.data?.state !== 'FINAL' && <p className="mb-3 text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-2.5 font-semibold print:hidden">This AWB is still a draft — it is not final until the Supervisor finalises it.</p>}
          {copies.map((c, i) => (
            <div key={c}>
              <section className="break-after-page"><AwbFront shipment={s} doc={doc} copyType={c} /></section>
              <section className={i < copies.length - 1 ? 'break-after-page' : ''}><AwbBack version={doc.data?.termsVersion || 'v1'} /></section>
            </div>
          ))}
          <DocFooter doc={doc} />
        </>
      )}
    </PrintShell>
  );
};

export default AwbPrintView;