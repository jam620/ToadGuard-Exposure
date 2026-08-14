-- Fixes two issues found while investigating the staging D1 "Exceeded maximum
-- DB size" incident (2026-08-14):
--
-- 1. alerts had no natural uniqueness: `id` is a fresh crypto.randomUUID() on
--    every detection, so `INSERT OR IGNORE INTO alerts` never collided and a
--    record whose rules matched on every cron tick kept accumulating rows.
--    record_id + rule_id is the alert's real identity — a given record can
--    only trigger a given rule once.
-- 2. the backfill query (`SELECT * FROM leak_records WHERE enriched = 0
--    ORDER BY created_at DESC LIMIT 30`) had no supporting index, so it did
--    a full table scan every 5 minutes against a growing table.
--
-- IMPORTANT: staging's `alerts` table already has duplicate (record_id,
-- rule_id) rows from the bug above. Creating the UNIQUE INDEX will FAIL
-- until those duplicates are removed — do NOT run this against staging
-- until infra/d1/maintenance/0001_dedupe_alerts.sql has been reviewed,
-- backed up, and explicitly approved.

CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_record_rule ON alerts(record_id, rule_id);

CREATE INDEX IF NOT EXISTS idx_lr_enriched_created ON leak_records(enriched, created_at DESC);
