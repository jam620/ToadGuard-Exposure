import type { Alert } from '../types';

const SEVERITY_CEF: Record<string, number> = {
  CRITICAL: 10,
  HIGH: 7,
  MEDIUM: 5,
  LOW: 3,
  INFO: 1,
};

export function formatJson(alert: Alert): string {
  return JSON.stringify({
    id: alert.id,
    recordId: alert.recordId,
    ruleId: alert.ruleId,
    ruleName: alert.ruleName,
    severity: alert.severity,
    status: alert.status,
    compositeScore: alert.compositeScore,
    createdAt: alert.createdAt,
  });
}

export function formatCef(alert: Alert): string {
  const sev = SEVERITY_CEF[alert.severity] ?? 1;
  return (
    `CEF:0|ToadGuard|Exposure|1.0|${alert.ruleId}|${alert.ruleName}|${sev}|` +
    `rt=${alert.createdAt} sev=${alert.severity} score=${alert.compositeScore} rid=${alert.id}`
  );
}
