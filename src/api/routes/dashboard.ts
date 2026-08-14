import type { Env } from '../../types';

import { Hono } from 'hono';

import { buildStatsPayload } from './stats';

export const dashboardRouter = new Hono<{ Bindings: Env }>();

const REFRESH_SECS = 30;

function fmt(n: number) {
  return n.toLocaleString('en-US');
}

function severityColor(sev: string): string {
  const map: Record<string, string> = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#22c55e',
    INFO: '#06b6d4',
  };
  return map[sev] ?? '#94a3b8';
}

function card(title: string, accentColor: string, body: string): string {
  return `
    <div class="card" style="border-left-color:${accentColor}">
      <div class="card-title">${title}</div>
      ${body}
    </div>`;
}

function bigStat(value: string | number, detail = ''): string {
  return `<div class="big-stat">${value}</div>${detail ? `<div class="detail">${detail}</div>` : ''}`;
}

function severityGrid(map: Record<string, number>, keys: string[]): string {
  return `<div class="sev-grid">${keys
    .map((k) => {
      const v = map[k] ?? 0;
      return `<div class="sev-cell">
        <div class="sev-label" style="color:${severityColor(k)}">${k}</div>
        <div class="sev-val">${fmt(v)}</div>
      </div>`;
    })
    .join('')}</div>`;
}

function renderHTML(s: Awaited<ReturnType<typeof buildStatsPayload>>): string {
  const enrichPct =
    s.leakRecords.total > 0
      ? ((s.leakRecords.enriched / s.leakRecords.total) * 100).toFixed(1)
      : '0';

  const lastJobText = s.collector.lastJob
    ? `${s.collector.lastJob.source} · ${s.collector.lastJob.records_inserted} inserted · ${s.collector.lastJob.finished_at?.slice(0, 19).replace('T', ' ')} UTC`
    : 'No jobs yet';

  const cards = [
    card(
      'Leak Records',
      '#3b82f6',
      bigStat(fmt(s.leakRecords.total), `${fmt(s.leakRecords.last24h)} in last 24 h`)
    ),
    card(
      'By Severity',
      '#3b82f6',
      severityGrid(s.leakRecords.bySeverity, ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'])
    ),
    card(
      'Enrichment',
      '#06b6d4',
      bigStat(
        `${enrichPct}%`,
        `${fmt(s.leakRecords.enriched)} of ${fmt(s.leakRecords.total)} processed`
      )
    ),
    card(
      'Alerts',
      '#ef4444',
      bigStat(fmt(s.alerts.total), `${s.alerts.byStatus['OPEN'] ?? 0} open`)
    ),
    card(
      'Alerts by Severity',
      '#ef4444',
      severityGrid(s.alerts.bySeverity, ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
    ),
    card(
      'Last Collector Job',
      '#a855f7',
      `<div class="detail" style="font-size:0.95rem;line-height:1.8">${lastJobText}</div>`
    ),
    card(
      'Webhooks',
      '#22c55e',
      bigStat(
        `${s.webhooks.enabled} / ${s.webhooks.total}`,
        s.webhooks.deliveries.total > 0
          ? `${s.webhooks.deliveries.successRate}% delivery success`
          : 'No deliveries yet'
      )
    ),
    card('Active Users', '#f59e0b', bigStat(fmt(s.users.active))),
  ].join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="refresh" content="${REFRESH_SECS}">
  <title>ToadGuard Dashboard · ${s.environment}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#0f172a;--surface:#1e293b;--border:#334155;
      --text:#f1f5f9;--muted:#94a3b8;--accent:#3b82f6;
    }
    body{font-family:system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
    .wrap{max-width:1100px;margin:0 auto;padding:1.5rem 1rem}
    header{display:flex;align-items:center;justify-content:space-between;
           padding-bottom:1.25rem;border-bottom:1px solid var(--border);margin-bottom:1.75rem;flex-wrap:wrap;gap:.75rem}
    h1{font-size:1.4rem;color:var(--accent)}
    .badge{font-size:.75rem;background:#1d4ed8;padding:.25rem .6rem;border-radius:999px;text-transform:uppercase;letter-spacing:.5px}
    .grid{display:grid;gap:1.25rem;grid-template-columns:repeat(auto-fill,minmax(280px,1fr))}
    .card{background:var(--surface);border-radius:.75rem;padding:1.25rem;border-left:4px solid var(--accent)}
    .card-title{font-size:.75rem;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);margin-bottom:.75rem}
    .big-stat{font-size:2rem;font-weight:700;line-height:1}
    .detail{font-size:.85rem;color:var(--muted);margin-top:.4rem}
    .sev-grid{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.25rem}
    .sev-cell{flex:1;min-width:52px;text-align:center;background:#0f172a;border-radius:.5rem;padding:.5rem .25rem}
    .sev-label{font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.3px}
    .sev-val{font-size:1.2rem;font-weight:700;margin-top:.2rem}
    footer{margin-top:2rem;padding-top:1.25rem;border-top:1px solid var(--border);
           display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;
           font-size:.8rem;color:var(--muted)}
    #countdown{background:var(--surface);padding:.2rem .6rem;border-radius:999px}
    @media(max-width:500px){h1{font-size:1.1rem}.big-stat{font-size:1.6rem}}
  </style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>🛡️ ToadGuard-Exposure</h1>
    <span class="badge">${s.environment}</span>
  </header>
  <div class="grid">${cards}</div>
  <footer>
    <span>Data as of ${s.timestamp.slice(0, 19).replace('T', ' ')} UTC</span>
    <span>Refresh in <span id="countdown">${REFRESH_SECS}s</span></span>
  </footer>
</div>
<script>
  let t=${REFRESH_SECS};
  const el=document.getElementById('countdown');
  setInterval(()=>{ t--; if(t>0) el.textContent=t+'s'; },1000);
</script>
</body>
</html>`;
}

dashboardRouter.get('/', async (c) => {
  try {
    const stats = await buildStatsPayload(c.env.DB, c.env.ENVIRONMENT);
    return c.html(renderHTML(stats), 200, { 'Cache-Control': 'no-store' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.html(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;background:#0f172a;color:#f1f5f9">
       <h2>Dashboard error</h2><pre style="color:#f87171">${msg}</pre></body></html>`,
      500
    );
  }
});
