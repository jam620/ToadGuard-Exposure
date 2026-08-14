# Webhooks — Integration Guide

## Payload Schema (JSON format)

```json
{
  "id": "alert-uuid",
  "recordId": "leak-record-uuid",
  "ruleId": "rule-001",
  "ruleName": "Exposed Password Hash",
  "severity": "HIGH",
  "status": "OPEN",
  "compositeScore": 75,
  "createdAt": "2024-10-01T12:00:00Z"
}
```

## CEF Format

```
CEF:0|ToadGuard|Exposure|1.0|rule-001|Exposed Password Hash|7|
rt=2024-10-01T12:00:00Z sev=HIGH score=75 rid=alert-uuid
```

## HMAC Signature

Every delivery includes the header `X-ToadGuard-Signature: sha256=<hex>`.

Verify in your receiver:

```python
import hmac, hashlib
expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
assert f"sha256={expected}" == request.headers["X-ToadGuard-Signature"]
```

## Retry Policy

- Max 5 attempts with exponential back-off: 5s, 25s, 125s, 625s, 3125s
- Delivery marked `success=false` after all retries exhausted
- Delivery history visible at `GET /api/v1/webhooks/:id/deliveries`

## Severity Filter

Set `minSeverity` on the webhook to receive only alerts at or above that level:
`CRITICAL > HIGH > MEDIUM > LOW > INFO`
