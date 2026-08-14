import type { Alert } from '../../types';

import { useState } from 'react';

import { AlertBadge } from '../components/AlertBadge';
import { DataTable } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { useAlerts, useAcknowledgeAlert, type AlertFilters } from '../hooks/use-alerts';

export default function AlertsPage() {
  const [filters, setFilters] = useState<AlertFilters>({ page: 1, pageSize: 25 });
  const { data, isLoading } = useAlerts(filters);
  const ack = useAcknowledgeAlert();

  const update = (patch: Partial<AlertFilters>) => setFilters((f) => ({ ...f, page: 1, ...patch }));

  return (
    <div>
      <h1 style={{ color: '#e2e8f0', marginBottom: 16 }}>Alerts</h1>
      <FilterBar
        onSeverityChange={(v) => update({ severity: v || undefined })}
        onStatusChange={(v) => update({ status: v || undefined })}
        onFromChange={(v) => update({ from: v || undefined })}
        onToChange={(v) => update({ to: v || undefined })}
      />
      {isLoading ? (
        <div style={{ color: '#64748b', padding: 24 }}>Loading...</div>
      ) : (
        <DataTable<Record<string, unknown>>
          columns={[
            { key: 'ruleName', header: 'Rule' },
            {
              key: 'severity',
              header: 'Severity',
              render: (row) => <AlertBadge severity={row['severity'] as Alert['severity']} />,
            },
            { key: 'status', header: 'Status' },
            { key: 'compositeScore', header: 'Score' },
            {
              key: 'createdAt',
              header: 'Created',
              render: (row) => new Date(row['createdAt'] as string).toLocaleString(),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (row) =>
                row['status'] === 'OPEN' ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      ack.mutate({ id: row['id'] as string, status: 'ACKNOWLEDGED' });
                    }}
                    style={{
                      padding: '4px 8px',
                      background: '#334155',
                      color: '#e2e8f0',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    Acknowledge
                  </button>
                ) : null,
            },
          ]}
          data={data?.data.map((a) => a as unknown as Record<string, unknown>) ?? []}
          emptyMessage="No alerts"
        />
      )}
    </div>
  );
}
