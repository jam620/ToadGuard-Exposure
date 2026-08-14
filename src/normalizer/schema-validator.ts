import { z } from 'zod';

export const rawRecordSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  password_hash: z.string().optional(),
  ip: z.string().optional(),
  ip_address: z.string().optional(),
  domain: z.string().optional(),
  url: z.string().url().optional(),
  source: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

export type RawRecord = z.infer<typeof rawRecordSchema>;

export function validateRaw(input: unknown): RawRecord {
  return rawRecordSchema.parse(input);
}
