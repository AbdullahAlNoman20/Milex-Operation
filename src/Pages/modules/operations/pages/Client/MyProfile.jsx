// src/Pages/modules/operations/pages/Client/MyProfile.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Trash2, MessageSquarePlus } from 'lucide-react';
import SectionCard from '../../components/SectionCard';
import Chip from '../../components/Chip';
import Avatar from '../../components/Avatar';
import ClientDocsViewer from '../../components/customer/ClientDocsViewer';
import { Kv, KvGrid, MiniTable } from '../../components/customer/ProfileBits';
import Loader from '../../../../../Components/Shared/Loader';
import { useOperationsAuth } from '../../hooks/useOperationsAuth';
import { useToast } from '../../../../../Components/hooks/useToast';
import { fetchClientByEmail } from '../../services/clientService';
import { formatRateFormula } from '../../services/rateService';
import { saveAvatarFile, removeAvatar, getAvatar } from '../../utils/avatar';
import { amountInWordsBD } from '../../utils/numberToWords';

const TABS = [['recommendation', 'Recommendation Form'], ['profile', 'Account Profile']];
const RATE_COLS = [{ key: 'mode', label: 'Mode' }, { key: 'country', label: 'Country' }, { key: 'f', label: 'Rate', render: (r) => formatRateFormula(r) }, { key: 'version', label: 'Rate Reference' }];
const CONTACT_COLS = [{ key: 'type', label: 'Type' }, { key: 'name', label: 'Name' }, { key: 'designation', label: 'Designation' }, { key: 'mobile', label: 'Mobile' }, { key: 'email', label: 'Email' }];

const MyProfile = () => {
  const { currentUser } = useOperationsAuth();
  const { showToast } = useToast();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('recommendation');
  const [hasPic, setHasPic] = useState(!!getAvatar(currentUser.email));

  useEffect(() => { let a = true; fetchClientByEmail(currentUser.email).then((c) => a && setClient(c)).finally(() => a && setLoading(false)); return () => { a = false; }; }, [currentUser.email]);

  const pick = async (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    try { await saveAvatarFile(currentUser.email, f); setHasPic(true); showToast('Profile picture updated'); } catch (err) { showToast(err.message, 'warning'); }
  };

  if (loading) return <Loader label="Loading your profile..." />;
  const limit = Number(client?.creditLimitAmount) || 0;

  return (
    <div className="w-full space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-wrap items-center gap-5">
        <div className="relative">
          <Avatar key={String(hasPic)} user={currentUser} size={96} className="text-3xl" />
          <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center cursor-pointer hover:bg-emerald-700 shadow" title="Change picture"><Camera size={15} /><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} /></label>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-black text-slate-800 truncate">{client?.accountName || currentUser.name}</h1>
          <p className="text-sm text-slate-500">{currentUser.email}{client?.customerId ? ` · ${client.customerId}` : ''}</p>
          <div className="flex flex-wrap gap-2 mt-2">{client && <><Chip tone="green">{client.status || 'Active'}</Chip><Chip tone="blue">{client.accountType}</Chip>{limit > 0 && <Chip>BDT {limit.toLocaleString('en-US')} / {client.creditPeriodDays} days</Chip>}</>}</div>
        </div>
        <div className="flex gap-2">
          {hasPic && <button type="button" onClick={() => { removeAvatar(currentUser.email); setHasPic(false); }} className="flex items-center gap-1.5 text-xs font-bold text-red-600 border border-red-200 px-3 py-2 rounded-lg hover:bg-red-50"><Trash2 size={14} /> Remove picture</button>}
          <Link to="/operations/client/requests" className="flex items-center gap-1.5 text-xs font-bold bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-900"><MessageSquarePlus size={14} /> Request change / new rate</Link>
        </div>
      </div>

      {!client ? <p className="text-sm text-slate-400">No account profile is linked to this login yet — contact Operations.</p> : (
        <>
          <SectionCard title="Account Information">
            <KvGrid>
              <Kv k="Account Name" v={client.accountName} /><Kv k="Managing Partner / MD" v={client.managingPartner} /><Kv k="Business Type" v={client.businessType} />
              <Kv k="Mobile" v={client.mobile} /><Kv k="Email" v={client.email} /><Kv k="Address" v={client.address} />
              <Kv k="Account Mode" v={client.accountMode} /><Kv k="Account Type" v={client.accountType} /><Kv k="Credit Period (Days)" v={client.creditPeriodDays} />
              <Kv k="Credit Limit (BDT)" v={limit ? limit.toLocaleString('en-US') : ''} /><Kv k="In Words" v={limit ? amountInWordsBD(limit) : ''} className="sm:col-span-2" />
            </KvGrid>
          </SectionCard>
          <SectionCard title="Contacts"><MiniTable columns={CONTACT_COLS} rows={client.contacts || []} empty="No contacts recorded." /></SectionCard>
          <SectionCard title="Approved Rates" subtitle={client.recommendation?.approvedRateText ? `Approved: ${client.recommendation.approvedRateText}` : undefined}>
            <MiniTable columns={RATE_COLS} rows={client.rateCard || []} empty="No approved rates yet." />
            <p className="text-[10px] text-slate-400 mt-2">Rates are fixed by Sales and cannot be edited here. Need a different rate or another country? Send a request.</p>
          </SectionCard>
          <SectionCard title="Account Documents" subtitle="Issued by Sales when your account was approved.">
            <div className="flex gap-1 border-b border-slate-200 mb-4 overflow-x-auto">{TABS.map(([k, l]) => <button key={k} type="button" onClick={() => setTab(k)} className={`px-4 py-2 text-xs font-bold whitespace-nowrap border-b-2 ${tab === k ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>{l}</button>)}</div>
            <ClientDocsViewer client={client} tab={tab} />
          </SectionCard>
        </>
      )}
    </div>
  );
};

export default MyProfile;