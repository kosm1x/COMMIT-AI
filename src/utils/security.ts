/**
 * Security utilities for input validation and sanitization
 */

// HTML entity encoding map
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Escapes HTML entities to prevent XSS
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Strips HTML tags from a string (basic XSS prevention)
 */
export function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim();
}

/**
 * Sanitizes user input by stripping HTML and trimming
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return stripHtmlTags(input).trim();
}

/**
 * Validates that a string is within acceptable length
 */
export function validateLength(
  str: string,
  minLength: number = 0,
  maxLength: number = 10000
): boolean {
  const length = str?.length || 0;
  return length >= minLength && length <= maxLength;
}

/**
 * Validates a title field
 */
export function validateTitle(title: string): { valid: boolean; error?: string } {
  if (!title?.trim()) {
    return { valid: false, error: 'Title is required' };
  }
  if (title.length > 500) {
    return { valid: false, error: 'Title must be 500 characters or less' };
  }
  return { valid: true };
}

/**
 * Validates a description field
 */
export function validateDescription(description: string): { valid: boolean; error?: string } {
  if (description && description.length > 10000) {
    return { valid: false, error: 'Description must be 10,000 characters or less' };
  }
  return { valid: true };
}

/**
 * Validates an email address
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Rate limiting helper - simple token bucket implementation
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(maxTokens: number = 10, refillRate: number = 1) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  canProceed(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  getWaitTime(): number {
    this.refill();
    if (this.tokens >= 1) return 0;
    return (1 - this.tokens) / this.refillRate * 1000;
  }
}

/**
 * Validates AI service response
 */
export function validateAIResponse(response: unknown): boolean {
  if (!response || typeof response !== 'object') return false;
  return true;
}

/**
 * Sanitizes AI-generated content before rendering
 */
export function sanitizeAIContent(content: string): string {
  if (!content) return '';
  // Strip any HTML that might have been injected
  let sanitized = stripHtmlTags(content);
  // Limit length
  if (sanitized.length > 50000) {
    sanitized = sanitized.slice(0, 50000) + '...';
  }
  return sanitized;
}

