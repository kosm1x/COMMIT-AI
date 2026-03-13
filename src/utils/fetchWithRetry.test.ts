import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWithRetry, createRetryFetch } from "./fetchWithRetry";

describe("fetchWithRetry", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("succeeds on first try", async () => {
    mockFetch.mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const res = await fetchWithRetry("https://example.com");
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries on 500 and succeeds on second attempt", async () => {
    mockFetch
      .mockResolvedValueOnce(new Response("error", { status: 500 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const res = await fetchWithRetry("https://example.com", undefined, {
      maxRetries: 2,
      baseDelay: 1,
      maxDelay: 5,
    });

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("retries on 429", async () => {
    mockFetch
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const res = await fetchWithRetry("https://example.com", undefined, {
      maxRetries: 2,
      baseDelay: 1,
      maxDelay: 5,
    });

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 4xx other than 429", async () => {
    mockFetch.mockResolvedValueOnce(new Response("bad", { status: 400 }));

    const res = await fetchWithRetry("https://example.com", undefined, {
      maxRetries: 2,
      baseDelay: 1,
    });

    expect(res.status).toBe(400);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("retries on network error (TypeError)", async () => {
    mockFetch
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const res = await fetchWithRetry("https://example.com", undefined, {
      maxRetries: 2,
      baseDelay: 1,
      maxDelay: 5,
    });

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("returns last response when retries exhausted on server error", async () => {
    mockFetch
      .mockResolvedValueOnce(new Response("err1", { status: 500 }))
      .mockResolvedValueOnce(new Response("err2", { status: 502 }))
      .mockResolvedValueOnce(new Response("err3", { status: 503 }));

    const res = await fetchWithRetry("https://example.com", undefined, {
      maxRetries: 2,
      baseDelay: 1,
      maxDelay: 5,
    });

    // Should return the last response
    expect(res.status).toBe(503);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("throws when retries exhausted on network errors", async () => {
    const error = new TypeError("Failed to fetch");
    mockFetch.mockRejectedValue(error);

    await expect(
      fetchWithRetry("https://example.com", undefined, {
        maxRetries: 1,
        baseDelay: 1,
        maxDelay: 5,
      }),
    ).rejects.toThrow("Failed to fetch");

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("aborts immediately without retry on AbortSignal", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      fetchWithRetry("https://example.com", undefined, {
        maxRetries: 2,
        signal: controller.signal,
      }),
    ).rejects.toThrow("Request aborted");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("uses custom retryOn callback", async () => {
    mockFetch
      .mockResolvedValueOnce(new Response("custom", { status: 418 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const res = await fetchWithRetry("https://example.com", undefined, {
      maxRetries: 2,
      baseDelay: 1,
      maxDelay: 5,
      retryOn: (response) => response.status === 418,
    });

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe("createRetryFetch", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("applies default options from factory", async () => {
    mockFetch
      .mockResolvedValueOnce(new Response("err", { status: 500 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const retryFetch = createRetryFetch({
      maxRetries: 1,
      baseDelay: 1,
      maxDelay: 5,
    });

    const res = await retryFetch("https://example.com");
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
