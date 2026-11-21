// src/Pages/modules/operations/pages/Documents/InvoicePrintView.jsx
import { useParams } from 'react-router-dom';
import PrintShell from '../../components/PrintShell';
import InvoiceBody from '../../components/print/InvoiceBody';
import { PrintLoading, PrintMessage } from '../../components/print/PrintStates';
import { usePrintDoc } from '../../hooks/usePrintDoc';
import { getDocStatus } from '../../utils/docCompleteness';

const InvoicePrintView = () => {
  const { shipmentId } = useParams();
  const { shipment: s, docs, isLoading, error } = usePrintDoc(shipmentId, ['INVOICE']);
  if (isLoading) return <PrintLoading label="Loading invoice..." />;
  return (
    <PrintShell title="Commercial Invoice" letterhead={false} fileName={`Invoice-${shipmentId}`} docStatus={docs.INVOICE ? getDocStatus('INVOICE', s, docs.INVOICE) : null}>
      {error ? <PrintMessage>{error}</PrintMessage> : !docs.INVOICE ? <PrintMessage tone="slate">No invoice has been created for this shipment yet.</PrintMessage> : <InvoiceBody shipment={s} doc={docs.INVOICE} />}
    </PrintShell>
  );
};

export default InvoicePrintView;