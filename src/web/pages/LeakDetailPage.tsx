import type { LeakRecord } from '../../types';

import { useParams } from 'react-router-dom';

import { AlertBadge } from '../components/AlertBadge';
import { useLeak, useEnrichLeak } from '../hooks/use-leaks';

export default function LeakDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data, isLoading } = useLeak(id);
  const enrich = useEnrichLeak();

  if (isLoading) return <div style={{ color: '#64748b', padding: 24 }}>Loading...</div>;
  if (!data) return <div style={{ color: '#ef4444', padding: 24 }}>Leak not found</div>;

  return (
    <div style={{ maxWidth: 800 }}>
      <h1 style={{ color: '#e2e8f0', marginBottom: 4 }}>Leak Detail</h1>
      <div style={{ color: '#64748b', fontSize: 12, marginBottom: 24 }}>{data.id}</div>

      <div style={{ background: '#1e293b', borderRadius: 8, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {(
            [
              ['Email', data.email],
              ['Username', data.username],
              ['Domain', data.domain],
              ['IP Address', data.ipAddress],
              ['Source', data.sourceName],
              ['Severity', data.severity],
              ['Collected', data.collectedAt],
              ['Enriched', data.enriched ? 'Yes' : 'No'],
            ] as [string, string | undefined][]
          ).map(([label, value]) => (
            <div key={label}>
              <div style={{ color: '#64748b', fontSize: 12 }}>{label}</div>
              <div style={{ color: '#e2e8f0' }}>
                {label === 'Severity' ? (
                  <AlertBadge severity={value as LeakRecord['severity']} />
                ) : (
                  (value ?? '—')
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!data.enriched && (
        <button
          onClick={() => enrich.mutate(id)}
          disabled={enrich.isPending}
          style={{
            padding: '8px 16px',
            background: '#0369a1',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            marginBottom: 24,
          }}
        >
          {enrich.isPending ? 'Enriching...' : 'Enrich with OTX + AbuseIPDB'}
        </button>
      )}

      {data.enrichment && (
        <div style={{ background: '#1e293b', borderRadius: 8, padding: 24 }}>
          <h3 style={{ color: '#38bdf8', marginBottom: 12 }}>Enrichment Results</h3>
          <div style={{ color: '#94a3b8', fontSize: 14 }}>
            <div>
              Composite Score:{' '}
              <strong style={{ color: '#e2e8f0' }}>{data.enrichment.compositeScore}</strong>
            </div>
            {data.enrichment.otx && (
              <div style={{ marginTop: 8 }}>
                OTX Pulses: {data.enrichment.otx.pulseCount} | Malicious:{' '}
                {data.enrichment.otx.malicious ? 'Yes' : 'No'}
              </div>
            )}
            {data.enrichment.abuseIpDb && (
              <div style={{ marginTop: 8 }}>
                AbuseIPDB Score: {data.enrichment.abuseIpDb.abuseConfidenceScore}%
              </div>
            )}
            {data.enrichment.indicators.length > 0 && (
              <ul style={{ marginTop: 8 }}>
                {data.enrichment.indicators.map((i, idx) => (
                  <li key={idx}>{i}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
