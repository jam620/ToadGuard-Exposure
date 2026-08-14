import type { DetectionRule, LeakRecord } from '../types';

export const rules: DetectionRule[] = [
  {
    id: 'rule-001',
    name: 'Exposed Password Hash',
    description: 'Record contains a password hash indicating credential exposure',
    severity: 'HIGH',
    enabled: true,
    match: (r: LeakRecord) => Boolean(r.passwordHash),
  },
  {
    id: 'rule-002',
    name: 'Corporate Email Exposure',
    description: 'Work email address found in leak (non-consumer domain)',
    severity: 'HIGH',
    enabled: true,
    match: (r: LeakRecord) => {
      if (!r.email) return false;
      const consumerDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'proton.me'];
      const domain = r.email.split('@')[1] ?? '';
      return !consumerDomains.includes(domain);
    },
  },
  {
    id: 'rule-003',
    name: 'IP Address in Leak',
    description: 'Record contains an IP address suggesting infrastructure exposure',
    severity: 'MEDIUM',
    enabled: true,
    match: (r: LeakRecord) => Boolean(r.ipAddress),
  },
  {
    id: 'rule-004',
    name: 'Domain Breach',
    description: 'A domain has appeared in a breach dataset',
    severity: 'MEDIUM',
    enabled: true,
    match: (r: LeakRecord) => Boolean(r.domain),
  },
  {
    id: 'rule-005',
    name: 'Multi-field Credential Combo',
    description: 'Record contains both email and password hash (full credential combo)',
    severity: 'CRITICAL',
    enabled: true,
    match: (r: LeakRecord) => Boolean(r.email && r.passwordHash),
  },
  {
    id: 'rule-006',
    name: 'Telegram Source',
    description: 'Record originated from Telegram chatter — elevated risk',
    severity: 'HIGH',
    enabled: true,
    match: (r: LeakRecord) => r.tags.includes('telegram'),
  },
  {
    id: 'rule-007',
    name: 'Dark Web Source',
    description: 'Record originated from a dark web paste or forum',
    severity: 'HIGH',
    enabled: true,
    match: (r: LeakRecord) => r.tags.includes('darkweb') || r.tags.includes('paste'),
  },
];
