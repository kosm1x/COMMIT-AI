import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetchWithRetry
vi.mock("../utils/fetchWithRetry", () => ({
  fetchWithRetry: vi.fn(),
}));

// Mock supabase
vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

// Mock RateLimiter — vi.hoisted ensures var is available when vi.mock factory runs
const { mockCanProceed } = vi.hoisted(() => ({
  mockCanProceed: vi.fn().mockReturnValue(true),
}));
vi.mock("../utils/security", () => ({
  RateLimiter: function () {
    (this as Record<string, unknown>).canProceed = mockCanProceed;
    (this as Record<string, unknown>).getWaitTime = vi.fn().mockReturnValue(0);
  },
}));

import { fetchWithRetry } from "../utils/fetchWithRetry";
import { supabase } from "../lib/supabase";
import {
  analyzeJournalEntry,
  extractObjectivesFromJournal,
  generateMindMap,
  completeIdea,
} from "./aiService";

const mockFetch = vi.mocked(fetchWithRetry);
const mockGetSession = vi.mocked(supabase.auth.getSession);

// Helper: simulate authenticated session
function mockAuthSession() {
  mockGetSession.mockResolvedValue({
    data: {
      session: {
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_in: 3600,
        expires_at: Date.now() / 1000 + 3600,
        token_type: "bearer",
        user: {
          id: "user-1",
          aud: "authenticated",
          role: "authenticated",
          email: "test@test.com",
          app_metadata: {},
          user_metadata: {},
          created_at: "",
        },
      },
    },
    error: null,
  } as ReturnType<typeof supabase.auth.getSession> extends Promise<infer T>
    ? T
    : never);
}

// Helper: simulate no session
function mockNoSession() {
  mockGetSession.mockResolvedValue({
    data: { session: null },
    error: null,
  } as ReturnType<typeof supabase.auth.getSession> extends Promise<infer T>
    ? T
    : never);
}

// Helper: create a successful proxy response
function proxyResponse(content: string) {
  return new Response(JSON.stringify({ content }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// Helper: create an error proxy response
function proxyError(status: number) {
  return new Response(JSON.stringify({ error: "fail" }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Set VITE_SUPABASE_URL for the module
vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("analyzeJournalEntry", () => {
  it("returns parsed AnalysisResult on valid API response", async () => {
    mockAuthSession();
    const apiResult = {
      emotions: [{ name: "Happy", intensity: 80 }],
      patterns: ["Positive outlook"],
      coping_strategies: ["Exercise"],
      primary_emotion: "Happy",
    };
    mockFetch.mockResolvedValueOnce(proxyResponse(JSON.stringify(apiResult)));

    const result = await analyzeJournalEntry("I feel great today!");

    expect(result.emotions).toHaveLength(1);
    expect(result.emotions[0].name).toBe("Happy");
    expect(result.emotions[0].color).toBeDefined();
    expect(result.patterns).toEqual(["Positive outlook"]);
    expect(result.coping_strategies).toEqual(["Exercise"]);
    expect(result.primary_emotion).toBe("Happy");
  });

  it("returns mock analysis when API fails", async () => {
    mockAuthSession();
    mockFetch.mockResolvedValueOnce(proxyError(502));

    const result = await analyzeJournalEntry("test entry");

    // Mock analysis should have standard structure
    expect(result.emotions.length).toBeGreaterThan(0);
    expect(result.patterns.length).toBeGreaterThan(0);
    expect(result.coping_strategies.length).toBeGreaterThan(0);
    expect(result.primary_emotion).toBeDefined();
  });

  it("returns mock analysis when no session", async () => {
    mockNoSession();

    const result = await analyzeJournalEntry("test entry");

    expect(result.emotions.length).toBeGreaterThan(0);
    expect(result.primary_emotion).toBeDefined();
  });

  it("returns language-aware mock analysis", async () => {
    mockNoSession();

    const esResult = await analyzeJournalEntry("test", "es");
    expect(esResult.emotions[0].name).not.toBe("Determined");

    const zhResult = await analyzeJournalEntry("test", "zh");
    expect(zhResult.emotions[0].name).not.toBe("Determined");
  });
});

describe("extractObjectivesFromJournal", () => {
  it("returns string array on valid response", async () => {
    mockAuthSession();
    const goals = ["Exercise daily", "Read more books"];
    mockFetch.mockResolvedValueOnce(proxyResponse(JSON.stringify(goals)));

    const result = await extractObjectivesFromJournal(
      "I want to exercise and read",
    );
    expect(result).toEqual(goals);
  });

  it("returns empty array on failure", async () => {
    mockNoSession();
    const result = await extractObjectivesFromJournal("test");
    expect(result).toEqual([]);
  });
});

describe("generateMindMap", () => {
  it("returns MindMapResult on valid response", async () => {
    mockAuthSession();
    const mindMap = {
      title: "Problem Analysis",
      mermaidSyntax: "mindmap\n  root((Test))",
    };
    mockFetch.mockResolvedValueOnce(proxyResponse(JSON.stringify(mindMap)));

    const result = await generateMindMap("How to improve productivity");
    expect(result.title).toBe("Problem Analysis");
    expect(result.mermaidSyntax).toContain("mindmap");
  });

  it("returns mock mind map on failure", async () => {
    mockNoSession();

    const result = await generateMindMap("test problem");
    expect(result.title).toBeDefined();
    expect(result.mermaidSyntax).toContain("mindmap");
  });
});

describe("completeIdea", () => {
  it("returns IdeaCompletionResult on valid response", async () => {
    mockAuthSession();
    const ideaResult = {
      title: "Great Idea",
      expandedContent: "Detailed expansion...",
      category: "technology",
      tags: ["tech", "innovation"],
      suggestions: ["Do research", "Build prototype"],
    };
    mockFetch.mockResolvedValueOnce(proxyResponse(JSON.stringify(ideaResult)));

    const result = await completeIdea("An app for...");
    expect(result.title).toBe("Great Idea");
    expect(result.category).toBe("technology");
    expect(result.tags).toHaveLength(2);
    expect(result.suggestions).toHaveLength(2);
  });

  it("returns mock completion on failure", async () => {
    mockNoSession();

    const result = await completeIdea("test idea");
    expect(result.title).toBeDefined();
    expect(result.expandedContent).toContain("test idea");
    expect(result.category).toBe("general");
    expect(result.tags.length).toBeGreaterThan(0);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});

describe("AbortController integration", () => {
  it("returns mock data when external signal is aborted", async () => {
    mockAuthSession();
    const controller = new AbortController();
    controller.abort();

    const result = await analyzeJournalEntry(
      "test entry",
      "en",
      controller.signal,
    );

    // Should return mock data (not throw)
    expect(result.emotions.length).toBeGreaterThan(0);
    expect(result.primary_emotion).toBeDefined();
    // fetchWithRetry should not have been called (abort happens before or during fetch)
    // The internal controller aborts immediately due to external signal
  });

  it("returns mock data when callLLM fetch is aborted mid-flight", async () => {
    mockAuthSession();
    const controller = new AbortController();

    // Mock fetchWithRetry to throw AbortError
    mockFetch.mockRejectedValueOnce(
      new DOMException("The operation was aborted", "AbortError"),
    );

    const result = await analyzeJournalEntry(
      "test entry",
      "en",
      controller.signal,
    );

    expect(result.emotions.length).toBeGreaterThan(0);
    expect(result.primary_emotion).toBeDefined();
  });
});

describe("rate limiter integration", () => {
  it("returns mock data when rate limiter denies", async () => {
    mockCanProceed.mockReturnValue(false);
    mockAuthSession();

    const result = await analyzeJournalEntry("test");
    // Should return mock data (not throw)
    expect(result.emotions.length).toBeGreaterThan(0);

    // Restore for other tests
    mockCanProceed.mockReturnValue(true);
  });
});
