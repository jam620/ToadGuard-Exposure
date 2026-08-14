import type { AbuseIpDbResult, OtxResult, Severity } from '../types';

const SEVERITY_BASE: Record<Severity, number> = {
  CRITICAL: 80,
  HIGH: 60,
  MEDIUM: 40,
  LOW: 20,
  INFO: 5,
};

export function calculateCompositeScore(
  ruleSeverity: Severity,
  otx: OtxResult | undefined,
  abuseIpDb: AbuseIpDbResult | undefined
): number {
  let score = SEVERITY_BASE[ruleSeverity];

  if (otx?.malicious) score += 10;
  if ((otx?.pulseCount ?? 0) > 5) score += 5;

  if (abuseIpDb) {
    score += Math.floor(abuseIpDb.abuseConfidenceScore / 10);
  }

  return Math.min(100, Math.max(0, score));
}
