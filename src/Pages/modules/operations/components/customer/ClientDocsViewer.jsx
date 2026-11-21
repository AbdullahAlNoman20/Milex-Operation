// src/Pages/modules/operations/components/customer/ClientDocsViewer.jsx
// Shows the two Sales documents (Recommendation Form / Account Profile) and downloads the visible one as PDF.
import { useRef, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import RecommendationForm from './RecommendationForm';
import AccountProfileSheet from './AccountProfileSheet';
import { downloadElementAsPdf } from '../../utils/pdf';
import { useToast } from '../../../../../Components/hooks/useToast';

const PRINT_CSS = '@media print { body * { visibility: hidden !important; } .print-area, .print-area * { visibility: visible !important; } .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 12mm; background: #fff; } }';

const ClientDocsViewer = ({ client, tab = 'recommendation' }) => {
  const ref = useRef(null);
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const isRec = tab === 'recommendation';
  const name = `${client.customerId || 'CUSTOMER'}-${isRec ? 'Recommendation-Form' : 'Account-Profile'}`;
  const download = async () => {
    setBusy(true);
    try { await downloadElementAsPdf(ref.current, name); } catch { showToast('Could not create the PDF — use Print instead', 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <style>{PRINT_CSS}</style>
      <div className="flex justify-end gap-2 p-3 border-b border-slate-100">
        <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 text-xs font-bold border border-slate-300 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50"><Printer size={14} /> Print</button>
        <button type="button" disabled={busy} onClick={download} className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"><Download size={14} /> {busy ? 'Preparing...' : 'Download PDF'}</button>
      </div>
      <div className="overflow-x-auto"><div ref={ref} className="print-area bg-white p-4 sm:p-6 min-w-[640px]">{isRec ? <RecommendationForm client={client} /> : <AccountProfileSheet client={client} />}</div></div>
    </div>
  );
};

export default ClientDocsViewer;