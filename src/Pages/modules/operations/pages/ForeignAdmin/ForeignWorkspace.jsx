// src/Pages/modules/operations/pages/ForeignAdmin/ForeignWorkspace.jsx
// Foreign Operations Supervisor workspace — fully translatable (EN / 中文). Official documents stay in English templates.
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import SectionCard from '../../components/SectionCard';
import Chip, { toneForStatus } from '../../components/Chip';
import WaitingForBadge from '../../components/WaitingForBadge';
import StatusTimeline from '../../components/StatusTimeline';
import HorizontalStageTracker from '../../components/HorizontalStageTracker';
import OriginStagePanel from '../../components/workspace/OriginStagePanel';
import Field, { inp } from '../../components/Field';
import Loader from '../../../../../Components/Shared/Loader';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useDataVersion } from '../../hooks/useDataVersion';
import { useShipment } from '../../hooks/useShipment';
import { useToast } from '../../../../../Components/hooks/useToast';
import { fetchStatusLogsByShipment } from '../../services/statusLogService';
import { fetchEvidenceByShipment, addEvidence } from '../../services/evidenceService';
import { fetchLatestDocuments } from '../../services/documentService';
import { fetchManifestsForShipment } from '../../services/manifestService';
import { fetchTrackingEvents } from '../../services/trackingService';
import { canSeeDocumentPack } from '../../services/accessService';
import { prepareFile } from '../../services/fileService';
import { getSequence, getStatusIndex } from '../../constants/shipmentStatus';
import { EVIDENCE_RESULTS } from '../../constants/shipmentFields';
import { openDataUrl } from '../../utils/openFile';

const EVIDENCE_TYPES_FOREIGN = ['ORIGIN_EXPORT_CLEARANCE', 'SECURITY_ACCEPTANCE', 'HANDOVER'];
const DOC_ROUTE = { INVOICE: 'invoice', PACKING_LIST: 'packing-list', DECLARATION: 'declaration', LABEL: 'label', AWB: 'awb' };
const blank = { eventType: 'ORIGIN_EXPORT_CLEARANCE', result: 'SUBMITTED', authority: '', reference: '', eventAt: '', location: '', holdReason: '' };

const EvidenceTab = ({ s }) => {
  const { currentUser } = useOperationsAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const version = useDataVersion();
  const [list, setList] = useState([]);
  const [f, setF] = useState(blank);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const load = useCallback(async () => { setList(await fetchEvidenceByShipment(s.shipmentId)); }, [s.shipmentId]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load, version]);

  const pick = async (e) => {
    const x = e.target.files?.[0];
    e.target.value = '';
    if (!x) return;
    try { setFile(await prepareFile(x)); } catch (err) { showToast(err.message, 'warning'); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await addEvidence({ shipmentId: s.shipmentId, ...f, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', file }, currentUser);
      showToast(t('msg.saved'));
      setF(blank); setFile(null); load();
    } catch (err) { showToast(err?.message || t('msg.failed'), 'error'); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      {s.statusCode !== 'CLOSED' && (
        <SectionCard title={t('foreign.evidence.title')} subtitle={t('foreign.evidence.subtitle')}>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('foreign.evidence.type')} required><select disabled={busy} value={f.eventType} onChange={set('eventType')} className={inp}>{EVIDENCE_TYPES_FOREIGN.map((k) => <option key={k} value={k}>{t(`evidence.${k}`)}</option>)}</select></Field>
            <Field label={t('foreign.evidence.result')} required><select disabled={busy} value={f.result} onChange={set('result')} className={inp}>{EVIDENCE_RESULTS.map((r) => <option key={r} value={r}>{t(`evidenceResult.${r}`)}</option>)}</select></Field>
            <Field label={t('foreign.evidence.authority')}><input disabled={busy} value={f.authority} maxLength={150} onChange={set('authority')} className={inp} /></Field>
            <Field label={t('foreign.evidence.reference')}><input disabled={busy} value={f.reference} maxLength={100} onChange={set('reference')} className={inp} /></Field>
            <Field label={t('foreign.evidence.eventAt')} required><input type="datetime-local" disabled={busy} value={f.eventAt} onChange={set('eventAt')} className={inp} /></Field>
            <Field label={t('foreign.evidence.location')}><input disabled={busy} value={f.location} maxLength={150} onChange={set('location')} className={inp} /></Field>
            {f.result === 'ON_HOLD' && <Field label={t('foreign.evidence.holdReason')} required className="sm:col-span-2"><input disabled={busy} value={f.holdReason} maxLength={300} onChange={set('holdReason')} className={inp} /></Field>}
            <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3">
              <label className="text-xs font-bold text-emerald-600 cursor-pointer">{file ? `${t('foreign.evidence.attached')} ${file.name}` : t('foreign.evidence.file')}<input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={pick} /></label>
              <button type="submit" disabled={busy} className="text-xs font-bold bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">{busy ? '...' : t('foreign.evidence.save')}</button>
            </div>
          </form>
        </SectionCard>
      )}
      <SectionCard title={t('foreign.evidence.log')}>
        {list.length === 0 ? <p className="text-sm text-slate-400">{t('foreign.evidence.none')}</p> : list.map((e) => (
          <div key={e.id} className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-50 py-2.5 last:border-b-0">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-700">{t(`evidence.${e.eventType}`, e.eventType)}{e.reference ? ` · ${e.reference}` : ''}</p>
              <p className="text-[10px] text-slate-400">{e.authority || '—'} · {new Date(e.eventAt).toLocaleString()} · {e.uploadedBy}</p>
              {e.holdReason && <p className="text-[11px] text-red-600 font-semibold">{e.holdReason}</p>}
              {e.file && <button type="button" onClick={() => openDataUrl(e.file, () => showToast(t('msg.failed'), 'warning'))} className="text-[11px] font-bold text-emerald-600 hover:underline">{e.file.name}</button>}
              {e.verification?.status === 'REJECTED' && e.verification.comment && <p className="text-[11px] text-red-600">{e.verification.comment}</p>}
            </div>
            <div className="flex gap-1.5"><Chip tone={toneForStatus(e.result)}>{t(`evidenceResult.${e.result}`, e.result)}</Chip><Chip tone={toneForStatus(e.verification?.status)}>{t(`verification.${e.verification?.status}`, e.verification?.status)}</Chip></div>
          </div>))}
      </SectionCard>
    </div>
  );
};

const DocsTab = ({ s }) => {
  const { currentUser } = useOperationsAuth();
  const { t } = useLanguage();
  const version = useDataVersion();
  const [docs, setDocs] = useState({});
  const [manifests, setManifests] = useState([]);
  const allowed = canSeeDocumentPack(currentUser, s);

  useEffect(() => {
    let alive = true;
    if (!allowed) return undefined;
    Promise.all([fetchLatestDocuments(s.shipmentId), fetchManifestsForShipment(s.shipmentId)]).then(([d, m]) => { if (alive) { setDocs(d); setManifests(m.filter((x) => ['APPROVED', 'FINAL'].includes(x.status))); } });
    return () => { alive = false; };
  }, [s.shipmentId, version, allowed]);

  const id = encodeURIComponent(s.shipmentId);
  const Row = ({ label, sub, to }) => (
    <div className="flex items-center justify-between border border-slate-100 rounded-lg p-3 mb-2 last:mb-0">
      <div><p className="text-sm font-semibold text-slate-700">{label}</p><p className="text-[10px] text-slate-400">{sub}</p></div>
      {to ? <Link to={to} className="text-xs font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition shrink-0">{t('common.view')}</Link> : <span className="text-xs text-slate-300">—</span>}
    </div>
  );

  return (
    <SectionCard title={t('foreign.documentPack')} subtitle={t('doc.official')}>
      {!allowed ? <p className="text-sm text-slate-400">{t('doc.packHidden')}</p> : (
        <>
          {Object.entries(DOC_ROUTE).map(([type, seg]) => <Row key={type} label={t(`doc.${type}`)} sub={docs[type] ? `v${docs[type].version}` : t('doc.notAvailable')} to={docs[type] ? `/operations/documents/${seg}/${id}` : null} />)}
          {manifests.map((m) => <Row key={m.id} label={`${t('doc.MANIFEST')} ${m.manifestNo}`} sub={`v${m.version}`} to={`/operations/documents/manifest/${m.id}`} />)}
        </>
      )}
    </SectionCard>
  );
};

const TrackingTab = ({ s }) => {
  const { t } = useLanguage();
  const version = useDataVersion();
  const [events, setEvents] = useState([]);
  useEffect(() => { let alive = true; fetchTrackingEvents(s.shipmentId).then((e) => alive && setEvents(e)); return () => { alive = false; }; }, [s.shipmentId, version]);
  return (
    <SectionCard title={t('tracking.title')} subtitle={s.tracking?.trackingNumber ? `${s.tracking.principal || ''} · ${s.tracking.trackingNumber}` : t('tracking.noNumber')}>
      {events.length === 0 ? <p className="text-sm text-slate-400">{t('tracking.noEvents')}</p> : events.map((e) => (
        <div key={e.id} className="border-b border-slate-50 py-2 last:border-b-0"><p className="text-xs font-bold text-slate-700">{e.description}</p><p className="text-[10px] text-slate-400">{new Date(e.occurredAt).toLocaleString()} · {e.location}</p></div>))}
    </SectionCard>
  );
};

const ForeignWorkspace = () => {
  const { shipmentId } = useParams();
  const { t, tStatus, tException } = useLanguage();
  const version = useDataVersion();
  const { shipment: s, isLoading, error, reload } = useShipment(shipmentId);
  const [tab, setTab] = useState('ops');
  const [logs, setLogs] = useState([]);

  useEffect(() => { let alive = true; if (s) fetchStatusLogsByShipment(s.shipmentId).then((l) => alive && setLogs(l)); return () => { alive = false; }; }, [s, version]);
  const times = useMemo(() => { const m = {}; [...logs].reverse().forEach((l) => { if (l.newValue) m[l.newValue] = l.updatedAt; }); return m; }, [logs]);

  if (isLoading) return <Loader label={t('common.loading')} />;
  if (error || !s) return <div className="max-w-xl mx-auto p-6 text-center"><p className="text-sm font-semibold text-red-600 mb-3">{t('foreign.ws.error')}</p><Link to="/operations/foreign/shipments" className="text-sm font-bold text-emerald-600 hover:underline">{t('foreign.ws.back')}</Link></div>;

  const seq = getSequence(s.mode, s.handlingPath);
  const idx = getStatusIndex(s.mode, s.statusCode, s.handlingPath);
  const tabs = [['ops', t('foreign.ws.tab.ops')], ['evidence', t('foreign.ws.tab.evidence')], ['docs', t('foreign.ws.tab.docs')], ['tracking', t('foreign.ws.tab.tracking')]];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/operations/foreign/shipments" className="text-xs font-bold text-slate-400 hover:text-emerald-600">{t('foreign.ws.back')}</Link>
          <h1 className="text-xl font-black text-slate-800 mt-1">{s.shipmentId}</h1>
          <p className="text-sm text-slate-500">{s.pickup?.companyName} · {s.parcel?.shipmentContents}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Chip tone="blue">{tStatus(s.statusCode, s.statusLabel)}</Chip>
          <WaitingForBadge shipment={s} />
          {s.exceptionCode && <Chip tone="red">{tException(s.exceptionCode)}</Chip>}
        </div>
      </div>

      <SectionCard title={t('foreign.ws.progress')}>
        <div className="mb-6 border-b border-slate-100 pb-6"><HorizontalStageTracker sequence={seq} currentIndex={idx} mode={s.mode} path={s.handlingPath} updatedAt={s.updatedAt} /></div>
        <StatusTimeline sequence={seq} currentIndex={idx} mode={s.mode} path={s.handlingPath} times={times} />
      </SectionCard>

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {tabs.map(([k, label]) => <button key={k} type="button" onClick={() => setTab(k)} className={`px-4 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition ${tab === k ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{label}</button>)}
      </div>

      {tab === 'ops' && <OriginStagePanel shipment={s} onChanged={reload} />}
      {tab === 'evidence' && <EvidenceTab s={s} />}
      {tab === 'docs' && <DocsTab s={s} />}
      {tab === 'tracking' && <TrackingTab s={s} />}
    </div>
  );
};

export default ForeignWorkspace;