export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'DISMISSED' | 'RESOLVED';

export type Role = 'ADMIN' | 'ANALYST' | 'VIEWER';

export type WebhookFormat = 'JSON' | 'CEF';

export interface LeakRecord {
  id: string;
  sourceId: string;
  sourceName: string;
  collectedAt: string;
  normalizedAt: string;
  dedupeKey: string;
  email?: string;
  username?: string;
  passwordHash?: string;
  ipAddress?: string;
  domain?: string;
  url?: string;
  rawData: string;
  tags: string[];
  severity: Severity;
  enriched: boolean;
}

export interface OtxResult {
  pulseCount: number;
  malicious: boolean;
  categories: string[];
  references: string[];
}

export interface AbuseIpDbResult {
  abuseConfidenceScore: number;
  isp: string;
  countryCode: string;
  totalReports: number;
  lastReportedAt?: string;
}

export interface EnrichmentResult {
  recordId: string;
  enrichedAt: string;
  otx?: OtxResult;
  abuseIpDb?: AbuseIpDbResult;
  compositeScore: number;
  indicators: string[];
}

export interface Alert {
  id: string;
  recordId: string;
  ruleId: string;
  ruleName: string;
  severity: Severity;
  status: AlertStatus;
  compositeScore: number;
  enrichmentResult?: EnrichmentResult;
  createdAt: string;
  updatedAt: string;
  acknowledgedBy?: string;
  notes?: string;
}

export type Role_ = Role;

export interface User {
  id: string;
  email: string;
  displayName: string;
  oauthProvider: string;
  oauthSubject: string;
  roles: Role[];
  createdAt: string;
  lastLoginAt: string;
  active: boolean;
}

export interface Webhook {
  id: string;
  name: string;
  targetUrl: string;
  secret: string;
  format: WebhookFormat;
  enabled: boolean;
  minSeverity: Severity;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  alertId: string;
  attemptNumber: number;
  statusCode?: number;
  responseBody?: string;
  deliveredAt: string;
  success: boolean;
  errorMessage?: string;
}

export interface CollectorJob {
  jobId: string;
  source: string;
  startedAt: string;
  finishedAt?: string;
  recordsFetched: number;
  recordsInserted: number;
  errors: string[];
}

export interface NormalizerResult {
  record: LeakRecord;
  warnings: string[];
  droppedFields: string[];
}

export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

export interface JwtPayload {
  sub: string;
  email: string;
  roles: Role[];
  iat: number;
  exp: number;
  jti: string;
}

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  enabled: boolean;
  match: (record: LeakRecord) => boolean;
}

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ENVIRONMENT: string;
  HIBP_BASE_URL: string;
  RSS_FEED_URL: string;
  JWT_ALGORITHM: string;
  OTX_API_KEY?: string;
  ABUSEIPDB_API_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_IDS?: string;
  JWT_PRIVATE_KEY?: string;
  JWT_PUBLIC_KEY?: string;
  OAUTH_GOOGLE_CLIENT_ID?: string;
  OAUTH_GOOGLE_CLIENT_SECRET?: string;
  OAUTH_GITHUB_CLIENT_ID?: string;
  OAUTH_GITHUB_CLIENT_SECRET?: string;
  OAUTH_REDIRECT_BASE_URL?: string;
}
