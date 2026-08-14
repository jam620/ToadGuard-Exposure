-- leak_records: canonical leak entry
CREATE TABLE IF NOT EXISTS leak_records (
  id             TEXT PRIMARY KEY,
  source_id      TEXT NOT NULL,
  source_name    TEXT NOT NULL,
  collected_at   TEXT NOT NULL,
  normalized_at  TEXT NOT NULL,
  dedupe_key     TEXT NOT NULL UNIQUE,
  email          TEXT,
  username       TEXT,
  password_hash  TEXT,
  ip_address     TEXT,
  domain         TEXT,
  url            TEXT,
  raw_data       TEXT NOT NULL,
  tags           TEXT NOT NULL DEFAULT '[]',
  severity       TEXT NOT NULL DEFAULT 'INFO',
  enriched       INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lr_email     ON leak_records(email);
CREATE INDEX IF NOT EXISTS idx_lr_domain    ON leak_records(domain);
CREATE INDEX IF NOT EXISTS idx_lr_ip        ON leak_records(ip_address);
CREATE INDEX IF NOT EXISTS idx_lr_severity  ON leak_records(severity);
CREATE INDEX IF NOT EXISTS idx_lr_collected ON leak_records(collected_at);

-- enrichment_results: OTX + AbuseIPDB output per record
CREATE TABLE IF NOT EXISTS enrichment_results (
  id                      TEXT PRIMARY KEY,
  record_id               TEXT NOT NULL REFERENCES leak_records(id),
  enriched_at             TEXT NOT NULL,
  otx_pulse_count         INTEGER,
  otx_malicious           INTEGER,
  otx_categories          TEXT,
  otx_references          TEXT,
  abuse_confidence_score  INTEGER,
  abuse_isp               TEXT,
  abuse_country_code      TEXT,
  abuse_total_reports     INTEGER,
  abuse_last_reported_at  TEXT,
  composite_score         INTEGER NOT NULL DEFAULT 0,
  indicators              TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_er_record ON enrichment_results(record_id);

-- alerts: detection results with lifecycle state
CREATE TABLE IF NOT EXISTS alerts (
  id               TEXT PRIMARY KEY,
  record_id        TEXT NOT NULL REFERENCES leak_records(id),
  rule_id          TEXT NOT NULL,
  rule_name        TEXT NOT NULL,
  severity         TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'OPEN',
  composite_score  INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  acknowledged_by  TEXT,
  notes            TEXT
);

CREATE INDEX IF NOT EXISTS idx_al_status   ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_al_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_al_record   ON alerts(record_id);
CREATE INDEX IF NOT EXISTS idx_al_created  ON alerts(created_at);

-- collector_jobs: audit trail for each cron run
CREATE TABLE IF NOT EXISTS collector_jobs (
  id                TEXT PRIMARY KEY,
  source            TEXT NOT NULL,
  started_at        TEXT NOT NULL,
  finished_at       TEXT,
  records_fetched   INTEGER NOT NULL DEFAULT 0,
  records_inserted  INTEGER NOT NULL DEFAULT 0,
  errors            TEXT NOT NULL DEFAULT '[]'
);
