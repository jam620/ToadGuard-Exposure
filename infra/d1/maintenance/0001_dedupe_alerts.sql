-- DESTRUCTIVE — manual review + explicit confirmation required before running.
-- Not wired into `bun run migrate` / `migrate:staging`; this directory is not
-- auto-applied by anything, on purpose.
--
-- Removes duplicate alert rows so infra/d1/migrations/0004_alert_dedupe_index.sql
-- (CREATE UNIQUE INDEX idx_alerts_record_rule ON alerts(record_id, rule_id)) can
-- be applied. For each (record_id, rule_id) group, keeps the row with the
-- lowest `rowid` (SQLite's physical insertion order — the earliest alert),
-- so its `status`/`notes`/`acknowledged_by` history is preserved, and deletes
-- the rest.
--
-- Before running on staging:
--   1. Export a full backup: `wrangler d1 export toadguard-staging --env staging --output <path>`
--   2. Run the SELECT below (dry run) and confirm the count matches expectations
--   3. Get explicit go-ahead
--
-- Dry run (safe, read-only) — count rows this would delete:
--   SELECT COUNT(*) AS rows_to_delete FROM alerts
--   WHERE rowid NOT IN (SELECT MIN(rowid) FROM alerts GROUP BY record_id, rule_id);

DELETE FROM alerts
WHERE rowid NOT IN (
  SELECT MIN(rowid) FROM alerts GROUP BY record_id, rule_id
);
