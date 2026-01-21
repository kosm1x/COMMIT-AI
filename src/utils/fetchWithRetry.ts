/**
 * Fetch with automatic retry for transient failures
 * Handles network errors, rate limits (429), and server errors (5xx)
 */

interface RetryOptions {
  /** Maximum number of retries (default: 2) */
  maxRetries?: number;
  /** Base delay in ms before first retry (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in ms (default: 5000) */
  maxDelay?: number;
  /** Custom function to determine if response should trigger retry */
  retryOn?: (response: Response) => boolean;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'signal'>> = {
  maxRetries: 2,
  baseDelay: 1000,
  maxDelay: 5000,
  retryOn: (res) => res.status >= 500 || res.status === 429,
};

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay with jitter
 */
function getBackoffDelay(attempt: number, baseDelay: number, maxDelay: number): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Fetch with automatic retry for transient failures
 * 
 * @example
 * const response = await fetchWithRetry('https://api.example.com/data', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ data: 'test' }),
 * }, { maxRetries: 3 });
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  const {
    maxRetries,
    baseDelay,
    maxDelay,
    retryOn,
  } = { ...DEFAULT_OPTIONS, ...options };

  let lastError: Error | null = null;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check if request was aborted
      if (options?.signal?.aborted) {
        throw new DOMException('Request aborted', 'AbortError');
      }

      const response = await fetch(url, {
        ...init,
        signal: options?.signal,
      });

      // Check if we should retry based on response
      if (retryOn(response) && attempt < maxRetries) {
        lastResponse = response;
        const delay = getBackoffDelay(attempt, baseDelay, maxDelay);
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on abort
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }

      // Network error - retry if attempts remaining
      if (attempt < maxRetries) {
        const delay = getBackoffDelay(attempt, baseDelay, maxDelay);
        await sleep(delay);
        continue;
      }
    }
  }

  // If we have a response (even with error status), return it
  if (lastResponse) {
    return lastResponse;
  }

  // Otherwise, throw the last error
  throw lastError || new Error('Request failed after retries');
}

/**
 * Create a fetch function with default retry options pre-configured
 */
export function createRetryFetch(defaultOptions: RetryOptions) {
  return (url: string, init?: RequestInit, options?: RetryOptions) =>
    fetchWithRetry(url, init, { ...defaultOptions, ...options });
}

export default fetchWithRetry;
