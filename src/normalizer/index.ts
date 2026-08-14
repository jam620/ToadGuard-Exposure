import type { LeakRecord, NormalizerResult, Severity } from '../types';

import { mapFields } from './field-mapper';
import { sha256 } from './hash-util';
import { validateRaw } from './schema-validator';

export async function normalize(raw: unknown, source: string): Promise<NormalizerResult> {
  const warnings: string[] = [];
  const droppedFields: string[] = [];

  const validated = validateRaw(raw);
  const mapped = mapFields(validated, source);

  if (mapped.passwordPlain) {
    droppedFields.push('passwordPlain');
  }

  const severity = inferSeverity(mapped);
  const dedupeInput = [mapped.email, mapped.domain, mapped.passwordHash, source]
    .filter(Boolean)
    .join('|');
  const dedupeKey = await sha256(dedupeInput || source + Date.now());

  if (!mapped.email && !mapped.ipAddress && !mapped.domain) {
    warnings.push('Record has no email, IP, or domain — limited detection coverage');
  }

  const now = new Date().toISOString();
  const record: LeakRecord = {
    id: crypto.randomUUID(),
    sourceId: source,
    sourceName: source,
    collectedAt: now,
    normalizedAt: now,
    dedupeKey,
    email: mapped.email,
    username: mapped.username,
    passwordHash: mapped.passwordHash,
    ipAddress: mapped.ipAddress,
    domain: mapped.domain,
    url: mapped.url,
    rawData: JSON.stringify(raw),
    tags: mapped.tags,
    severity,
    enriched: false,
  };

  return { record, warnings, droppedFields };
}

function inferSeverity(mapped: ReturnType<typeof mapFields>): Severity {
  if (mapped.passwordPlain || mapped.passwordHash) return 'HIGH';
  if (mapped.email && mapped.domain) return 'MEDIUM';
  if (mapped.ipAddress) return 'LOW';
  return 'INFO';
}
