// src/Pages/modules/operations/pages/Documents/AwbInvoiceCombinedView.jsx
// One print: AWB (Shipper copy, front) + Commercial Invoice — "pickup ready" set.
import { useParams } from 'react-router-dom';
import PrintShell from '../../components/PrintShell';
import DocumentLinksPanel from '../../components/DocumentLinksPanel';
import AwbFront from '../../components/print/AwbFront';
import InvoiceBody from '../../components/print/InvoiceBody';
import { PrintLoading, PrintMessage } from '../../components/print/PrintStates';
import { usePrintDoc } from '../../hooks/usePrintDoc';
import { OPERATIONS_ROLES as R } from '../../constants/operationsRoles';
import { getDocStatus, mergeStatus } from '../../utils/docCompleteness';

const AwbInvoiceCombinedView = () => {
  const { shipmentId } = useParams();
  const { shipment: s, docs, isLoading, error, user } = usePrintDoc(shipmentId, ['AWB', 'INVOICE']);
  if (isLoading) return <PrintLoading label="Loading AWB and invoice..." />;
  return (
    <PrintShell title="AWB & Commercial Invoice" letterhead={false} docStatus={s && (docs.AWB || docs.INVOICE) ? mergeStatus(getDocStatus('INVOICE', s, docs.INVOICE), getDocStatus('AWB', s, docs.AWB)) : null} fileName={`AWB-Invoice-${shipmentId}`} sidebar={s && !error && user?.role !== R.COURIER ? <DocumentLinksPanel shipment={s} /> : null}>
      {error ? <PrintMessage>{error}</PrintMessage> : (
        <div className="space-y-6">
          <section className="break-after-page">
            {docs.AWB ? <AwbFront shipment={s} doc={docs.AWB} copyType="Shipper" /> : <PrintMessage tone="slate">The AWB is not available yet.</PrintMessage>}
          </section>
          <section>
            <p className="text-sm font-black uppercase tracking-wide mb-3">Commercial Invoice</p>
            {docs.INVOICE ? <InvoiceBody shipment={s} doc={docs.INVOICE} /> : <PrintMessage tone="slate">No invoice has been created for this shipment yet.</PrintMessage>}
          </section>
        </div>
      )}
    </PrintShell>
  );
};

export default AwbInvoiceCombinedView;