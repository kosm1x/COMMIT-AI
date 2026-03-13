import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  escapeHtml,
  stripHtmlTags,
  sanitizeInput,
  validateLength,
  validateTitle,
  validateDescription,
  validateEmail,
  RateLimiter,
  validateAIResponse,
  sanitizeAIContent,
} from "./security";

describe("escapeHtml", () => {
  it("escapes ampersand", () => {
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes less-than", () => {
    expect(escapeHtml("a < b")).toBe("a &lt; b");
  });

  it("escapes greater-than", () => {
    expect(escapeHtml("a > b")).toBe("a &gt; b");
  });

  it("escapes double quotes", () => {
    expect(escapeHtml('a "b" c')).toBe("a &quot;b&quot; c");
  });

  it("escapes single quotes", () => {
    expect(escapeHtml("a 'b' c")).toBe("a &#x27;b&#x27; c");
  });

  it("escapes forward slash", () => {
    expect(escapeHtml("a / b")).toBe("a &#x2F; b");
  });

  it("returns clean string unchanged", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});

describe("stripHtmlTags", () => {
  it("removes HTML tags and preserves content", () => {
    expect(stripHtmlTags("<p>hello</p>")).toBe("hello");
  });

  it("removes nested tags", () => {
    expect(stripHtmlTags("<div><b>bold</b> text</div>")).toBe("bold text");
  });

  it("trims result", () => {
    expect(stripHtmlTags("  <p>hello</p>  ")).toBe("hello");
  });

  it("returns plain string as-is", () => {
    expect(stripHtmlTags("no tags here")).toBe("no tags here");
  });
});

describe("sanitizeInput", () => {
  it("strips HTML and trims", () => {
    expect(sanitizeInput("  <b>test</b>  ")).toBe("test");
  });

  it("returns empty string for falsy input", () => {
    expect(sanitizeInput("")).toBe("");
    expect(sanitizeInput(null as unknown as string)).toBe("");
    expect(sanitizeInput(undefined as unknown as string)).toBe("");
  });
});

describe("validateLength", () => {
  it("accepts string within bounds", () => {
    expect(validateLength("hello", 1, 10)).toBe(true);
  });

  it("accepts string at exact min length", () => {
    expect(validateLength("ab", 2, 10)).toBe(true);
  });

  it("accepts string at exact max length", () => {
    expect(validateLength("abcde", 1, 5)).toBe(true);
  });

  it("rejects string below min length", () => {
    expect(validateLength("a", 2, 10)).toBe(false);
  });

  it("rejects string above max length", () => {
    expect(validateLength("abcdef", 1, 5)).toBe(false);
  });

  it("handles null/undefined by treating length as 0", () => {
    expect(validateLength(null as unknown as string, 0, 10)).toBe(true);
    expect(validateLength(null as unknown as string, 1, 10)).toBe(false);
  });
});

describe("validateTitle", () => {
  it("requires non-empty title", () => {
    expect(validateTitle("")).toEqual({
      valid: false,
      error: "Title is required",
    });
  });

  it("requires non-whitespace title", () => {
    expect(validateTitle("   ")).toEqual({
      valid: false,
      error: "Title is required",
    });
  });

  it("rejects title over 500 chars", () => {
    const long = "a".repeat(501);
    expect(validateTitle(long)).toEqual({
      valid: false,
      error: "Title must be 500 characters or less",
    });
  });

  it("accepts valid title", () => {
    expect(validateTitle("My Goal")).toEqual({ valid: true });
  });
});

describe("validateDescription", () => {
  it("rejects description over 10000 chars", () => {
    const long = "a".repeat(10001);
    expect(validateDescription(long)).toEqual({
      valid: false,
      error: "Description must be 10,000 characters or less",
    });
  });

  it("accepts valid description", () => {
    expect(validateDescription("A good description")).toEqual({ valid: true });
  });

  it("accepts empty description", () => {
    expect(validateDescription("")).toEqual({ valid: true });
  });
});

describe("validateEmail", () => {
  it("accepts valid email", () => {
    expect(validateEmail("user@example.com")).toBe(true);
  });

  it("rejects email without @", () => {
    expect(validateEmail("userexample.com")).toBe(false);
  });

  it("rejects email without domain", () => {
    expect(validateEmail("user@")).toBe(false);
  });

  it("rejects email with spaces", () => {
    expect(validateEmail("user @example.com")).toBe(false);
  });
});

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to maxTokens requests", () => {
    const limiter = new RateLimiter(3, 1);
    expect(limiter.canProceed()).toBe(true);
    expect(limiter.canProceed()).toBe(true);
    expect(limiter.canProceed()).toBe(true);
  });

  it("denies when tokens exhausted", () => {
    const limiter = new RateLimiter(2, 1);
    limiter.canProceed();
    limiter.canProceed();
    expect(limiter.canProceed()).toBe(false);
  });

  it("refills tokens over time", () => {
    const limiter = new RateLimiter(2, 1);
    limiter.canProceed();
    limiter.canProceed();
    expect(limiter.canProceed()).toBe(false);

    // Advance 1 second — should refill 1 token
    vi.advanceTimersByTime(1000);
    expect(limiter.canProceed()).toBe(true);
  });

  it("does not exceed maxTokens on refill", () => {
    const limiter = new RateLimiter(2, 1);
    // Advance 10 seconds without consuming
    vi.advanceTimersByTime(10000);
    // Should still only have 2 tokens (maxTokens)
    expect(limiter.canProceed()).toBe(true);
    expect(limiter.canProceed()).toBe(true);
    expect(limiter.canProceed()).toBe(false);
  });

  it("getWaitTime returns 0 when tokens available", () => {
    const limiter = new RateLimiter(5, 1);
    expect(limiter.getWaitTime()).toBe(0);
  });

  it("getWaitTime returns positive value when exhausted", () => {
    const limiter = new RateLimiter(1, 1);
    limiter.canProceed();
    const waitTime = limiter.getWaitTime();
    expect(waitTime).toBeGreaterThan(0);
    expect(waitTime).toBeLessThanOrEqual(1000);
  });
});

describe("validateAIResponse", () => {
  it("returns false for null", () => {
    expect(validateAIResponse(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(validateAIResponse(undefined)).toBe(false);
  });

  it("returns false for non-object", () => {
    expect(validateAIResponse("string")).toBe(false);
    expect(validateAIResponse(42)).toBe(false);
  });

  it("returns true for object", () => {
    expect(validateAIResponse({ key: "value" })).toBe(true);
  });
});

describe("sanitizeAIContent", () => {
  it("strips HTML from content", () => {
    expect(sanitizeAIContent("<script>alert('xss')</script>hello")).toBe(
      "alert('xss')hello",
    );
  });

  it("truncates content at 50000 chars", () => {
    const long = "a".repeat(50001);
    const result = sanitizeAIContent(long);
    expect(result.length).toBe(50003); // 50000 + "..."
    expect(result.endsWith("...")).toBe(true);
  });

  it("returns empty string for falsy input", () => {
    expect(sanitizeAIContent("")).toBe("");
    expect(sanitizeAIContent(null as unknown as string)).toBe("");
  });
});
