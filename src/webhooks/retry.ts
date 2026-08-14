const DELAYS_MS = [5_000, 25_000, 125_000, 625_000, 3_125_000];

export interface RetryResult {
  success: boolean;
  statusCode?: number;
  responseBody?: string;
  errorMessage?: string;
  attempts: number;
}

export async function retryFetch(
  url: string,
  init: RequestInit,
  maxAttempts = 5
): Promise<RetryResult> {
  let lastError = '';

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const delay = DELAYS_MS[attempt - 1] ?? 5_000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (err) {
      lastError = String(err);
      continue;
    }

    const responseBody = await response.text().catch(() => '');

    if (response.ok) {
      return { success: true, statusCode: response.status, responseBody, attempts: attempt + 1 };
    }

    if (response.status < 500) {
      return {
        success: false,
        statusCode: response.status,
        responseBody,
        errorMessage: `HTTP ${response.status}`,
        attempts: attempt + 1,
      };
    }

    lastError = `HTTP ${response.status}`;
  }

  return { success: false, errorMessage: lastError, attempts: maxAttempts };
}
