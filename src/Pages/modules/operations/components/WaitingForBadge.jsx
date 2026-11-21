// src/Pages/modules/operations/components/WaitingForBadge.jsx
import { AlertTriangle } from 'lucide-react';
import { getWaitingForInfo } from '../constants/shipmentStatus';
import { useLanguage } from '../hooks/useLanguage';

const TEXT_KEYS = {
  'Waiting for Operations Head Approval': 'waiting.headApproval', 'Waiting for Client Confirmation': 'waiting.clientConfirm',
  'Waiting for Principal Tracking API': 'waiting.api', 'In Progress': 'waiting.inProgress', Completed: 'waiting.completed',
};

// Pass the full shipment record: <WaitingForBadge shipment={s} />
const WaitingForBadge = ({ shipment, className = '' }) => {
  const { t, tException, tRole } = useLanguage();
  const info = getWaitingForInfo(shipment);
  let text = info.text;
  if (TEXT_KEYS[text]) text = t(TEXT_KEYS[text], text);
  else if (shipment?.exceptionCode && info.isNegative) text = `${t('waiting.stuck')}: ${tException(shipment.exceptionCode)}`;
  else if (info.ownerRole && text.startsWith('Waiting for ') && text.endsWith(' Action')) text = `${t('waiting.waitingFor')} ${tRole(info.ownerRole)}`;
  const tone = info.isNegative ? 'text-red-600' : info.isComplete ? 'text-emerald-600' : 'text-blue-600';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold whitespace-nowrap ${tone} ${className}`}>
      {info.isNegative && <AlertTriangle size={12} className="shrink-0" />}
      {text}
    </span>
  );
};

export default WaitingForBadge;