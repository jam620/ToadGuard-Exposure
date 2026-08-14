import type { RawRecord } from './schema-validator';

export interface MappedFields {
  email?: string;
  username?: string;
  passwordPlain?: string;
  passwordHash?: string;
  ipAddress?: string;
  domain?: string;
  url?: string;
  tags: string[];
}

export function mapFields(raw: RawRecord, source: string): MappedFields {
  return {
    email: raw.email,
    username: raw.username,
    passwordPlain: raw.password,
    passwordHash: raw.password_hash,
    ipAddress: raw.ip ?? raw.ip_address,
    domain: raw.domain,
    url: raw.url,
    tags: [...(raw.tags ?? []), source],
  };
}
