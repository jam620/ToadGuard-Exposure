/**
 * Temporary diagnostic logging for the staging /_trigger 500 investigation.
 * Redacts anything that looks like a token/secret/hash before it ever reaches
 * console output, since wrangler tail streams whatever we print here.
 * Remove once the root cause of the 500 is confirmed and fixed.
 */

// Matches long opaque tokens (bot tokens, JWT segments, password hashes, API keys).
const SECRET_LIKE = /[A-Za-z0-9_-]{24,}/g;

export function sanitizeErrorMessage(message: string): string {
  return message.replace(SECRET_LIKE, '[REDACTED]').slice(0, 300);
}

function reduceStack(stack: string | undefined): string {
  if (!stack) return 'n/a';
  return sanitizeErrorMessage(stack.split('\n').slice(0, 4).join(' | '));
}

/** Logs a stage-tagged, secret-free summary of a caught error. */
export function logStageError(
  stage: string,
  operation: string,
  err: unknown,
  context: Record<string, number | string> = {}
): void {
  const error = err instanceof Error ? err : new Error(String(err));
  const contextStr = Object.entries(context)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ');
  console.error(
    `[toadguard] stage=${stage} op=${operation} error="${sanitizeErrorMessage(error.message)}" stack="${reduceStack(error.stack)}"${contextStr ? ' ' + contextStr : ''}`
  );
}

/** Logs a stage-tagged summary line for counts/status, no error involved. */
export function logStageInfo(
  stage: string,
  operation: string,
  context: Record<string, number | string> = {}
): void {
  const contextStr = Object.entries(context)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ');
  console.log(`[toadguard] stage=${stage} op=${operation}${contextStr ? ' ' + contextStr : ''}`);
}
