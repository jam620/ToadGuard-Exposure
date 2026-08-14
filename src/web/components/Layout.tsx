import { Link, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../hooks/use-auth';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/leaks', label: 'Leaks' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/config', label: 'Config' },
  { to: '/webhooks', label: 'Webhooks' },
  { to: '/users', label: 'Users' },
];

export default function Layout() {
  const { email, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <nav style={{ width: 220, background: '#1e293b', padding: '24px 0', flexShrink: 0 }}>
        <div style={{ padding: '0 24px 24px', fontSize: 18, fontWeight: 700, color: '#38bdf8' }}>
          ToadGuard
        </div>
        {NAV_LINKS.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            style={{
              display: 'block',
              padding: '10px 24px',
              color: pathname.startsWith(to) ? '#38bdf8' : '#94a3b8',
              textDecoration: 'none',
              background: pathname.startsWith(to) ? '#0f172a' : 'transparent',
              fontWeight: pathname.startsWith(to) ? 600 : 400,
            }}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '12px 24px',
            background: '#1e293b',
            borderBottom: '1px solid #334155',
          }}
        >
          <span style={{ marginRight: 16, color: '#94a3b8', fontSize: 14 }}>{email}</span>
          <button
            onClick={logout}
            style={{
              padding: '6px 12px',
              background: '#334155',
              color: '#e2e8f0',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </header>
        <main style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
