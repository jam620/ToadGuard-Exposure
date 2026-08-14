# D1 Schema & Migrations

## Tables

| Table | Description |
|-------|-------------|
| `leak_records` | Canonical normalized leak entries |
| `enrichment_results` | OTX + AbuseIPDB output linked to a record |
| `alerts` | Detection results with OPEN → ACKNOWLEDGED → RESOLVED lifecycle |
| `collector_jobs` | Audit trail of each scheduled collector run |
| `users` | OAuth-provisioned user accounts |
| `roles` | Fixed set: ADMIN, ANALYST, VIEWER |
| `user_roles` | Many-to-many user↔role assignment |
| `webhooks` | Outbound SIEM/tool integrations |
| `webhook_deliveries` | Per-alert delivery history with retry tracking |

## Running migrations locally

```bash
bun run migrate
```

## Running migrations on staging

```bash
bun run migrate:staging
```

## Adding a new migration

1. Create `infra/d1/migrations/000N_description.sql`
2. Add it to the `migrate` and `migrate:staging` scripts in `package.json`
3. Run locally to verify
