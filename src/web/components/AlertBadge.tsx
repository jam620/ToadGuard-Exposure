import type { Severity } from '../../types';

const COLORS: Record<Severity, string> = {
  CRITICAL: 'background:#7f1d1d;color:#fca5a5',
  HIGH: 'background:#7c2d12;color:#fdba74',
  MEDIUM: 'background:#78350f;color:#fcd34d',
  LOW: 'background:#1e3a5f;color:#93c5fd',
  INFO: 'background:#1e293b;color:#94a3b8',
};

interface Props {
  severity: Severity;
}

export function AlertBadge({ severity }: Props) {
  return (
    <span
      style={{
        ...parseStyle(COLORS[severity]),
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {severity}
    </span>
  );
}

function parseStyle(css: string): React.CSSProperties {
  return Object.fromEntries(
    css.split(';').map((rule) => {
      const [k, v] = rule.split(':').map((s) => s.trim());
      const camel = (k ?? '').replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      return [camel, v];
    })
  ) as React.CSSProperties;
}
