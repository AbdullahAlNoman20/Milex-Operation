// src/Pages/modules/operations/components/workspace/MessagesPanel.jsx
import { useEffect, useState } from 'react';
import SectionCard from '../SectionCard';
import Chip from '../Chip';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { useToast } from '../../../../../Components/hooks/useToast';
import { addMessage, markMessagesRead } from '../../services/shipmentService';
import { OPERATIONS_ROLES as R } from '../../constants/operationsRoles';

const MessagesPanel = ({ shipment: s, onChanged }) => {
  const { currentUser } = useOperationsAuth();
  const { tRole } = useLanguage();
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const role = currentUser.role;
  const canWrite = [R.CLIENT, R.DOMESTIC_ADMIN, R.OPERATIONS_HEAD, R.FOREIGN_ADMIN, R.CNF].includes(role);
  const unread = (s.messages || []).some((m) => !(m.readBy || []).includes(role));

  useEffect(() => { if (unread) markMessagesRead(s.shipmentId, role).catch(() => {}); }, [unread, s.shipmentId, role]);

  const send = async () => {
    setBusy(true);
    try { await addMessage(s.shipmentId, text, currentUser); setText(''); onChanged?.(); } catch (e) { showToast(e?.message || 'Failed to send', 'error'); } finally { setBusy(false); }
  };

  return (
    <SectionCard title="Messages">
      {(s.messages || []).length === 0 ? <p className="text-sm text-slate-400 mb-3">No messages yet.</p> : (
        <div className="space-y-2 mb-3 max-h-80 overflow-y-auto">
          {[...s.messages].reverse().map((m) => (
            <div key={m.id} className={`rounded-lg p-3 border ${m.from.role === R.CLIENT ? 'bg-slate-50 border-slate-100' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center justify-between gap-2 mb-1"><div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-700">{m.from.name}</span><Chip>{tRole(m.from.role)}</Chip></div><span className="text-[10px] text-slate-400">{new Date(m.at).toLocaleString()}</span></div>
              <p translate="no" className="text-sm text-slate-700">{m.text}</p>
            </div>
          ))}
        </div>
      )}
      {canWrite && (
        <div className="flex gap-2">
          <input value={text} maxLength={500} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && text.trim() && !busy) send(); }} placeholder="Write a message..." className="flex-1 border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 focus:border-emerald-500 outline-none" />
          <button type="button" disabled={busy || !text.trim()} onClick={send} className="text-xs font-bold bg-emerald-600 text-white px-4 rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">Send</button>
        </div>
      )}
    </SectionCard>
  );
};

export default MessagesPanel;