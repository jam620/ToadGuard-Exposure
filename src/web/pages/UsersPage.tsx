import type { User } from '../../types';

import { useQuery } from '@tanstack/react-query';

import { apiRequest } from '../api-client';

export default function UsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiRequest<{ data: User[] }>('/api/v1/users'),
  });

  return (
    <div>
      <h1 style={{ color: '#e2e8f0', marginBottom: 24 }}>Users</h1>
      {isLoading ? (
        <div style={{ color: '#64748b' }}>Loading...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #334155' }}>
              {['Email', 'Display Name', 'Provider', 'Roles', 'Active', 'Last Login'].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#94a3b8' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.data ?? []).map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: '8px 12px', color: '#e2e8f0' }}>{user.email}</td>
                <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{user.displayName}</td>
                <td style={{ padding: '8px 12px', color: '#64748b' }}>{user.oauthProvider}</td>
                <td style={{ padding: '8px 12px', color: '#38bdf8' }}>{user.roles.join(', ')}</td>
                <td style={{ padding: '8px 12px', color: user.active ? '#22c55e' : '#ef4444' }}>
                  {user.active ? 'Yes' : 'No'}
                </td>
                <td style={{ padding: '8px 12px', color: '#64748b' }}>
                  {new Date(user.lastLoginAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
