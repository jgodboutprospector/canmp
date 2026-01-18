/**
 * Utility functions for API calls with retry and timeout support
 */

export class FetchError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

/**
 * Fetch with timeout support
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new FetchError(`Request timeout after ${timeoutMs}ms`, 408, url);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with retry and exponential backoff
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  config: {
    maxRetries?: number;
    baseDelayMs?: number;
    timeoutMs?: number;
    retryOnStatus?: number[];
  } = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    timeoutMs = 30000,
    retryOnStatus = [408, 429, 500, 502, 503, 504],
  } = config;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);

      if (retryOnStatus.includes(response.status) && attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

/**
 * Sanitize error messages to remove sensitive data
 */
export function sanitizeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  // Remove potential API keys, tokens, passwords
  return message
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]')
    .replace(/api[_-]?key[=:]\s*["']?[A-Za-z0-9\-._]+["']?/gi, 'api_key=[REDACTED]')
    .replace(/password[=:]\s*["']?[^"'\s]+["']?/gi, 'password=[REDACTED]')
    .replace(/secret[=:]\s*["']?[A-Za-z0-9\-._]+["']?/gi, 'secret=[REDACTED]');
}
