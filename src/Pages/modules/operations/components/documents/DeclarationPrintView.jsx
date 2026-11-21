// src/Pages/modules/operations/pages/Documents/DeclarationPrintView.jsx
import { useParams } from 'react-router-dom';
import PrintShell from '../../components/PrintShell';
import { PrintLoading, PrintMessage, DocFooter } from '../../components/print/PrintStates';
import { usePrintDoc } from '../../hooks/usePrintDoc';
import { fmtDate } from '../../utils/printFormat';
import { getDocStatus } from '../../utils/docCompleteness';

const L = ({ k, v }) => <p className="py-0.5"><span className="font-bold">{k}:</span> {v || v === 0 ? v : '—'}</p>;

const DeclarationPrintView = () => {
  const { shipmentId } = useParams();
  const { shipment: s, docs, isLoading, error } = usePrintDoc(shipmentId, ['DECLARATION']);
  if (isLoading) return <PrintLoading label="Loading declaration..." />;
  const doc = docs.DECLARATION;
  const d = doc?.data || {};

  return (
    <PrintShell title="Declaration" fileName={`Declaration-${shipmentId}`} docStatus={doc ? getDocStatus('DECLARATION', s, doc) : null}>
      {error ? <PrintMessage>{error}</PrintMessage> : !doc ? <PrintMessage tone="slate">No declaration has been created for this shipment yet.</PrintMessage> : (
        <div className="text-[12px] leading-relaxed">
          <div className="grid grid-cols-2 gap-x-6">
            <L k="Declaration No" v={d.declarationNo} /><L k="Date" v={fmtDate(d.declarationDate)} />
            <L k="Invoice No" v={d.invoiceNo} /><L k="Shipment ID" v={s.shipmentId} />
            <L k="ERC No" v={d.ercNo ? `${d.ercNo}${d.ercDate ? ` · Date: ${fmtDate(d.ercDate)}` : ''}` : ''} /><L k="Previous ERC No" v={d.previousErc || 'N/A'} />
            <L k="BIN No" v={d.binNo ? `${d.binNo}${d.binDate ? ` · Date: ${fmtDate(d.binDate)}` : ''}` : ''} /><L k="VAT No" v={d.vat} />
            <L k="e-TIN No" v={d.etin} />
          </div>
          <div className="mt-4 space-y-1">
            <L k="Exporter / Shipper" v={d.exporterName} /><p className="pl-4 text-slate-600">{d.exporterAddress}</p>
            <L k="Importer / Consignee" v={d.importerName} /><p className="pl-4 text-slate-600">{d.importerAddress}</p>
          </div>
          <p className="text-center font-black underline tracking-widest my-5">DECLARATION</p>
          <p className="font-bold">Description of Goods:</p>
          <p className="pl-4 whitespace-pre-line">{d.goodsDescription}</p>
          <div className="grid grid-cols-2 gap-x-6 mt-3">
            <L k="HS Code" v={d.hsCode} /><L k="Country of Origin" v={d.countryOfOrigin} />
            <L k="Gross Weight" v={d.grossWeight ? `${d.grossWeight} kg` : ''} /><L k="Net Weight" v={d.netWeight ? `${d.netWeight} kg` : ''} />
            <L k="Pieces / Packages" v={d.pcs} /><L k="Declared Value" v={d.declaredValue ? `${d.currency || ''} ${d.declaredValue}` : ''} />
            <L k="Incoterms" v={d.incoterms} /><L k="Export Purpose" v={d.exportPurpose} />
            <L k="B/E No" v={d.beNo} /><L k="MAWB / HAWB / AWB" v={d.mawbNo || s.awbNumber} />
          </div>
          {d.sampleNote && <p className="mt-3">{d.sampleNote}</p>}
          <p className="mt-4 italic text-slate-700">{d.declarationText}</p>
          <div className="grid grid-cols-2 gap-8 mt-14">
            <div className="border-t border-slate-800 pt-1"><p className="text-slate-500">Signature / stamp (authorised party)</p>{(d.signatoryName || d.signatoryTitle) && <p className="text-[11px]">{d.signatoryName}{d.signatoryTitle ? `, ${d.signatoryTitle}` : ''}</p>}</div>
            <div className="border-t border-slate-800 pt-1"><p className="text-slate-500">Date / customs evidence reference</p></div>
          </div>
          <DocFooter doc={doc} />
        </div>
      )}
    </PrintShell>
  );
};

export default DeclarationPrintView;