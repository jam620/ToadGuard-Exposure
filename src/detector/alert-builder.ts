import type { Alert, DetectionRule, EnrichmentResult, LeakRecord } from '../types';

export function buildAlert(
  record: LeakRecord,
  rule: DetectionRule,
  enrichmentResult: EnrichmentResult | undefined,
  compositeScore: number
): Alert {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    recordId: record.id,
    ruleId: rule.id,
    ruleName: rule.name,
    severity: rule.severity,
    status: 'OPEN',
    compositeScore,
    enrichmentResult,
    createdAt: now,
    updatedAt: now,
  };
}
