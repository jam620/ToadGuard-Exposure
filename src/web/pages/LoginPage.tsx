export default function LoginPage() {
  const login = (provider: string) => {
    window.location.href = `/auth/login?provider=${provider}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#0f172a',
      }}
    >
      <div
        style={{
          background: '#1e293b',
          padding: 40,
          borderRadius: 8,
          textAlign: 'center',
          width: 340,
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 700, color: '#38bdf8', marginBottom: 8 }}>
          ToadGuard
        </div>
        <div style={{ color: '#64748b', marginBottom: 32, fontSize: 14 }}>
          Credential Exposure Monitor
        </div>
        <button onClick={() => login('google')} style={btnStyle('#4285F4')}>
          Continue with Google
        </button>
        <button onClick={() => login('github')} style={{ ...btnStyle('#24292e'), marginTop: 12 }}>
          Continue with GitHub
        </button>
      </div>
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    width: '100%',
    padding: '12px 16px',
    background: bg,
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  };
}
