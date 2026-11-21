// src/Pages/modules/operations/components/print/InvoiceBody.jsx
import { DocFooter } from './PrintStates';
import { fmtDate, money } from '../../utils/printFormat';
import { volumetricOf } from '../../utils/chargeWeight';

const Block = ({ title, p = {}, ids }) => (
  <div className="p-2 text-[11px] space-y-0.5">
    <p className="font-bold">{title}</p>
    <p>Company: {p.companyName || '—'}</p><p>Attn: {p.contactPerson || '—'}</p><p>Address: {p.address || '—'}</p>
    <p>City: {p.city || '—'} {p.postCode}</p><p>Country: {p.country || '—'}</p><p>Phone: {p.contactPhone || '—'}</p><p>Email: {p.contactEmail || '—'}</p>
    {ids}
  </div>
);

const CHARGES = [['freight', 'Freight'], ['insurance', 'Insurance'], ['tax', 'Tax'], ['otherCharges', 'Other charges'], ['discount', 'Discount (−)']];

const InvoiceBody = ({ shipment: s, doc }) => {
  const d = doc.data || {};
  const cur = d.currency || s.parcel?.currency || 'USD';
  const items = d.items || [];
  const tax = s.taxIds || {};
  const awb = s.awbNumber || s.mawb?.mawbNumber || '';
  const grand = d.grandTotal ?? d.total ?? 0;
  const ids = (
    <>
      {tax.eori && <p>EORI: {tax.eori}</p>}{tax.vat && <p>VAT: {tax.vat}</p>}{tax.bin && <p>BIN: {tax.bin}</p>}{tax.erc && <p>ERC: {tax.erc}</p>}{tax.etin && <p>e-TIN: {tax.etin}</p>}
    </>
  );
  const pc = s.parcel || {};
  const hasDims = pc.lengthCm > 0 && pc.widthCm > 0 && pc.heightCm > 0;
  const vol = pc.volumetricKg ?? volumetricOf(pc.lengthCm, pc.widthCm, pc.heightCm, pc.cartons || 1);
  const gross = Number(pc.weightKg) || 0;
  const chargeable = pc.chargeableKg ?? Math.max(gross, vol || 0);
  return (
    <div className="text-[11px]">
      <div className="grid grid-cols-2 border border-slate-800">
        <div className="border-r border-slate-800"><Block title="SHIPPER INFORMATION" p={s.pickup} /></div>
        <div>
          <div className="p-2 border-b border-slate-800 space-y-0.5"><p className="font-bold">INVOICE</p><p>Invoice No: <b>{d.invoiceNo || '—'}</b></p><p>AWB Number: <b>{awb || 'Pending'}</b></p><p>Invoice Date: <b>{fmtDate(d.invoiceDate)}</b></p>{d.incoterms && <p>Incoterms: {d.incoterms}</p>}{d.exportPurpose && <p>Purpose: {d.exportPurpose}</p>}</div>
          <Block title="CONSIGNEE INFORMATION" p={s.receiver} ids={ids} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border border-t-0 border-slate-800">
          <thead><tr className="border-b border-slate-800 bg-slate-50 text-left"><th className="p-1.5 w-10">QNT</th><th className="p-1.5">Description</th><th className="p-1.5 text-center">HS Code</th><th className="p-1.5 text-center">Unit Cost</th><th className="p-1.5 text-right">Value</th></tr></thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b border-slate-200"><td className="p-1.5">{it.pcs}</td><td className="p-1.5">{it.description}</td><td className="p-1.5 text-center">{it.hsCode || '—'}</td><td className="p-1.5 text-center">{(Number(it.unitCost) || 0).toFixed(2)}</td><td className="p-1.5 text-right">{((Number(it.unitCost) || 0) * (Number(it.pcs) || 0)).toFixed(2)}</td></tr>
            ))}
            {CHARGES.filter(([k]) => Number(d[k]) > 0).map(([k, label]) => (
              <tr key={k}><td colSpan={4} className="p-1.5 text-right text-slate-600">{label}</td><td className="p-1.5 text-right">{k === 'discount' ? '−' : ''}{(Number(d[k]) || 0).toFixed(2)}</td></tr>
            ))}
            <tr className="border-t border-slate-800"><td colSpan={4} className="p-1.5 text-right font-bold">TOTAL ({cur}):</td><td className="p-1.5 text-right font-black">{money(grand)}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="border border-t-0 border-slate-800 p-2 grid grid-cols-2 sm:grid-cols-5 gap-2 avoid-break">
        <p>No. of pieces: <b>{pc.pieces ?? '—'}</b></p>
        <p>Dimensions (cm): <b>{hasDims ? `${pc.lengthCm} × ${pc.widthCm} × ${pc.heightCm}` : '—'}</b></p>
        <p>Gross weight: <b>{gross ? `${gross} kg` : '—'}</b></p>
        <p>Volumetric weight: <b>{vol ? `${vol} kg` : '—'}</b></p>
        <p>Chargeable weight: <b>{chargeable ? `${Number(chargeable).toFixed(2)} kg` : '—'}</b></p>
      </div>
      <div className="border border-t-0 border-slate-800 p-2">
        <p className="font-bold">Additional Comment:</p><p className="text-slate-600 min-h-[14px]">{d.additionalComment || '—'}</p>
        <p className="mt-2 italic text-slate-600">I/we hereby certify that the information contained in this invoice is true and correct and that the contents of the shipment are as stated above.</p>
        <div className="grid grid-cols-2 gap-8 mt-8">
          <div className="border-t border-slate-800 pt-1"><p className="text-slate-500">Shipper signature / stamp</p>{(d.authorisedPerson || d.authorisedTitle) && <p className="text-[10px]">{d.authorisedPerson}{d.authorisedTitle ? `, ${d.authorisedTitle}` : ''}</p>}</div>
        </div>
      </div>
      <DocFooter doc={doc} />
    </div>
  );
};

export default InvoiceBody;