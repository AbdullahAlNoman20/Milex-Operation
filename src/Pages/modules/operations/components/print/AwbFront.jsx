// src/Pages/modules/operations/components/print/AwbFront.jsx
// Front of one AWB copy — layout follows the MILEX International Air Waybill (sections 01–10).
import Barcode from './Barcode';
import { Watermark, Check, BarHead } from './PrintStates';
import { fmtDate } from '../../utils/printFormat';

const Party = ({ p = {}, ids }) => (
  <div className="p-2 space-y-0.5 text-[11px]">
    <p className="font-bold text-[12px]">{p.companyName || '—'}</p>
    {p.contactPerson && <p>Attn: {p.contactPerson}</p>}
    <p>{p.address || '—'}</p>
    <p>{[p.city, p.postCode].filter(Boolean).join(' ')}</p>
    <p>{p.country}</p>
    <p>Phone: {p.contactPhone || '—'}</p>
    <p>Email: {p.contactEmail || '—'}</p>
    {ids}
  </div>
);

const AwbFront = ({ shipment: s, doc, copyType }) => {
  const d = doc?.data || {};
  const p = s.payment || {};
  const pc = s.parcel || {};
  const number = d.awbNumber || s.awbNumber || s.mawb?.mawbNumber || '';
  const dims = [pc.lengthCm, pc.widthCm, pc.heightCm].every(Boolean) ? `${pc.lengthCm}×${pc.widthCm}×${pc.heightCm} cm` : '—';
  const tax = s.taxIds || {};
  const idLines = (
    <>
      {tax.eori && <p>EORI: {tax.eori}</p>}
      {tax.vat && <p>VAT: {tax.vat}</p>}
      {tax.bin && <p>BIN: {tax.bin}</p>}
    </>
  );

  return (
    <div className="relative text-[11px]">
      <Watermark text={d.state === 'FINAL' ? '' : 'DRAFT'} />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-slate-800 pb-2 mb-2">
          <div><p className="text-base font-black tracking-wide">INTERNATIONAL AIR WAYBILL</p><p className="text-[10px] text-slate-500">MILEX Air — Non-negotiable · Shipment {s.shipmentId}</p></div>
          <div className="text-center">
            <p className="inline-block bg-emerald-700 text-white text-[11px] font-black px-3 py-1 tracking-widest print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]">{copyType.toUpperCase()} COPY</p>
          </div>
          <div className="text-right">
            {number ? <Barcode value={number} height={36} /> : <p className="text-[11px] font-bold text-slate-400">AWB number pending carrier assignment</p>}
          </div>
        </div>

        <div className="flex justify-between mb-2"><p>Date: <b>{fmtDate(s.bookingDate)}</b></p><p>Sender's A/C No: <b>{d.senderAcNo || '—'}</b></p><p>Ref: <b>{s.refNo || '—'}</b></p></div>

        <div className="grid grid-cols-2 border border-slate-800 mb-2">
          <div className="border-r border-slate-800"><BarHead>01 Sender</BarHead><Party p={s.pickup} /></div>
          <div><BarHead>02 Recipient</BarHead><Party p={s.receiver} ids={idLines} /></div>
        </div>

        <div className="border border-slate-800 p-2 mb-2">
          <p className="font-bold mb-1">03 SHIPMENT INFORMATION</p>
          <div className="flex flex-wrap items-center gap-y-1">
            <Check label="Document" checked={s.shipmentType === 'DOCUMENT'} /><Check label="Non-Document" checked={s.shipmentType !== 'DOCUMENT'} />
            <span className="mr-4">No. of Pcs: <b>{pc.pieces ?? '—'}</b></span>
            <span className="mr-4">Origin: <b>{s.route?.originAirport || s.route?.originCity || '—'}</b></span>
            <span>Destination: <b>{s.route?.destAirport || s.route?.destCity || '—'}</b></span>
          </div>
        </div>

        <div className="border border-slate-800 mb-2">
          <BarHead>04 Description of Content</BarHead>
          <table className="w-full">
            <thead><tr className="border-b border-slate-300 text-left text-[10px]"><th className="p-1.5">Description</th><th className="p-1.5">Dimensions (L×W×H)</th><th className="p-1.5 text-center">Qty</th><th className="p-1.5 text-center">Gross kg</th><th className="p-1.5 text-center">Volumetric kg</th><th className="p-1.5 text-center">Chargeable kg</th><th className="p-1.5 text-center">Value</th><th className="p-1.5 text-center">Cur.</th></tr></thead>
            <tbody><tr>
              <td className="p-1.5">{pc.shipmentContents || '—'}</td><td className="p-1.5">{dims}</td><td className="p-1.5 text-center">{pc.pieces ?? '—'}</td>
              <td className="p-1.5 text-center">{pc.weightKg ?? '—'}</td><td className="p-1.5 text-center">{pc.volumetricKg ?? '—'}</td><td className="p-1.5 text-center">{pc.chargeableKg ?? '—'}</td>
              <td className="p-1.5 text-center">{pc.declaredValue ?? '—'}</td><td className="p-1.5 text-center">{pc.currency || '—'}</td>
            </tr></tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="border border-slate-800 p-2"><p className="font-bold mb-1">07 PAYMENT — TRANSPORTATION CHARGES TO</p>
            <div className="flex flex-wrap">{['Sender', 'Recipient', 'Third Party'].map((o) => <Check key={o} label={o} checked={p.transportBy === o} />)}</div>
            <p className="text-slate-500 mt-1">A/C No: {p.transportAcNo || '—'}</p></div>
          <div className="border border-slate-800 p-2"><p className="font-bold mb-1">08 PAYMENT — DUTIES & TAXES TO</p>
            <div className="flex flex-wrap">{['Sender', 'Recipient', 'Third Party'].map((o) => <Check key={o} label={o} checked={p.dutiesBy === o} />)}</div>
            <p className="text-slate-500 mt-1">A/C No: {p.dutiesAcNo || '—'}</p></div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="border border-slate-800 p-2"><p className="font-bold mb-1">09 PACKAGING</p><div className="flex flex-wrap">{['Envelope', 'Pouch', 'Carton'].map((o) => <Check key={o} label={o} checked={s.packaging === o} />)}</div></div>
          <div className="border border-slate-800 p-2"><p className="font-bold mb-1">10 SERVICES</p><div className="flex flex-wrap">{['Express', 'Premium', 'Special', 'e-Parcel'].map((o) => <Check key={o} label={o} checked={(s.services || []).includes(o)} />)}</div></div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="border border-slate-800 p-2"><p className="font-bold mb-1">05 SENDER'S AGREEMENT</p>
            <Check label={d.termsAccepted ? `Terms and Conditions accepted (${d.termsVersion || 'v1'}) — see reverse` : 'Terms and Conditions — not yet accepted'} checked={!!d.termsAccepted} />
            <div className="grid grid-cols-2 gap-3 mt-5"><p className="border-t border-slate-700 pt-1 text-[9px] text-slate-500">Sender's signature</p><p className="border-t border-slate-700 pt-1 text-[9px] text-slate-500">Date / Time</p></div>
          </div>
          <div className="border border-slate-800 p-2"><p className="font-bold mb-1">06 INTERNAL REFERENCE</p><p>{d.internalReference || s.refNo || '—'}</p>
            <p className="mt-1 text-slate-600">Picked up by: <b>{d.pickedUpBy || '—'}</b> · Received by: <b>{d.receivedBy || '—'}</b></p>
            <div className="grid grid-cols-2 gap-3 mt-3"><p className="border-t border-slate-700 pt-1 text-[9px] text-slate-500">Received in good condition — signature</p><p className="border-t border-slate-700 pt-1 text-[9px] text-slate-500">Date / Time</p></div>
          </div>
        </div>
        <p className="text-center text-[9px] text-slate-400 mt-3 font-bold uppercase tracking-wide">MILEX Air — Non-Negotiable at Owner's Risk · info@milexair.com · www.milexair.com</p>
      </div>
    </div>
  );
};

export default AwbFront;