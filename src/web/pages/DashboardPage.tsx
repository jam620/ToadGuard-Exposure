import { useLeaks } from '../hooks/use-leaks';
import { useAlerts } from '../hooks/use-alerts';
import { LeaksTrendChart } from '../components/charts/LeaksTrendChart';
import { SeverityPieChart } from '../components/charts/SeverityPieChart';
import { TopSourcesChart } from '../components/charts/TopSourcesChart';

export default function DashboardPage() {
  const { data: leaksData } = useLeaks({ pageSize: 100 });
  const { data: alertsData } = useAlerts({ pageSize: 100 });

  const leaks = leaksData?.data ?? [];
  const alerts = alertsData?.data ?? [];

  const severityCounts = leaks.reduce<Record<string, number>>((acc, l) => {
    acc[l.severity] = (acc[l.severity] ?? 0) + 1;
    return acc;
  }, {});

  const sourceMap = leaks.reduce<Record<string, number>>((acc, l) => {
    acc[l.sourceName] = (acc[l.sourceName] ?? 0) + 1;
    return acc;
  }, {});
  const sources = Object.entries(sourceMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0]!;
  });
  const trendCounts = last7Days.map(
    (day) => leaks.filter((l) => l.collectedAt.startsWith(day)).length
  );

  return (
    <div>
      <h1 style={{ color: '#e2e8f0', marginBottom: 24 }}>Dashboard</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 32,
        }}
      >
        {[
          { label: 'Total Leaks', value: leaksData?.total ?? 0 },
          { label: 'Open Alerts', value: alerts.filter((a) => a.status === 'OPEN').length },
          { label: 'Critical', value: alerts.filter((a) => a.severity === 'CRITICAL').length },
          { label: 'Enriched', value: leaks.filter((l) => l.enriched).length },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: '#1e293b', padding: 20, borderRadius: 8 }}>
            <div style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>{label}</div>
            <div style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 24 }}>
        <div style={{ background: '#1e293b', padding: 20, borderRadius: 8 }}>
          <LeaksTrendChart labels={last7Days} counts={trendCounts} />
        </div>
        <div style={{ background: '#1e293b', padding: 20, borderRadius: 8 }}>
          <SeverityPieChart counts={severityCounts} />
        </div>
        <div style={{ background: '#1e293b', padding: 20, borderRadius: 8 }}>
          <TopSourcesChart sources={sources} />
        </div>
      </div>
    </div>
  );
}
