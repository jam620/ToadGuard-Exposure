import type { LeakRecord } from '../../types';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DataTable } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { AlertBadge } from '../components/AlertBadge';
import { useLeaks, type LeakFilters } from '../hooks/use-leaks';

export default function LeaksPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<LeakFilters>({ page: 1, pageSize: 25 });
  const { data, isLoading } = useLeaks(filters);

  const update = (patch: Partial<LeakFilters>) => setFilters((f) => ({ ...f, page: 1, ...patch }));

  return (
    <div>
      <h1 style={{ color: '#e2e8f0', marginBottom: 16 }}>Leaks</h1>
      <FilterBar
        onSeverityChange={(v) => update({ severity: v || undefined })}
        onSourceChange={(v) => update({ source: v || undefined })}
        onFromChange={(v) => update({ from: v || undefined })}
        onToChange={(v) => update({ to: v || undefined })}
        onSearch={(v) => update({ q: v || undefined })}
      />
      {isLoading ? (
        <div style={{ color: '#64748b', padding: 24 }}>Loading...</div>
      ) : (
        <>
          <DataTable<Record<string, unknown>>
            columns={[
              { key: 'email', header: 'Email' },
              { key: 'domain', header: 'Domain' },
              { key: 'sourceName', header: 'Source' },
              {
                key: 'severity',
                header: 'Severity',
                render: (row) => (
                  <AlertBadge severity={row['severity'] as LeakRecord['severity']} />
                ),
              },
              {
                key: 'collectedAt',
                header: 'Collected',
                render: (row) => new Date(row['collectedAt'] as string).toLocaleString(),
              },
            ]}
            data={data?.data.map((r) => r as unknown as Record<string, unknown>) ?? []}
            onRowClick={(row) => navigate(`/leaks/${row['id']}`)}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 16,
              color: '#64748b',
              fontSize: 14,
            }}
          >
            <span>{data?.total ?? 0} total results</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => update({ page: (filters.page ?? 1) - 1 })}
                disabled={(filters.page ?? 1) <= 1}
                style={pageBtnStyle}
              >
                Prev
              </button>
              <span>Page {filters.page ?? 1}</span>
              <button
                onClick={() => update({ page: (filters.page ?? 1) + 1 })}
                disabled={!data?.hasNext}
                style={pageBtnStyle}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const pageBtnStyle: React.CSSProperties = {
  padding: '4px 12px',
  background: '#334155',
  color: '#e2e8f0',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
};
