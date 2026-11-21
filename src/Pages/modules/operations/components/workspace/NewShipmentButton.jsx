import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import { fetchClients } from '../../services/clientService';
import { inp } from '../Field';

const NewShipmentButton = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState('export');

  useEffect(() => { if (open && clients.length === 0) fetchClients().then(setClients).catch(() => {}); }, [open, clients.length]);
  const go = () => navigate(`/operations/domestic/new-${mode}?client=${encodeURIComponent(email)}`);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 transition"><Plus size={14} /> New Shipment</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-4 relative" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"><X size={18} /></button>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">New Shipment for a Client</h2>
            <div><label className="block text-[10px] font-bold text-slate-500 mb-1">Client</label>
              <select value={email} onChange={(e) => setEmail(e.target.value)} className={inp}><option value="">Select a client...</option>{clients.map((c) => <option key={c.id} value={c.email}>{c.accountName}</option>)}</select></div>
            <div className="flex gap-6">{['export', 'import'].map((m) => <label key={m} className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 capitalize"><input type="radio" className="accent-emerald-600" checked={mode === m} onChange={() => setMode(m)} />{m}</label>)}</div>
            <p className="text-[11px] text-slate-400">You fill the form. The Client reviews and confirms it before it goes to the Operations Head.</p>
            <button type="button" disabled={!email} onClick={go} className="w-full text-sm font-bold bg-slate-800 text-white px-3 py-2.5 rounded-lg hover:bg-slate-900 disabled:opacity-40">Continue to form</button>
          </div>
        </div>
      )}
    </>
  );
};

export default NewShipmentButton;