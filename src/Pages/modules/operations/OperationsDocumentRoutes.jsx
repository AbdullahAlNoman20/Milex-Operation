// src/Pages/modules/operations/OperationsDocumentRoutes.jsx
// Printable documents (outside the layout). Each view must check canViewShipment() itself (B6).
import AwbPrintView from './components/documents/AwbPrintView';
import AwbInvoiceCombinedView from './components/documents/AwbInvoiceCombinedView';
import InvoicePrintView from './components/documents/InvoicePrintView';
import PackingListPrintView from './components/documents/PackingListPrintView';
import DeclarationPrintView from './components/documents/DeclarationPrintView';
import LabelPrintView from './components/documents/LabelPrintView';
import ManifestPrintView from './components/documents/ManifestPrintView';
import PodPrintView from './components/documents/PodPrintView';
import ClosurePrintView from './components/documents/ClosurePrintView';

const OperationsDocumentRoutes = [
  { path: 'awb/:shipmentId', element: <AwbPrintView /> }, // ?copy=Shipper|Revenue|Invoice|Hub|Recipient
  { path: 'awb-invoice/:shipmentId', element: <AwbInvoiceCombinedView /> },
  { path: 'invoice/:shipmentId', element: <InvoicePrintView /> },
  { path: 'packing-list/:shipmentId', element: <PackingListPrintView /> },
  { path: 'declaration/:shipmentId', element: <DeclarationPrintView /> },
  { path: 'label/:shipmentId', element: <LabelPrintView /> },
  { path: 'manifest/:manifestId', element: <ManifestPrintView /> },
  { path: 'pod/:shipmentId', element: <PodPrintView /> },
  { path: 'closure/:shipmentId', element: <ClosurePrintView /> },
];

export default OperationsDocumentRoutes;