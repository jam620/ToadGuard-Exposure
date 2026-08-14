interface FilterBarProps {
  onSeverityChange: (v: string) => void;
  onSourceChange?: (v: string) => void;
  onStatusChange?: (v: string) => void;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onSearch?: (v: string) => void;
}

export function FilterBar({
  onSeverityChange,
  onSourceChange,
  onStatusChange,
  onFromChange,
  onToChange,
  onSearch,
}: FilterBarProps) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
      <select onChange={(e) => onSeverityChange(e.target.value)} defaultValue="">
        <option value="">All severities</option>
        {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {onStatusChange && (
        <select onChange={(e) => onStatusChange(e.target.value)} defaultValue="">
          <option value="">All statuses</option>
          {['OPEN', 'ACKNOWLEDGED', 'DISMISSED', 'RESOLVED'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      )}

      {onSourceChange && (
        <input
          type="text"
          placeholder="Source..."
          onChange={(e) => onSourceChange(e.target.value)}
          style={{ padding: '4px 8px' }}
        />
      )}

      <input type="date" onChange={(e) => onFromChange(e.target.value)} title="From date" />
      <input type="date" onChange={(e) => onToChange(e.target.value)} title="To date" />

      {onSearch && (
        <input
          type="text"
          placeholder="Search..."
          onChange={(e) => onSearch(e.target.value)}
          style={{ padding: '4px 8px', flexGrow: 1 }}
        />
      )}
    </div>
  );
}
