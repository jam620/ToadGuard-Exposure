import type { Env } from '../../types';

import { Hono } from 'hono';

import { buildLeaksPayload, type LeakRow, type LeaksFilters } from './leaks';

export const leaksViewRouter = new Hono<{ Bindings: Env }>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Escape user-supplied strings before inserting into HTML
function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Pick the most informative indicator from a row
function indicator(row: LeakRow): string {
  return esc(row.email ?? row.ip_address ?? row.domain ?? row.username ?? '—');
}

// What type of indicator is it?
function indicatorType(row: LeakRow): string {
  if (row.email) return 'email';
  if (row.ip_address) return 'ip';
  if (row.domain) return 'domain';
  if (row.username) return 'username';
  return '—';
}

const SEV_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
  INFO: '#06b6d4',
};

function sevBadge(sev: string): string {
  const color = SEV_COLOR[sev] ?? '#94a3b8';
  const textColor = sev === 'MEDIUM' ? '#0f172a' : '#fff';
  return `<span style="background:${color};color:${textColor};padding:.2rem .55rem;border-radius:999px;font-size:.7rem;font-weight:700;letter-spacing:.4px">${esc(sev)}</span>`;
}

function buildFilterUrl(filters: LeaksFilters, page: number): string {
  const p = new URLSearchParams();
  if (filters.severity) p.set('severity', filters.severity);
  if (filters.source) p.set('source', filters.source);
  if (filters.from) p.set('from', filters.from);
  if (filters.to) p.set('to', filters.to);
  if (filters.q) p.set('q', filters.q);
  p.set('page', String(page));
  return `/leaks?${p.toString()}`;
}

// ─── HTML renderer ────────────────────────────────────────────────────────────

function renderLeaksPage(
  data: Awaited<ReturnType<typeof buildLeaksPayload>>,
  environment: string
): string {
  const { rows, total, page, pageSize, hasNext, hasPrev, filters } = data;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const tableRows =
    rows.length === 0
      ? `<tr><td colspan="7" style="text-align:center;padding:2.5rem;color:#94a3b8">No records match the current filters</td></tr>`
      : rows
          .map(
            (r) => `
    <tr>
      <td style="color:#94a3b8;font-size:.8rem;white-space:nowrap">${esc(r.collected_at.slice(0, 19).replace('T', ' '))}</td>
      <td style="font-family:monospace;font-size:.85rem;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${indicator(r)}">${indicator(r)}</td>
      <td><span style="background:#1e3a5f;color:#93c5fd;padding:.15rem .45rem;border-radius:.25rem;font-size:.75rem">${indicatorType(r)}</span></td>
      <td style="font-size:.85rem;color:#cbd5e1">${esc(r.source_name)}</td>
      <td>${sevBadge(r.severity)}</td>
      <td style="font-size:.8rem">${r.enriched ? '<span style="color:#22c55e">✓ yes</span>' : '<span style="color:#64748b">no</span>'}</td>
      <td style="font-size:.75rem;color:#64748b;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(
        (() => {
          try {
            return (JSON.parse(r.tags) as string[]).join(', ');
          } catch {
            return r.tags;
          }
        })()
      )}</td>
    </tr>`
          )
          .join('');

  const prevLink = hasPrev
    ? `<a href="${buildFilterUrl(filters, page - 1)}" style="padding:.4rem .9rem;border:1px solid #334155;border-radius:.375rem;color:#f1f5f9;text-decoration:none;font-size:.85rem;background:#1e293b">← Prev</a>`
    : `<span style="padding:.4rem .9rem;border:1px solid #1e293b;border-radius:.375rem;color:#475569;font-size:.85rem;background:#0f172a;cursor:not-allowed">← Prev</span>`;

  const nextLink = hasNext
    ? `<a href="${buildFilterUrl(filters, page + 1)}" style="padding:.4rem .9rem;border:1px solid #334155;border-radius:.375rem;color:#f1f5f9;text-decoration:none;font-size:.85rem;background:#1e293b">Next →</a>`
    : `<span style="padding:.4rem .9rem;border:1px solid #1e293b;border-radius:.375rem;color:#475569;font-size:.85rem;background:#0f172a;cursor:not-allowed">Next →</span>`;

  const pageNumbers = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    const n = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
    const active = n === page;
    return `<a href="${buildFilterUrl(filters, n)}" style="padding:.4rem .7rem;border-radius:.375rem;font-size:.85rem;text-decoration:none;${active ? 'background:#3b82f6;color:#fff;font-weight:700' : 'color:#94a3b8'}">${n}</a>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="refresh" content="60">
  <title>Leaks · ToadGuard · ${environment}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:#0f172a;--surface:#1e293b;--border:#334155;--text:#f1f5f9;--muted:#94a3b8}
    body{font-family:system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
    .wrap{max-width:1280px;margin:0 auto;padding:1.5rem 1rem}
    header{display:flex;align-items:center;justify-content:space-between;padding-bottom:1.25rem;border-bottom:1px solid var(--border);margin-bottom:1.5rem;flex-wrap:wrap;gap:.5rem}
    h1{font-size:1.3rem;color:#3b82f6}
    .badge{font-size:.7rem;background:#1d4ed8;padding:.2rem .5rem;border-radius:999px;text-transform:uppercase}
    a.back{font-size:.85rem;color:var(--muted);text-decoration:none}
    a.back:hover{text-decoration:underline}
    .filter-box{background:var(--surface);border-radius:.75rem;padding:1.25rem;margin-bottom:1.25rem;border-left:4px solid #3b82f6}
    .filter-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.75rem;margin-top:.75rem}
    label{font-size:.75rem;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;display:block;margin-bottom:.2rem}
    input,select{width:100%;padding:.4rem .6rem;background:var(--bg);border:1px solid var(--border);border-radius:.375rem;color:var(--text);font-size:.85rem}
    input:focus,select:focus{outline:none;border-color:#3b82f6}
    .btn{padding:.4rem .9rem;border-radius:.375rem;font-size:.85rem;cursor:pointer;border:none}
    .btn-primary{background:#3b82f6;color:#fff}
    .btn-secondary{background:#334155;color:#f1f5f9}
    .summary{display:flex;gap:1.5rem;flex-wrap:wrap;background:var(--surface);border-radius:.75rem;padding:1rem 1.25rem;margin-bottom:1.25rem;font-size:.85rem;color:var(--muted)}
    .summary strong{color:var(--text);font-size:1rem}
    .table-wrap{overflow-x:auto}
    table{width:100%;border-collapse:collapse;font-size:.875rem}
    th{text-align:left;padding:.6rem 1rem;background:var(--surface);color:var(--muted);font-size:.7rem;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border);white-space:nowrap}
    td{padding:.65rem 1rem;border-bottom:1px solid #1e293b;vertical-align:middle}
    tr:hover td{background:#1a2744}
    .pagination{display:flex;align-items:center;justify-content:center;gap:.5rem;margin-top:1.5rem;flex-wrap:wrap}
    footer{margin-top:2rem;padding-top:1.25rem;border-top:1px solid var(--border);font-size:.8rem;color:var(--muted);display:flex;justify-content:space-between;flex-wrap:wrap;gap:.5rem}
    #cd{background:var(--surface);padding:.15rem .5rem;border-radius:999px}
    @media(max-width:600px){h1{font-size:1.1rem}.filter-grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
<div class="wrap">
  <header>
    <div style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap">
      <h1>🕵️ Leak Records</h1>
      <span class="badge">${environment}</span>
    </div>
    <a class="back" href="/dashboard">← Dashboard</a>
  </header>

  <div class="filter-box">
    <div style="font-size:.8rem;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Filters</div>
    <form method="GET" action="/leaks" class="filter-grid">
      <div>
        <label for="severity">Severity</label>
        <select id="severity" name="severity">
          <option value="">All</option>
          ${['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
            .map(
              (s) =>
                `<option value="${s}"${filters.severity === s ? ' selected' : ''}>${s}</option>`
            )
            .join('')}
        </select>
      </div>
      <div>
        <label for="source">Source</label>
        <input id="source" name="source" type="text" placeholder="simulated, rss…" value="${esc(filters.source)}">
      </div>
      <div>
        <label for="q">Search (email / domain / user)</label>
        <input id="q" name="q" type="text" placeholder="@example.com" value="${esc(filters.q)}">
      </div>
      <div>
        <label for="from">From (UTC)</label>
        <input id="from" name="from" type="datetime-local" value="${esc(filters.from)}">
      </div>
      <div>
        <label for="to">To (UTC)</label>
        <input id="to" name="to" type="datetime-local" value="${esc(filters.to)}">
      </div>
      <div style="align-self:flex-end;display:flex;gap:.5rem">
        <button class="btn btn-primary" type="submit">Apply</button>
        <a href="/leaks" style="padding:.4rem .9rem;background:#334155;color:#f1f5f9;border-radius:.375rem;font-size:.85rem;text-decoration:none">Reset</a>
      </div>
    </form>
  </div>

  <div class="summary">
    <div><strong>${total.toLocaleString('en-US')}</strong>&nbsp;records found</div>
    <div>Page <strong>${page}</strong> of <strong>${totalPages}</strong></div>
    <div><strong>${rows.filter((r) => r.enriched).length}</strong> enriched on this page</div>
  </div>

  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Collected (UTC)</th>
          <th>Indicator</th>
          <th>Type</th>
          <th>Source</th>
          <th>Severity</th>
          <th>Enriched</th>
          <th>Tags</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
  </div>

  <div class="pagination">
    ${prevLink}
    ${pageNumbers}
    ${nextLink}
  </div>

  <footer>
    <span>Auto-refreshes in <span id="cd">60s</span></span>
    <span>${total.toLocaleString('en-US')} total · ${pageSize}/page</span>
  </footer>
</div>
<script>
  let t=60;const el=document.getElementById('cd');
  setInterval(()=>{t--;if(t>0)el.textContent=t+'s';},1000);
</script>
</body>
</html>`;
}

// ─── Route ────────────────────────────────────────────────────────────────────

leaksViewRouter.get('/', async (c) => {
  const filters: LeaksFilters = {
    severity: c.req.query('severity') || undefined,
    source: c.req.query('source') || undefined,
    from: c.req.query('from') || undefined,
    to: c.req.query('to') || undefined,
    q: c.req.query('q') || undefined,
    page: parseInt(c.req.query('page') ?? '1', 10),
    pageSize: parseInt(c.req.query('pageSize') ?? '25', 10),
  };

  try {
    const data = await buildLeaksPayload(c.env.DB, filters);
    return c.html(renderLeaksPage(data, c.env.ENVIRONMENT), 200, {
      'Cache-Control': 'no-store',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.html(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;background:#0f172a;color:#f1f5f9">
       <h2>Leaks view error</h2><pre style="color:#f87171">${esc(msg)}</pre>
       <p><a href="/dashboard" style="color:#3b82f6">← Back to dashboard</a></p></body></html>`,
      500
    );
  }
});
