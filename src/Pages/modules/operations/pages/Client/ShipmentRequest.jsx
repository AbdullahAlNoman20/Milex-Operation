// src/Pages/modules/operations/pages/Client/ShipmentRequest.jsx
import { useState, useCallback, useEffect, useMemo, useRef, createContext, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, FileDown, Plane, CheckCircle2, Circle } from 'lucide-react';
import SectionCard from '../../components/SectionCard';
import TermsCheckbox from '../../components/TermsCheckbox';
import Loader from '../../../../../Components/Shared/Loader';
import { PARTY_ADDRESS_FIELDS, PARCEL_DETAIL_FIELDS, PARCEL_EXTRA_FIELDS, SHIPMENT_HEADER_FIELDS, AWB_SHIPMENT_TYPE_OPTIONS, CURRENCY_OPTIONS, TAX_ID_FIELDS, emptyInvoiceItem } from '../../constants/shipmentFields';
import { OPERATIONS_ROLES as R, ROLE_HOME } from '../../constants/operationsRoles';
import { createShipmentDraft } from '../../services/shipmentService';
import { submitDraft } from '../../services/approvalService';
import { fetchClients } from '../../services/clientService';
import { quoteForClient } from '../../services/rateService';
import { countryOptions } from '../../constants/countries';
import InfoTooltip from '../../components/InfoTooltip';
import { volumetricOf, roundRateWeight } from '../../utils/chargeWeight';
import { sameId } from '../../services/serviceUtils';
import { clientDefaults } from '../../utils/clientDefaults';
import { fetchClientDocs, docNumbers } from '../../services/clientDocService';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { isRequired, isValidEmail, isPositiveNumber } from '../../../../../Components/utils/validators';

const IATA = /^[A-Za-z]{3}$/;
const mk = (fields) => Object.fromEntries(fields.map((f) => [f.key, '']));
const HEADER = SHIPMENT_HEADER_FIELDS.filter((f) => f.key !== 'bookingDate');
const PAYMENT = { transportBy: 'Sender', transportAcNo: '', dutiesBy: 'Recipient', dutiesAcNo: '' };
const box = 'w-full border border-slate-300 rounded-lg px-2.5 py-2 text-sm bg-slate-50 focus:border-emerald-500 focus:bg-white outline-none disabled:opacity-60';
const homeRoute = (m) => (m === 'EXPORT'
  ? { originCountry: 'Bangladesh', originCity: 'Dhaka', originAirport: 'DAC', destCountry: '', destCity: '', destAirport: '' }
  : { originCountry: '', originCity: '', originAirport: '', destCountry: 'Bangladesh', destCity: 'Dhaka', destAirport: 'DAC' });

// compact field: label + input (textarea fields become 2-row)
const ErrCtx = createContext(null);
const CountrySelect = ({ value, onChange, disabled, approved = [], invalid = false }) => {
  const { approved: a, others } = countryOptions(approved);
  return (
    <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={`${box} ${invalid ? 'field-error' : ''}`}>
      <option value="">Select country…</option>
      {a.length > 0 && <optgroup label="Approved countries (rate available)">{a.map((o) => <option key={`a-${o}`} value={o}>{o}</option>)}</optgroup>}
      <optgroup label="All countries">{others.map((o) => <option key={o} value={o}>{o}</option>)}</optgroup>
    </select>
  );
};

const Msg = ({ id }) => {
  const e = useContext(ErrCtx);
  return e && e.id === id ? <p role="alert" className="anim-pop mt-1 text-[11px] font-bold text-red-600">⚠ {e.msg}</p> : null;
};

const F = ({ f, value, onChange, disabled, className = '', approved = [], scope = '' }) => {
  const id = `${scope}:${f.key}`;
  const e = useContext(ErrCtx);
  const bad = !!e && e.id === id;
  const cls = `${box} ${bad ? 'field-error' : ''}`;
  return (
    <div className={className} data-fid={id}>
      <label className="flex items-center text-[11px] font-bold text-slate-600 mb-1">{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}<InfoTooltip text={f.help} example={f.placeholder} /></label>
      {f.type === 'country' ? <CountrySelect value={value} disabled={disabled} onChange={onChange} approved={approved} invalid={bad} />
        : f.type === 'textarea' ? <textarea rows={2} value={value} placeholder={f.placeholder} maxLength={500} disabled={disabled} onChange={(ev) => onChange(ev.target.value)} className={cls} />
        : f.type === 'select' ? <select value={value} disabled={disabled} onChange={(ev) => onChange(ev.target.value)} className={cls}><option value="">Select…</option>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
        : <input type={f.type} value={value} placeholder={f.placeholder} maxLength={254} disabled={disabled} onChange={(ev) => onChange(ev.target.value)} className={cls} />}
      <Msg id={id} />
    </div>
  );
};

const Section = ({ id, n, title, accent, right, children }) => (
  <section id={id} className="bg-white rounded-2xl border border-slate-200 scroll-mt-20 anim-fade-up">
    <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100">
      <h2 className="flex items-center gap-2 text-sm font-black text-slate-800"><span className={`w-6 h-6 rounded-full ${accent} text-white text-xs flex items-center justify-center`}>{n}</span>{title}</h2>{right}
    </header>
    <div className="p-4 sm:p-6">{children}</div>
  </section>
);

const partyErr = (p, label, scope = '') => {
  for (const f of PARTY_ADDRESS_FIELDS) {
    if (f.required && !isRequired(p[f.key])) return [`${f.label} is required`, label, `${scope}:${f.key}`];
    if (f.type === 'email' && p[f.key] && !isValidEmail(p[f.key])) return [`${f.label} must be a valid email`, label, `${scope}:${f.key}`];
  }
  return null;
};

const Inner = ({ mode, onReset }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const isClient = currentUser?.role === R.CLIENT;
  const isExport = mode === 'EXPORT';
  const fk = isExport ? 'dest' : 'origin';
  const accent = isExport ? 'bg-emerald-600' : 'bg-blue-600';
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientEmail, setClientEmail] = useState(isClient ? currentUser.email : (new URLSearchParams(window.location.search).get('client') || ''));
  const [header, setHeader] = useState({ refNo: '', costCarriedBy: 'Shipper', requestedPickupDate: '' });
  const [route, setRoute] = useState(() => homeRoute(mode));
  const [pickup, setPickup] = useState(() => mk(PARTY_ADDRESS_FIELDS));
  const [receiver, setReceiver] = useState(() => mk(PARTY_ADDRESS_FIELDS));
  const [taxIds, setTaxIds] = useState({});
  const [parcel, setParcel] = useState(() => ({ ...mk(PARCEL_DETAIL_FIELDS), ...mk(PARCEL_EXTRA_FIELDS) }));
  const [declaredValue, setDeclaredValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [shipmentType, setShipmentType] = useState('NON_DOCUMENT');
  const [items, setItems] = useState([emptyInvoiceItem()]);
  const [comment, setComment] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fieldErr, setFieldErr] = useState(null);
  const [result, setResult] = useState(null);
  const createdRef = useRef(null);

  const client = useMemo(() => clients.find((c) => sameId(c.email, clientEmail)) || null, [clients, clientEmail]);
  const [savedNumbers, setSavedNumbers] = useState({});
  useEffect(() => { if (clientEmail) fetchClientDocs(clientEmail).then((r) => setSavedNumbers(docNumbers(r))).catch(() => {}); }, [clientEmail]);
  const defaults = useMemo(() => clientDefaults(client, savedNumbers), [client, savedNumbers]);
  useEffect(() => { if (!defaults) return; if (isExport) setPickup(defaults.ownParty); else setReceiver(defaults.ownParty); setTaxIds(defaults.taxIds); }, [defaults, isExport]);
  useEffect(() => {
    let a = true;
    fetchClients().then((l) => a && setClients(l)).catch(() => showToast('Failed to load client accounts', 'error')).finally(() => a && setLoading(false));
    return () => { a = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const foreign = route[`${fk}Country`];
  // Chargeable weight = higher of gross and volumetric (L×W×H ÷ 5000 per carton). Rate uses it: 0.5+ rounds up, below 0.5 rounds down.
  const weights = useMemo(() => {
    const gross = Number(parcel.weightKg) || 0;
    const vol = volumetricOf(parcel.lengthCm, parcel.widthCm, parcel.heightCm, Number(parcel.cartons) || 1);
    const chargeable = Math.max(gross, vol);
    return { gross, vol, chargeable: Number(chargeable.toFixed(2)), billed: roundRateWeight(chargeable) };
  }, [parcel.weightKg, parcel.lengthCm, parcel.widthCm, parcel.heightCm, parcel.cartons]);
  const quote = useMemo(() => quoteForClient(client, mode, foreign, weights.chargeable), [client, mode, foreign, weights.chargeable]);
  const countries = defaults?.countries || [];
  const unknownCountry = countries.length > 0 && foreign && !countries.some((c) => sameId(c, foreign));
  const total = items.reduce((s, it) => s + (Number(it.unitCost) || 0) * (Number(it.pcs) || 0), 0);
  const filled = items.filter((i) => i.description);
  const upd = (setter, key) => (v) => { setFieldErr(null); setter((p) => ({ ...p, [key]: v })); };
  const setItem = (i, k, v) => setItems((p) => p.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));
  const rf = (k) => (e) => { setFieldErr(null); setRoute((p) => ({ ...p, [k]: e.target.value })); };

  // returns [message, sectionId] or null
  const firstError = useCallback((submit) => {
    if (!isClient && !isRequired(clientEmail)) return ['Select the Client account', 's-top', 'top:client'];
    for (const f of HEADER) if (f.required && !isRequired(header[f.key])) return [`${f.label} is required`, 's-ship', `head:${f.key}`];
    if (!isRequired(foreign)) return [`${isExport ? 'Destination' : 'Origin'} country is required`, 's-ship', 'route:country'];
    if (!isRequired(route[`${fk}City`])) return ['City is required', 's-ship', 'route:city'];
    if (route[`${fk}Airport`] && !IATA.test(route[`${fk}Airport`])) return ['Airport must be a 3-letter IATA code', 's-ship', 'route:airport'];
    if (sameId(foreign, 'Bangladesh')) return ['The other country must be outside Bangladesh', 's-ship', 'route:country'];
    const pe = partyErr(pickup, isExport ? 'Pickup' : 'Supplier', 'pickup') || partyErr(receiver, 'Receiver', 'receiver');
    if (pe) return [pe[0], 's-party', pe[2]];
    if (!isRequired(parcel.shipmentContents)) return ['Shipment contents is required', 's-goods', 'goods:shipmentContents'];
    for (const [k, l] of [['pieces', 'No. of pieces'], ['weightKg', 'Weight (kg)'], ['cartons', 'No. of cartons']]) if (!isPositiveNumber(parcel[k]) || Number(parcel[k]) <= 0) return [`${l} must be greater than 0`, 's-goods', `goods:${k}`];
    if (!Number.isInteger(Number(parcel.pieces)) || !Number.isInteger(Number(parcel.cartons))) return ['Pieces and cartons must be whole numbers', 's-goods', 'goods:pieces'];
    if (declaredValue !== '' && !isPositiveNumber(declaredValue)) return ['Declared value must be a valid number', 's-goods'];
    if (submit && isExport && filled.length === 0) return ['Add at least one invoice item', 's-invoice'];
    for (const it of filled) { if (!(Number(it.pcs) > 0)) return ['Each invoice item needs PCS above 0', 's-invoice']; if (it.unitCost === '' || !(Number(it.unitCost) >= 0)) return ['Each invoice item needs a unit cost', 's-invoice']; }
    if (submit && !agreed) return ['Please accept the Terms & Conditions', 's-submit'];
    return null;
  }, [isClient, clientEmail, header, foreign, route, fk, isExport, pickup, receiver, parcel, declaredValue, filled, agreed]);

  const checklist = [
    ['Client & reference', (isClient || isRequired(clientEmail)) && HEADER.every((f) => !f.required || isRequired(header[f.key]))],
    [isExport ? 'Destination' : 'Origin', isRequired(foreign) && isRequired(route[`${fk}City`])],
    ['Pickup & receiver', !partyErr(pickup, 'p') && !partyErr(receiver, 'r')],
    ['Goods & weight', isRequired(parcel.shipmentContents) && Number(parcel.pieces) > 0 && Number(parcel.weightKg) > 0 && Number(parcel.cartons) > 0],
    ['Invoice items', !isExport || filled.length > 0],
    ['Terms accepted', agreed],
  ];

  const persist = useCallback(async (submit) => {
    const err = firstError(submit);
    if (err) {
      const id = err[2];
      setFieldErr(id ? { id, msg: err[0] } : null);
      showToast(err[0], 'warning');
      const el = id ? document.querySelector(`[data-fid="${id}"]`) : null;
      (el || document.getElementById(err[1]))?.scrollIntoView({ behavior: 'smooth', block: el ? 'center' : 'start' });
      el?.querySelector('input,select,textarea')?.focus({ preventScroll: true });
      return;
    }
    setBusy(true);
    try {
      if (!createdRef.current) {
        const rec = await createShipmentDraft({ mode, clientEmail, refNo: header.refNo, costCarriedBy: header.costCarriedBy, requestedPickupDate: header.requestedPickupDate, shipmentType, route, pickup, receiver, taxIds, parcel: { ...parcel, declaredValue, currency }, packaging: 'Carton', services: [], payment: { ...PAYMENT }, invoiceItems: filled, invoiceComment: comment, termsAccepted: agreed }, currentUser);
        createdRef.current = rec.shipmentId;
      }
      const id = createdRef.current;
      let note = 'Saved as a draft. Open it from Shipments to continue.';
      if (submit) {
        if (!isClient && !isExport) note = 'Saved as a draft. The Client must confirm the data before the import request can go to the Operations Head.';
        else { await submitDraft(id, currentUser); note = isExport ? 'Booking submitted. The Operations Supervisor will assign a Courier Man to collect the parcel.' : isClient ? 'Import request submitted to the Operations Supervisor. After the check it goes to the Operations Head for approval.' : 'Import request submitted to the Operations Head.'; }
      }
      setResult({ id, note, submitted: submit });
      showToast(submit ? 'Submitted successfully' : 'Draft saved');
    } catch (e) { showToast(e?.message || 'Failed to save the shipment', 'error'); } finally { setBusy(false); }
  }, [firstError, showToast, mode, clientEmail, header, shipmentType, route, pickup, receiver, taxIds, parcel, declaredValue, currency, filled, comment, agreed, currentUser, isClient, isExport]);

  if (loading) return <Loader label="Loading..." />;
  if (result) {
    const sid = encodeURIComponent(result.id);
    return (
      <SectionCard title={result.submitted ? 'Request Submitted' : 'Draft Saved'}>
        <p className="text-sm text-slate-600">Shipment ID: <b className="text-emerald-700">{result.id}</b></p>
        <p className="text-sm text-slate-500 mt-1">{result.note}</p>
        <p className="text-xs text-slate-500 mt-3 mb-4">Documents were created from this form. The Commercial Invoice is complete; the others finish when Operations fills the remaining details.</p>
        <div className="flex flex-wrap gap-3">
          <Link to={`${ROLE_HOME[currentUser.role]}/shipments/${sid}`} className="bg-emerald-600 text-white text-sm font-bold px-4 py-2.5 rounded-lg">Open Shipment</Link>
          {filled.length > 0 && <Link to={`/operations/documents/invoice/${sid}?download=1`} className="flex items-center gap-2 bg-slate-800 text-white text-sm font-bold px-4 py-2.5 rounded-lg"><FileDown size={16} /> Download Invoice</Link>}
          <button type="button" onClick={onReset} className="text-sm font-bold text-slate-500">+ Create another</button>
        </div>
      </SectionCard>
    );
  } 

  return (
    <ErrCtx.Provider value={fieldErr}>
    <div className="w-full space-y-4">
      <div id="s-top" className={`rounded-2xl ${accent} text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center gap-3"><Plane size={22} /><div><h1 className="text-base font-black">{isExport ? 'New Export Booking' : 'New Import Request'}</h1><p className="text-[11px] opacity-90">{isExport ? 'Bangladesh → overseas' : 'Overseas → Bangladesh'} · one page, documents are created automatically</p></div></div>
        {!isClient && (
          <select value={clientEmail} disabled={busy} onChange={(e) => setClientEmail(e.target.value)} className="text-sm text-slate-800 rounded-lg px-3 py-2 bg-white w-full sm:w-72"><option value="">Select Client account…</option>{clients.map((c) => <option key={c.id} value={c.email}>{c.accountName}</option>)}</select>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-4 min-w-0">
          <Section id="s-ship" n={1} title="Shipment & Route" accent={accent} right={
            <div className="flex gap-3">{AWB_SHIPMENT_TYPE_OPTIONS.map((o) => <label key={o} className="flex items-center gap-1 text-xs font-semibold text-slate-600"><input type="radio" className="accent-emerald-600" checked={shipmentType === o} disabled={busy} onChange={() => setShipmentType(o)} />{o.replace('_', '-')}</label>)}</div>}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
              {HEADER.map((f) => <F key={f.key} scope="head" f={f} value={header[f.key]} disabled={busy} onChange={upd(setHeader, f.key)} className="col-span-1" />)}
              <div className="col-span-1"><label className="block text-[11px] font-bold text-slate-600 mb-1">{isExport ? 'From' : 'To'}</label><input disabled value={isExport ? 'Dhaka, Bangladesh (DAC)' : 'Dhaka, Bangladesh (DAC)'} className={`${box} bg-slate-100`} /></div>
              <div className="col-span-1 sm:col-span-2" data-fid="route:country"><label className="flex items-center text-[11px] font-bold text-slate-600 mb-1">{isExport ? 'Destination' : 'Origin'} country <span className="text-red-500 ml-0.5">*</span><InfoTooltip text={isExport ? 'Country the parcel is going to. Countries with an approved rate for your account are listed first — the rate is filled in automatically.' : 'Country the parcel is coming from. Countries with an approved rate for your account are listed first.'} example={isExport ? 'United Kingdom' : 'China'} /></label><CountrySelect value={foreign} disabled={busy} approved={countries} invalid={fieldErr?.id === 'route:country'} onChange={(v) => { setFieldErr(null); setRoute((p) => ({ ...p, [`${fk}Country`]: v })); }} /><Msg id="route:country" /></div>
              <div className="col-span-1" data-fid="route:city"><label className="block text-[11px] font-bold text-slate-600 mb-1">City <span className="text-red-500">*</span></label><input disabled={busy} value={route[`${fk}City`]} maxLength={60} placeholder={isExport ? 'London' : 'Guangzhou'} onChange={rf(`${fk}City`)} className={`${box} ${fieldErr?.id === 'route:city' ? 'field-error' : ''}`} /><Msg id="route:city" /></div>
              <div className="col-span-1" data-fid="route:airport"><label className="block text-[11px] font-bold text-slate-600 mb-1">Airport (IATA)</label><input disabled={busy} value={route[`${fk}Airport`]} maxLength={3} placeholder="LHR" onChange={(e) => { setFieldErr(null); setRoute((p) => ({ ...p, [`${fk}Airport`]: e.target.value.toUpperCase() })); }} className={`${box} ${fieldErr?.id === 'route:airport' ? 'field-error' : ''}`} /><Msg id="route:airport" /></div>
            </div>
            {unknownCountry && <p className="anim-pop mt-3 text-xs bg-amber-50 border-2 border-amber-300 text-amber-800 rounded-lg p-3 font-semibold">No approved rate for “{foreign}” yet. You can still book — a request is created automatically, goes to your KAM, and the Operations Head is notified. You will see it in your profile.</p>}
          </Section>

          <Section id="s-party" n={2} title="Parties" accent={accent}>
            <div className="grid grid-cols-1 gap-6">
              {[[isExport ? 'Pickup / Shipper' : 'Supplier (overseas)', pickup, setPickup], [isExport ? 'Receiver (overseas)' : 'Receiver (Bangladesh)', receiver, setReceiver]].map(([title, st, setter]) => (
                <div key={title} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[11px] font-black uppercase text-slate-500 mb-2">{title}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                    {PARTY_ADDRESS_FIELDS.map((f) => <F key={f.key} scope={st === pickup ? 'pickup' : 'receiver'} f={f} value={st[f.key]} disabled={busy} onChange={upd(setter, f.key)} className={['companyName', 'address', 'contactEmail'].includes(f.key) ? 'col-span-2' : ''} />)}
                  </div>
                </div>))}
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 p-3">
              <p className="text-[11px] font-black uppercase text-slate-500 mb-1">Your registration numbers</p>
              <p className="text-[11px] text-slate-400 mb-2">Filled from your profile. A number you type here is saved to your profile and used in every document.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                {TAX_ID_FIELDS.map((f) => <F key={f.key} scope="tax" f={f} value={taxIds[f.key] || ''} disabled={busy} onChange={(v) => { setFieldErr(null); setTaxIds((p) => ({ ...p, [f.key]: v })); }} />)}
              </div>
            </div>
          </Section>

          <Section id="s-goods" n={3} title="Goods" accent={accent}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
              <F scope="goods" f={PARCEL_DETAIL_FIELDS[0]} value={parcel.shipmentContents} disabled={busy} onChange={upd(setParcel, 'shipmentContents')} className="col-span-1" />
              {PARCEL_DETAIL_FIELDS.slice(1, 4).map((f) => <F key={f.key} scope="goods" f={f} value={parcel[f.key]} disabled={busy} onChange={upd(setParcel, f.key)} />)}
              <div><label className="block text-[11px] font-bold text-slate-600 mb-1">Declared value</label><div className="flex gap-1"><input type="number" min="0" step="0.01" disabled={busy} value={declaredValue} onChange={(e) => setDeclaredValue(e.target.value)} className={box} /><select value={currency} disabled={busy} onChange={(e) => setCurrency(e.target.value)} className="border border-slate-300 rounded-lg px-1 text-xs bg-slate-50">{CURRENCY_OPTIONS.map((c) => <option key={c}>{c}</option>)}</select></div></div>
              <F scope="goods" f={PARCEL_DETAIL_FIELDS[4]} value={parcel.remarks} disabled={busy} onChange={upd(setParcel, 'remarks')} className="col-span-1 sm:col-span-2" />
              {PARCEL_EXTRA_FIELDS.map((f) => <F key={f.key} scope="goods" f={f} value={parcel[f.key]} disabled={busy} onChange={upd(setParcel, f.key)} />)}
            </div>
          </Section>

          <Section id="s-invoice" n={4} title="Commercial Invoice" accent={accent} right={<button type="button" disabled={busy} onClick={() => setItems((p) => [...p, emptyInvoiceItem()])} className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"><Plus size={14} /> Add item</button>}>
            <div className="hidden sm:grid grid-cols-12 gap-2 text-[10px] font-black uppercase text-slate-400 px-1 mb-1"><span className="col-span-5">Description</span><span className="col-span-2">HS code</span><span className="col-span-1">PCS</span><span className="col-span-2">Unit cost</span><span className="col-span-1 text-right">Value</span><span /></div>
            <div className="space-y-2">{items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-6 sm:grid-cols-12 gap-2 items-center">
                <input placeholder="Description" disabled={busy} value={it.description} maxLength={200} onChange={(e) => setItem(idx, 'description', e.target.value)} className={`${box} col-span-6 sm:col-span-5`} />
                <input placeholder="HS code" disabled={busy} value={it.hsCode} maxLength={20} onChange={(e) => setItem(idx, 'hsCode', e.target.value)} className={`${box} col-span-2`} />
                <input type="number" min="0" placeholder="PCS" disabled={busy} value={it.pcs} onChange={(e) => setItem(idx, 'pcs', e.target.value)} className={`${box} col-span-2 sm:col-span-1`} />
                <input type="number" min="0" step="0.01" placeholder="Unit cost" disabled={busy} value={it.unitCost} onChange={(e) => setItem(idx, 'unitCost', e.target.value)} className={`${box} col-span-2`} />
                <p className="col-span-1 text-right text-sm font-bold text-slate-700">{((Number(it.unitCost) || 0) * (Number(it.pcs) || 0)).toFixed(2)}</p>
                <button type="button" aria-label="Remove item" disabled={busy || items.length === 1} onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} className="col-span-1 text-red-500 disabled:opacity-30 flex justify-center"><Trash2 size={16} /></button>
              </div>))}</div>
            <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-100">
              <input placeholder="Additional comment (optional)" disabled={busy} value={comment} maxLength={500} onChange={(e) => setComment(e.target.value)} className={`${box} flex-1 min-w-[200px]`} />
              <p className="text-sm font-black text-slate-800">TOTAL {currency} {total.toFixed(2)}</p>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">{isExport ? 'Required for an export booking — downloadable right after you submit.' : 'Optional for imports.'}</p>
          </Section>
        </div>

        <aside id="s-submit" className="space-y-3 max-w-3xl">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-black text-slate-500 uppercase mb-2">Summary</p>
            <p className="text-sm font-black text-slate-800">{isExport ? 'Dhaka' : route.originCity || '—'} → {isExport ? route.destCity || '—' : 'Dhaka'}</p>
            <p className="text-xs text-slate-500">{client?.accountName || (isClient ? currentUser.name : 'No client selected')}</p>
            <div className="grid grid-cols-3 gap-2 text-center my-3">
              {[['Pieces', parcel.pieces || '—'], ['Gross kg', parcel.weightKg || '—'], ['Cartons', parcel.cartons || '—']].map(([l, v]) => <div key={l} className="bg-slate-50 rounded-lg py-2"><p className="text-sm font-black text-slate-800">{v}</p><p className="text-[10px] text-slate-400">{l}</p></div>)}
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs mb-3 space-y-1">
              <p className="flex justify-between"><span className="text-slate-500">Gross weight</span><b>{weights.gross || '—'} kg</b></p>
              <p className="flex justify-between"><span className="text-slate-500">Volumetric weight</span><b>{weights.vol || '—'} kg</b></p>
              <p className="flex justify-between border-t border-slate-200 pt-1"><span className="text-slate-700 font-bold">Chargeable weight</span><b className="text-emerald-700">{weights.chargeable || '—'} kg</b></p>
              <p className="flex justify-between"><span className="text-slate-500">Rate billed on</span><b>{weights.billed || '—'} kg</b></p>
              <p className="text-[10px] text-slate-400 leading-snug">Chargeable = the higher of gross and volumetric (L×W×H÷5000, all cartons). Fraction 0.5 or more rounds up; below 0.5 rounds down.</p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm">
              <p className="text-[10px] font-bold text-emerald-700 uppercase">Estimated charge</p>
              {quote.found ? <><p className="text-xl font-black text-emerald-800">{quote.currency} {quote.amount}</p><p className="text-[10px] text-emerald-700">{quote.baseCharge ? `${quote.baseCharge} + ` : ''}{quote.perKg}/kg × {quote.billedKg} kg · {quote.version}</p></> : <p className="text-xs text-slate-500">To be quoted by Operations</p>}
            </div>
            <p className="text-xs text-slate-500 mt-2">Invoice total: <b>{currency} {total.toFixed(2)}</b></p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <p className="text-xs font-black text-slate-500 uppercase mb-2">Checklist</p>
            <ul className="space-y-1">{checklist.map(([l, ok]) => <li key={l} className={`flex items-center gap-2 text-xs font-semibold ${ok ? 'text-emerald-700' : 'text-slate-400'}`}>{ok ? <CheckCircle2 size={14} /> : <Circle size={14} />}{l}</li>)}</ul>
            <div className="mt-3"><TermsCheckbox checked={agreed} onChange={setAgreed} disabled={busy} /></div>
            {!isClient && <p className="mt-3 text-[11px] bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-2 font-semibold">Drafted for the Client — they must confirm it before Head approval.</p>}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button type="button" disabled={busy} onClick={() => persist(false)} className="text-xs font-bold border border-slate-300 text-slate-700 rounded-lg py-2.5 hover:bg-slate-50 disabled:opacity-50">{busy ? 'Saving…' : 'Save Draft'}</button>
              <button type="button" disabled={busy} onClick={() => persist(true)} className={`text-xs font-bold text-white rounded-lg py-2.5 ${accent} hover:opacity-90 disabled:opacity-50`}>{busy ? 'Submitting…' : 'Submit'}</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
    </ErrCtx.Provider>
  );
};

const ShipmentRequest = ({ mode = 'EXPORT' }) => {
  const [k, setK] = useState(0);
  return <Inner key={`${mode}-${k}`} mode={mode === 'IMPORT' ? 'IMPORT' : 'EXPORT'} onReset={() => setK((n) => n + 1)} />;
};

export default ShipmentRequest;
