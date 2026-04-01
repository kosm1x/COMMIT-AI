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

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.data.emotions).toHaveLength(1);
      expect(result.data.emotions[0].name).toBe("Happy");
      expect(result.data.emotions[0].color).toBeDefined();
      expect(result.data.patterns).toEqual(["Positive outlook"]);
      expect(result.data.coping_strategies).toEqual(["Exercise"]);
      expect(result.data.primary_emotion).toBe("Happy");
    }
  });

  it("returns mock analysis when API fails", async () => {
    mockAuthSession();
    mockFetch.mockResolvedValueOnce(proxyError(502));

    const result = await analyzeJournalEntry("test entry");

    // Mock analysis should have standard structure
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.data.emotions.length).toBeGreaterThan(0);
      expect(result.data.patterns.length).toBeGreaterThan(0);
      expect(result.data.coping_strategies.length).toBeGreaterThan(0);
      expect(result.data.primary_emotion).toBeDefined();
    }
  });

  it("returns mock analysis when no session", async () => {
    mockNoSession();

    const result = await analyzeJournalEntry("test entry");

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.data.emotions.length).toBeGreaterThan(0);
      expect(result.data.primary_emotion).toBeDefined();
    }
  });

  it("returns language-aware mock analysis", async () => {
    mockNoSession();

    const esResult = await analyzeJournalEntry("test", "es");
    expect(esResult.status).toBe("ok");
    if (esResult.status === "ok") {
      expect(esResult.data.emotions[0].name).not.toBe("Determined");
    }

    const zhResult = await analyzeJournalEntry("test", "zh");
    expect(zhResult.status).toBe("ok");
    if (zhResult.status === "ok") {
      expect(zhResult.data.emotions[0].name).not.toBe("Determined");
    }
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
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.data.title).toBe("Problem Analysis");
      expect(result.data.mermaidSyntax).toContain("mindmap");
    }
  });

  it("returns mock mind map on failure", async () => {
    mockNoSession();

    const result = await generateMindMap("test problem");
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.data.title).toBeDefined();
      expect(result.data.mermaidSyntax).toContain("mindmap");
    }
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
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.data.title).toBe("Great Idea");
      expect(result.data.category).toBe("technology");
      expect(result.data.tags).toHaveLength(2);
      expect(result.data.suggestions).toHaveLength(2);
    }
  });

  it("returns mock completion on failure", async () => {
    mockNoSession();

    const result = await completeIdea("test idea");
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.data.title).toBeDefined();
      expect(result.data.expandedContent).toContain("test idea");
      expect(result.data.category).toBe("general");
      expect(result.data.tags.length).toBeGreaterThan(0);
      expect(result.data.suggestions.length).toBeGreaterThan(0);
    }
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
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.data.emotions.length).toBeGreaterThan(0);
      expect(result.data.primary_emotion).toBeDefined();
    }
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

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.data.emotions.length).toBeGreaterThan(0);
      expect(result.data.primary_emotion).toBeDefined();
    }
  });
});

describe("rate limiter integration", () => {
  it("returns mock data when rate limiter denies", async () => {
    mockCanProceed.mockReturnValue(false);
    mockAuthSession();

    const result = await analyzeJournalEntry("test");
    // Should return mock data (not throw)
    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.data.emotions.length).toBeGreaterThan(0);
    }

    // Restore for other tests
    mockCanProceed.mockReturnValue(true);
  });
});
