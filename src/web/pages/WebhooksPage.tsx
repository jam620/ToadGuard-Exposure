import type { Webhook } from '../../types';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { apiRequest } from '../api-client';

export default function WebhooksPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    targetUrl: '',
    secret: '',
    format: 'JSON',
    minSeverity: 'LOW',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => apiRequest<{ data: Omit<Webhook, 'secret'>[] }>('/api/v1/webhooks'),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof form) =>
      apiRequest('/api/v1/webhooks', {
        method: 'POST',
        body: JSON.stringify({ ...body, enabled: true }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      setShowForm(false);
      setForm({ name: '', targetUrl: '', secret: '', format: 'JSON', minSeverity: 'LOW' });
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/v1/webhooks/${id}/test`, { method: 'POST' }),
  });

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <h1 style={{ color: '#e2e8f0' }}>Webhooks</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '8px 16px',
            background: '#0369a1',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          {showForm ? 'Cancel' : '+ Add Webhook'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#1e293b', padding: 24, borderRadius: 8, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {(
              [
                ['name', 'Name'],
                ['targetUrl', 'Target URL'],
                ['secret', 'Secret'],
              ] as [keyof typeof form, string][]
            ).map(([key, label]) => (
              <div key={key}>
                <label style={{ color: '#94a3b8', fontSize: 12 }}>{label}</label>
                <input
                  type={key === 'secret' ? 'password' : 'text'}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  style={{
                    width: '100%',
                    marginTop: 4,
                    padding: '8px',
                    background: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: 4,
                    color: '#e2e8f0',
                  }}
                />
              </div>
            ))}
            <div>
              <label style={{ color: '#94a3b8', fontSize: 12 }}>Format</label>
              <select
                value={form.format}
                onChange={(e) => setForm((f) => ({ ...f, format: e.target.value }))}
                style={{
                  width: '100%',
                  marginTop: 4,
                  padding: '8px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: 4,
                  color: '#e2e8f0',
                }}
              >
                <option>JSON</option>
                <option>CEF</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => createMutation.mutate(form)}
            disabled={createMutation.isPending}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              background: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Create
          </button>
        </div>
      )}

      {isLoading ? (
        <div style={{ color: '#64748b' }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(data?.data ?? []).map((wh) => (
            <div
              key={wh.id}
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
                <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{wh.name}</div>
                <div style={{ color: '#64748b', fontSize: 12 }}>{wh.targetUrl}</div>
                <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                  Format: {wh.format} | Min: {wh.minSeverity}
                </div>
              </div>
              <button
                onClick={() => testMutation.mutate(wh.id)}
                style={{
                  padding: '6px 12px',
                  background: '#334155',
                  color: '#e2e8f0',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                Test
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
