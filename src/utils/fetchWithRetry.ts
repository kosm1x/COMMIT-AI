/**
 * Fetch wrapper with automatic retry logic for network resilience
 */

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryOn?: (response: Response) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryOn: (response) => response.status >= 500 || response.status === 429,
};

/**
 * Sleep for a given number of milliseconds
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay with jitter
 */
const getBackoffDelay = (attempt: number, baseDelay: number, maxDelay: number): number => {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  // Add jitter (random factor between 0.5 and 1.5)
  const jitter = 0.5 + Math.random();
  const delay = exponentialDelay * jitter;
  // Cap at maxDelay
  return Math.min(delay, maxDelay);
};

/**
 * Fetch with automatic retry on failure
 * 
 * @param url - URL to fetch
 * @param init - Fetch init options
 * @param options - Retry options
 * @returns Promise<Response>
 */
export async function fetchWithRetry(
  url: string | URL | Request,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);
      
      // Check if we should retry based on response
      if (opts.retryOn(response) && attempt < opts.maxRetries) {
        const delay = getBackoffDelay(attempt, opts.baseDelay, opts.maxDelay);
        if (import.meta.env.DEV) {
          console.warn(`Request failed with status ${response.status}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${opts.maxRetries})`);
        }
        await sleep(delay);
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error as Error;
      
      // Network error - retry if we have attempts left
      if (attempt < opts.maxRetries) {
        const delay = getBackoffDelay(attempt, opts.baseDelay, opts.maxDelay);
        if (import.meta.env.DEV) {
          console.warn(`Network error, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${opts.maxRetries}):`, error);
        }
        await sleep(delay);
        continue;
      }
    }
  }
  
  // All retries exhausted
  throw lastError || new Error('Request failed after retries');
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Wait for the browser to come back online
 * @param timeout - Maximum time to wait in ms (default: 30000)
 * @returns Promise that resolves when online or rejects on timeout
 */
export function waitForOnline(timeout = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isOnline()) {
      resolve();
      return;
    }
    
    const timeoutId = setTimeout(() => {
      window.removeEventListener('online', handleOnline);
      reject(new Error('Timeout waiting for network'));
    }, timeout);
    
    const handleOnline = () => {
      clearTimeout(timeoutId);
      resolve();
    };
    
    window.addEventListener('online', handleOnline, { once: true });
  });
}

export default fetchWithRetry;
