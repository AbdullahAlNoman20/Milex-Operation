// src/Pages/modules/operations/components/workspace/OriginStagePanel.jsx
// Foreign Operations Supervisor — origin-side actuals. English / 中文 labels via useLanguage().
import { useState, useEffect, useMemo } from 'react';
import SectionCard from '../SectionCard';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useToast } from '../../../../../Components/hooks/useToast';
import { submitOriginStage } from '../../services/shipmentService';
import { getAllowedNextSteps } from '../../constants/shipmentStatus';
import { PARCEL_CONDITION_OPTIONS } from '../../constants/shipmentFields';

const STAGES = ['PICKUP_ARRANGED', 'PICKED_UP', 'RECEIVED_AT_ORIGIN_WAREHOUSE', 'HANDED_OVER_TO_AIRLINE'];
const inp = 'w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 focus:border-emerald-500 outline-none disabled:opacity-60';

const OriginStagePanel = ({ shipment: s, onChanged }) => {
  const { currentUser } = useOperationsAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const stage = useMemo(() => getAllowedNextSteps(currentUser.role, s).find((x) => STAGES.includes(x.code)) || null, [currentUser.role, s]);
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setF({}); }, [stage?.code]);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const L = (key, fb) => t(key, fb);
  const mismatch = f.actualPieces && Number(f.actualPieces) !== Number(s.parcel?.pieces);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await submitOriginStage(s.shipmentId, stage.code, f, currentUser);
      showToast(t('msg.saved', 'Saved successfully'));
      setF({});
      onChanged?.();
    } catch (err) { showToast(err?.message || t('msg.failed', 'Action failed'), 'error'); } finally { setBusy(false); }
  };

  const field = (k, label, props = {}) => (
    <div key={k}><label className="block text-[10px] font-bold text-slate-500 mb-1">{label}</label><input disabled={busy} value={f[k] || ''} onChange={set(k)} className={inp} {...props} /></div>
  );

  return (
    <div className="space-y-6">
      <SectionCard title={L('foreign.title', 'Origin Operations')} subtitle={L('foreign.subtitle')}>
        <div className="grid grid-cols-2 gap-x-6 text-xs mb-4">
          <p><span className="font-bold text-slate-500">{L('field.supplier', 'Supplier')}: </span>{s.pickup?.companyName} · {s.pickup?.contactPhone}</p>
          <p><span className="font-bold text-slate-500">{L('field.address', 'Address')}: </span>{[s.pickup?.address, s.pickup?.city, s.pickup?.country].filter(Boolean).join(', ')}</p>
          <p><span className="font-bold text-slate-500">{L('field.contents', 'Contents')}: </span>{s.parcel?.shipmentContents}</p>
          <p><span className="font-bold text-slate-500">{L('field.declaredPieces', 'Declared Pieces')}: </span>{s.parcel?.pieces} · {s.parcel?.weightKg} kg</p>
        </div>
        {!stage ? <p className="text-sm text-slate-400">{['DEPARTED_ORIGIN', 'IN_TRANSIT', 'ARRIVED_IN_BANGLADESH'].includes(s.statusCode) ? L('waiting.api', 'Waiting for Principal Tracking API') : L('waiting.inProgress', 'In Progress')}</p> : (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm font-black text-emerald-700">{L(`foreign.stage.${stage.code}`, stage.label)}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stage.code === 'PICKUP_ARRANGED' && field('arrangedFor', L('field.pickupDate', 'Pickup Arranged For'), { type: 'date' })}
              {stage.code === 'PICKED_UP' && <>
                {field('pickedAt', L('field.pickedAt', 'Actual Pickup Time'), { type: 'datetime-local' })}
                {field('actualPieces', L('field.actualPieces', 'Actual Pieces'), { type: 'number', min: 1 })}
              </>}
              {stage.code === 'RECEIVED_AT_ORIGIN_WAREHOUSE' && <>
                {field('receiptNo', L('field.warehouseReceiptNo', 'Warehouse Receipt No.'), { maxLength: 60 })}
                {field('receivedAt', L('field.receivedAt', 'Received At'), { type: 'datetime-local' })}
                {field('actualPieces', L('field.actualPieces', 'Actual Pieces'), { type: 'number', min: 1 })}
                {field('actualWeightKg', L('field.actualWeight', 'Actual Weight (kg)'), { type: 'number', min: 0, step: '0.01' })}
                {field('lengthCm', `${L('field.dimensions', 'Dimensions')} — L cm`, { type: 'number', min: 0 })}
                {field('widthCm', 'W cm', { type: 'number', min: 0 })}
                {field('heightCm', 'H cm', { type: 'number', min: 0 })}
              </>}
              {stage.code === 'HANDED_OVER_TO_AIRLINE' && <>
                {field('trackingNumber', L('field.trackingNumber', 'Principal Tracking Number'), { maxLength: 60 })}
                {field('mawbNumber', L('field.mawbNo', 'MAWB No.'), { maxLength: 20, placeholder: '876-44431962' })}
                {field('flightNo', L('field.flightNo', 'Flight No.'), { maxLength: 20, placeholder: '3U9079' })}
                {field('flightDate', L('field.flightDate', 'Flight Date'), { type: 'date' })}
              </>}
              {['PICKED_UP', 'RECEIVED_AT_ORIGIN_WAREHOUSE'].includes(stage.code) && (
                <div><label className="block text-[10px] font-bold text-slate-500 mb-1">{L('field.condition', 'Parcel Condition')}</label>
                  <select disabled={busy} value={f.condition || ''} onChange={set('condition')} className={inp}>
                    <option value="">—</option>{PARCEL_CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{L(`condition.${c}`, c)}</option>)}
                  </select></div>
              )}
              <div className="sm:col-span-2">{field('note', L('field.comments', 'Comments'), { maxLength: 300 })}</div>
            </div>
            {mismatch && <p className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded-lg p-2 font-semibold">{L('foreign.mismatchWarn')} ({L('field.declaredPieces', 'Declared Pieces')}: {s.parcel?.pieces})</p>}
            
            <button type="submit" disabled={busy} className="text-xs font-bold bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">{busy ? '...' : L('common.submit', 'Submit')}</button>
          </form>
        )}
      </SectionCard>
      
    </div>
  );
};

export default OriginStagePanel;