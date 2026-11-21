// src/Pages/modules/operations/components/charts/DashboardCharts.jsx
import { useMemo } from 'react';
import SectionCard from '../SectionCard';
import { Donut, Bars } from './Charts';
import { getStageGroups } from '../../constants/shipmentStatus';

const DashboardCharts = ({ shipments = [] }) => {
  const d = useMemo(() => {
    const open = shipments.filter((s) => s.statusCode !== 'CLOSED');
    const byStage = {};
    open.forEach((s) => { const g = getStageGroups(s.mode, s.handlingPath).find((x) => x.codes.includes(s.statusCode)); const k = g?.title || 'Other'; byStage[k] = (byStage[k] || 0) + 1; });
    const days = Array.from({ length: 7 }, (_, i) => { const t = new Date(); t.setDate(t.getDate() - (6 - i)); return t; });
    const perDay = days.map((t) => ({ label: t.toLocaleDateString('en-GB', { weekday: 'short' }), value: shipments.filter((s) => new Date(s.createdAt).toDateString() === t.toDateString()).length }));
    return {
      mode: [{ label: 'Export', value: open.filter((s) => s.mode === 'EXPORT').length, color: '#059669' }, { label: 'Import', value: open.filter((s) => s.mode === 'IMPORT').length, color: '#2563eb' }],
      stage: Object.entries(byStage).map(([label, value]) => ({ label, value })),
      health: [{ label: 'On track', value: open.filter((s) => !s.exceptionCode).length, color: '#059669' }, { label: 'Exception', value: open.filter((s) => s.exceptionCode).length, color: '#dc2626' }],
      perDay,
    };
  }, [shipments]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SectionCard title="Open Shipments by Mode"><Donut data={d.mode} /></SectionCard>
      <SectionCard title="Shipment Health"><Donut data={d.health} /></SectionCard>
      <SectionCard title="Where Shipments Are Now"><Donut data={d.stage} /></SectionCard>
      <SectionCard title="New Shipments — Last 7 Days"><Bars data={d.perDay} /></SectionCard>
    </div>
  );
};

export default DashboardCharts;