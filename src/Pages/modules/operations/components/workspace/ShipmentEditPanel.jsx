// src/Pages/modules/operations/components/workspace/ShipmentEditPanel.jsx
// Edit shipment data before Head approval. Client edit = confirmation; Supervisor edit resets Client confirmation to PENDING.
import { useState } from 'react';
import SectionCard from '../SectionCard';
import FormField from '../FormField';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { updateShipmentData } from '../../services/shipmentService';
import { PARTY_ADDRESS_FIELDS, TAX_ID_FIELDS, ROUTE_FIELDS, PARCEL_DETAIL_FIELDS, PARCEL_EXTRA_FIELDS, SHIPMENT_HEADER_FIELDS, CURRENCY_OPTIONS } from '../../constants/shipmentFields';
import { OPERATIONS_ROLES as R } from '../../constants/operationsRoles';
import { isRequired, isValidEmail } from '../../../../../Components/utils/validators';

const str = (o = {}, fields) => Object.fromEntries(fields.map((f) => [f.key, o[f.key] ?? '']));
const checkParty = (p, label) => {
  for (const f of PARTY_ADDRESS_FIELDS) {
    if (f.required && !isRequired(p[f.key])) return `${label}: ${f.label} is required`;
    if (f.type === 'email' && p[f.key] && !isValidEmail(p[f.key])) return `${label}: ${f.label} must be a valid email`;
  }
  return null;
};

const ShipmentEditPanel = ({ shipment: s, onChanged }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const role = currentUser.role;
  const g1 = s.gates?.GATE_1?.status;
  const editable = [R.CLIENT, R.DOMESTIC_ADMIN].includes(role) && ['DRAFT', 'BOOKED'].includes(s.statusCode) && !['APPROVED', 'PENDING'].includes(g1);
  const [d, setD] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!editable) return null;
  const correction = s.clientConfirmation?.status === 'CORRECTION_REQUESTED';

  const open = () => setD({
    header: { ...str(s, SHIPMENT_HEADER_FIELDS) }, route: str(s.route, ROUTE_FIELDS), pickup: str(s.pickup, PARTY_ADDRESS_FIELDS), receiver: str(s.receiver, PARTY_ADDRESS_FIELDS),
    taxIds: str(s.taxIds, TAX_ID_FIELDS), parcel: { ...str(s.parcel, PARCEL_DETAIL_FIELDS), ...str(s.parcel, PARCEL_EXTRA_FIELDS), declaredValue: s.parcel?.declaredValue ?? '', currency: s.parcel?.currency || 'USD' },
  });
  const upd = (group) => (key) => (v) => setD((p) => ({ ...p, [group]: { ...p[group], [key]: v } }));

  const save = async () => {
    const err = checkParty(d.pickup, 'Pickup') || checkParty(d.receiver, 'Receiver')
      || (!isRequired(d.parcel.shipmentContents) && 'Shipment Contents is required')
      || (!(Number(d.parcel.pieces) > 0) && 'No. of Pieces must be greater than 0') || (!(Number(d.parcel.weightKg) > 0) && 'Weight must be greater than 0')
      || (!(Number(d.parcel.cartons) > 0) && 'No. of Cartons must be greater than 0')
      || (d.parcel.declaredValue !== '' && !(Number(d.parcel.declaredValue) >= 0) && 'Declared value must be a valid number')
      || (!isRequired(d.route.originCountry) && 'Origin country is required') || (!isRequired(d.route.destCountry) && 'Destination country is required')
      || (!isRequired(d.header.refNo) && 'Client Ref / PO is required');
    if (err) return showToast(err, 'warning');
    setBusy(true);
    try {
      await updateShipmentData(s.shipmentId, { ...d.header, route: d.route, pickup: d.pickup, receiver: d.receiver, taxIds: d.taxIds, parcel: d.parcel }, currentUser);
      showToast(role === R.CLIENT ? 'Changes saved and confirmed' : 'Changes saved — the Client must confirm again');
      setD(null); onChanged?.();
    } catch (e) { showToast(e?.message || 'Failed to save', 'error'); } finally { setBusy(false); }
  };

  return (
    <SectionCard title="Edit Shipment Data" subtitle="Editable until the Operations Head approves the booking.">
      {correction && <p className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-2.5 mb-3 font-semibold">Client requested a correction: {s.clientConfirmation.comment}</p>}
      {!d ? <button type="button" onClick={open} className="text-xs font-bold bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition">Edit Data</button> : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{SHIPMENT_HEADER_FIELDS.map((f) => <FormField key={f.key} field={f} value={d.header[f.key]} disabled={busy} onChange={upd('header')(f.key)} />)}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{ROUTE_FIELDS.map((f) => <FormField key={f.key} field={f} value={d.route[f.key]} disabled={busy} onChange={upd('route')(f.key)} />)}</div>
          <p className="text-xs font-black text-slate-600 uppercase">{s.mode === 'EXPORT' ? 'Pickup / Shipper' : 'Supplier'}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{PARTY_ADDRESS_FIELDS.map((f) => <FormField key={f.key} field={f} value={d.pickup[f.key]} disabled={busy} onChange={upd('pickup')(f.key)} />)}</div>
          <p className="text-xs font-black text-slate-600 uppercase">Receiver</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{PARTY_ADDRESS_FIELDS.map((f) => <FormField key={f.key} field={f} value={d.receiver[f.key]} disabled={busy} onChange={upd('receiver')(f.key)} />)}</div>
          <p className="text-xs font-black text-slate-600 uppercase">Parcel</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...PARCEL_DETAIL_FIELDS, ...PARCEL_EXTRA_FIELDS].map((f) => <FormField key={f.key} field={f} value={d.parcel[f.key]} disabled={busy} onChange={upd('parcel')(f.key)} />)}
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Declared Value</label><input type="number" min="0" step="0.01" disabled={busy} value={d.parcel.declaredValue} onChange={(e) => upd('parcel')('declaredValue')(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none" /></div>
            <div><label className="block text-xs font-bold text-slate-700 mb-1">Currency</label><select disabled={busy} value={d.parcel.currency} onChange={(e) => upd('parcel')('currency')(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 outline-none">{CURRENCY_OPTIONS.map((c) => <option key={c}>{c}</option>)}</select></div>
          </div>
          <p className="text-xs font-black text-slate-600 uppercase">Tax / customs identifiers</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{TAX_ID_FIELDS.map((f) => <FormField key={f.key} field={f} value={d.taxIds[f.key]} disabled={busy} onChange={upd('taxIds')(f.key)} />)}</div>
          <div className="flex gap-3">
            <button type="button" disabled={busy} onClick={save} className="text-xs font-bold bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">{busy ? 'Saving...' : 'Save Changes'}</button>
            <button type="button" disabled={busy} onClick={() => setD(null)} className="text-xs font-bold text-slate-500 hover:text-slate-700">Cancel</button>
          </div>
        </div>
      )}
    </SectionCard>
  );
};

export default ShipmentEditPanel;