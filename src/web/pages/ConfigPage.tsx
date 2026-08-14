import { useQuery } from '@tanstack/react-query';

import { apiRequest } from '../api-client';

interface DetectionRuleView {
  id: string;
  name: string;
  description: string;
  severity: string;
  enabled: boolean;
}

export default function ConfigPage() {
  const { data: rules, isLoading } = useQuery({
    queryKey: ['config-rules'],
    queryFn: () => apiRequest<DetectionRuleView[]>('/api/v1/config/rules'),
  });

  return (
    <div>
      <h1 style={{ color: '#e2e8f0', marginBottom: 24 }}>Configuration</h1>

      <section>
        <h2 style={{ color: '#94a3b8', marginBottom: 16, fontSize: 16 }}>Detection Rules</h2>
        {isLoading ? (
          <div style={{ color: '#64748b' }}>Loading...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(rules ?? []).map((rule) => (
              <div
                key={rule.id}
                style={{
                  background: '#1e293b',
                  padding: 16,
                  borderRadius: 8,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{rule.name}</div>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>
                    {rule.description}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#64748b', fontSize: 12 }}>{rule.severity}</span>
                  <span
                    style={{
                      color: rule.enabled ? '#22c55e' : '#ef4444',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {rule.enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
