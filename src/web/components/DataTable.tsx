interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data',
}: DataTableProps<T>) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
      <thead>
        <tr style={{ borderBottom: '2px solid #334155' }}>
          {columns.map((col) => (
            <th
              key={col.key}
              style={{ textAlign: 'left', padding: '8px 12px', color: '#94a3b8', fontWeight: 600 }}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td
              colSpan={columns.length}
              style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}
            >
              {emptyMessage}
            </td>
          </tr>
        ) : (
          data.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              style={{
                borderBottom: '1px solid #1e293b',
                cursor: onRowClick ? 'pointer' : 'default',
                background: i % 2 === 0 ? '#0f172a' : '#111827',
              }}
            >
              {columns.map((col) => (
                <td key={col.key} style={{ padding: '8px 12px' }}>
                  {col.render ? col.render(row) : String(row[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
