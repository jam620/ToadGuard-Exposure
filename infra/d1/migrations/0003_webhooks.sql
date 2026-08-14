-- webhooks: outbound integrations
CREATE TABLE IF NOT EXISTS webhooks (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  target_url    TEXT NOT NULL,
  secret        TEXT NOT NULL,
  format        TEXT NOT NULL DEFAULT 'JSON',
  enabled       INTEGER NOT NULL DEFAULT 1,
  min_severity  TEXT NOT NULL DEFAULT 'LOW',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  created_by    TEXT NOT NULL REFERENCES users(id)
);

-- webhook_deliveries: per-alert delivery history with retry tracking
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id              TEXT PRIMARY KEY,
  webhook_id      TEXT NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  alert_id        TEXT NOT NULL REFERENCES alerts(id),
  attempt_number  INTEGER NOT NULL DEFAULT 1,
  status_code     INTEGER,
  response_body   TEXT,
  delivered_at    TEXT NOT NULL DEFAULT (datetime('now')),
  success         INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT
);

CREATE INDEX IF NOT EXISTS idx_wd_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_wd_alert   ON webhook_deliveries(alert_id);
