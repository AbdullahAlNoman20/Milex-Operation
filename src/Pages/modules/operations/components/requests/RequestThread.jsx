// src/Pages/modules/operations/components/requests/RequestThread.jsx
// Open a request → see the reply of the KAM and keep writing messages under that request.
import { useState } from 'react';
import { Send } from 'lucide-react';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { addRequestMessage } from '../../services/changeRequestService';
import { OPERATIONS_ROLES as R, OPERATIONS_ROLE_LABELS } from '../../constants/operationsRoles';

const RequestThread = ({ r, onChanged }) => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const msgs = r.messages || [];
  const send = async () => {
    setBusy(true);
    try { await addRequestMessage(r.id, text, currentUser); setText(''); onChanged?.(); }
    catch (e) { showToast(e?.message || 'Could not send', 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="mt-3 border-t border-slate-100 pt-3 space-y-2 anim-fade-up">
      {r.response && <p className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-2.5"><b>{r.response.by} (final reply):</b> <span translate="no">{r.response.text}</span></p>}
      {msgs.length === 0 ? <p className="text-xs text-slate-400">No messages yet. Write below.</p> : (
        <ul className="space-y-1.5 max-h-60 overflow-y-auto">
          {msgs.map((m) => (
            <li key={m.id} className={`flex ${m.from.role === currentUser.role ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${m.from.role === R.CLIENT ? 'bg-slate-100 text-slate-700' : 'bg-sky-50 border border-sky-200 text-sky-900'}`}>
                <p className="font-black text-[10px] opacity-70">{m.from.name} · {OPERATIONS_ROLE_LABELS[m.from.role] || m.from.role}</p>
                <p translate="no" className="mt-0.5 break-words">{m.text}</p>
                <p className="text-[9px] opacity-50 mt-0.5">{new Date(m.at).toLocaleString()}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input value={text} maxLength={500} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && text.trim() && !busy) send(); }} placeholder="Write a message…" className="flex-1 min-w-0 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:border-emerald-500 outline-none" />
        <button type="button" disabled={busy || !text.trim()} onClick={send} className="shrink-0 flex items-center gap-1.5 text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-40"><Send size={13} />Send</button>
      </div>
    </div>
  );
};

export default RequestThread;
