import type { LanguageModel } from "ai";
import { generateText } from "ai";
import { Effect } from "effect";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { MAX_STEPS_BY_PATTERN, route, type RoutingDecision } from "../src/router.ts";
import type { SourceAdapter } from "../src/sources/interface.ts";

// ---------------------------------------------------------------------------
// Module-level mock for `ai` — classifier dispatches via generateText + Output.object
// ---------------------------------------------------------------------------

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    generateText: vi.fn(),
  };
});

const mockGenerateText = vi.mocked(generateText);
const worker = {} as LanguageModel;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Axes = {
  decomposition: "atomic" | "aggregative" | "sequential" | "synthetic" | "exploratory";
  budget: "cheap" | "standard" | "deep";
  confidence: number;
  rationale: string;
};

function stubGenerateTextWith(output: Axes): void {
  mockGenerateText.mockResolvedValue({
    output,
    usage: { inputTokens: 0, outputTokens: 0 },
  } as Awaited<ReturnType<typeof generateText>>);
}

function stubGenerateTextReject(err: Error): void {
  mockGenerateText.mockRejectedValue(err);
}

function srcDescribeOnly(): SourceAdapter {
  return { describe: () => "describe-only" };
}

function srcList(): SourceAdapter {
  return { describe: () => "list", list: async () => [] };
}

function srcRead(): SourceAdapter {
  return { describe: () => "read", read: async () => "" };
}

function srcSearch(): SourceAdapter {
  return {
    describe: () => "search",
    search: async () => [],
  };
}

function srcTools(): SourceAdapter {
  return {
    describe: () => "tools",
    tools: () => ({}),
  };
}

function srcListRead(): SourceAdapter {
  return {
    describe: () => "list+read",
    list: async () => [],
    read: async () => "",
  };
}

async function runRoute(
  sources: Record<string, SourceAdapter>,
  task = "t",
): Promise<RoutingDecision> {
  return Effect.runPromise(route({ task, sources, worker }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Pattern selection via route() — exercises axis rule table
// ---------------------------------------------------------------------------

describe("route() — pattern selection rules", () => {
  it("atomic + cheap → direct", async () => {
    stubGenerateTextWith({
      decomposition: "atomic",
      budget: "cheap",
      confidence: 0.9,
      rationale: "single lookup",
    });
    const d = await runRoute({ docs: srcRead() });
    expect(d.pattern).toBe("direct");
    expect(d.classifierPattern).toBe("direct");
    expect(d.classifierFailed).toBe(false);
  });

  it("atomic + deep → direct (budget does NOT gate)", async () => {
    stubGenerateTextWith({
      decomposition: "atomic",
      budget: "deep",
      confidence: 0.9,
      rationale: "miscalibrated deep",
    });
    const d = await runRoute({ docs: srcRead() });
    expect(d.pattern).toBe("direct");
  });

  it("aggregative + source with hasSearch → fan-out", async () => {
    stubGenerateTextWith({
      decomposition: "aggregative",
      budget: "standard",
      confidence: 0.9,
      rationale: "independent lookups",
    });
    const d = await runRoute({ idx: srcSearch() });
    expect(d.pattern).toBe("fan-out");
  });

  it("aggregative + source with only hasList → fan-out", async () => {
    stubGenerateTextWith({
      decomposition: "aggregative",
      budget: "standard",
      confidence: 0.9,
      rationale: "list-based",
    });
    const d = await runRoute({ idx: srcList() });
    expect(d.pattern).toBe("fan-out");
  });

  it("aggregative + source with only hasTools → fan-out", async () => {
    stubGenerateTextWith({
      decomposition: "aggregative",
      budget: "standard",
      confidence: 0.9,
      rationale: "tools",
    });
    const d = await runRoute({ db: srcTools() });
    expect(d.pattern).toBe("fan-out");
  });

  it("aggregative + source with only hasRead → chain (not fannable)", async () => {
    stubGenerateTextWith({
      decomposition: "aggregative",
      budget: "standard",
      confidence: 0.9,
      rationale: "reads",
    });
    const d = await runRoute({ docs: srcRead() });
    expect(d.pattern).toBe("chain");
  });

  it("aggregative + source with no relevant capabilities → chain", async () => {
    stubGenerateTextWith({
      decomposition: "aggregative",
      budget: "standard",
      confidence: 0.9,
      rationale: "opaque",
    });
    const d = await runRoute({ opaque: srcDescribeOnly() });
    expect(d.pattern).toBe("chain");
  });

  it("sequential + any sources → chain", async () => {
    stubGenerateTextWith({
      decomposition: "sequential",
      budget: "standard",
      confidence: 0.9,
      rationale: "multi-hop",
    });
    const d = await runRoute({ docs: srcListRead(), idx: srcSearch() });
    expect(d.pattern).toBe("chain");
  });

  it("synthetic + any sources → recursive", async () => {
    stubGenerateTextWith({
      decomposition: "synthetic",
      budget: "standard",
      confidence: 0.9,
      rationale: "joint reasoning",
    });
    const d = await runRoute({ docs: srcListRead() });
    expect(d.pattern).toBe("recursive");
  });

  it("exploratory + any sources → recursive", async () => {
    stubGenerateTextWith({
      decomposition: "exploratory",
      budget: "standard",
      confidence: 0.9,
      rationale: "scope unknown",
    });
    const d = await runRoute({ docs: srcListRead(), idx: srcSearch() });
    expect(d.pattern).toBe("recursive");
  });
});

// ---------------------------------------------------------------------------
// Confidence threshold and fallback behavior
// ---------------------------------------------------------------------------

describe("route() — confidence and fallback", () => {
  it("low confidence triggers fallback; classifierPattern preserves pre-fallback choice", async () => {
    stubGenerateTextWith({
      decomposition: "aggregative",
      budget: "standard",
      confidence: 0.4,
      rationale: "uncertain",
    });
    const d = await runRoute({ idx: srcSearch() });
    expect(d.pattern).toBe("recursive");
    expect(d.classifierPattern).toBe("fan-out");
    expect(d.classifierFailed).toBe(false);
  });

  it("high confidence uses classifier pattern directly", async () => {
    stubGenerateTextWith({
      decomposition: "aggregative",
      budget: "standard",
      confidence: 0.95,
      rationale: "clear fan-out",
    });
    const d = await runRoute({ idx: srcSearch() });
    expect(d.pattern).toBe(d.classifierPattern);
    expect(d.pattern).toBe("fan-out");
  });
});

// ---------------------------------------------------------------------------
// Totality — classifier failure does NOT fail the Effect
// ---------------------------------------------------------------------------

describe("route() — totality", () => {
  it("classifier rejection produces a fallback decision with classifierFailed: true", async () => {
    stubGenerateTextReject(new Error("worker blew up"));
    const d = await runRoute({ idx: srcSearch() });

    expect(d.classifierFailed).toBe(true);
    expect(d.pattern).toBe("recursive");
    expect(d.classifierPattern).toBe("recursive");
    expect(d.axes.rationale.startsWith("classifier failed:")).toBe(true);
    expect(d.axes.confidence).toBe(0);
  });

  it("records classifierDurationMs as a finite non-negative number", async () => {
    stubGenerateTextWith({
      decomposition: "synthetic",
      budget: "standard",
      confidence: 0.9,
      rationale: "t",
    });
    const d = await runRoute({ docs: srcListRead() });
    expect(Number.isFinite(d.classifierDurationMs)).toBe(true);
    expect(d.classifierDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("Effect.Effect<RoutingDecision, never> — error channel type-level check", () => {
    const _totalityCheck: Effect.Effect<RoutingDecision, never> = route({
      task: "t",
      sources: {},
      worker,
    });
    void _totalityCheck;
    expect(true).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// MAX_STEPS_BY_PATTERN constant
// ---------------------------------------------------------------------------

describe("MAX_STEPS_BY_PATTERN", () => {
  it("has expected defaults per pattern", () => {
    expect(MAX_STEPS_BY_PATTERN.direct).toBe(5);
    expect(MAX_STEPS_BY_PATTERN["fan-out"]).toBe(10);
    expect(MAX_STEPS_BY_PATTERN.chain).toBe(30);
    expect(MAX_STEPS_BY_PATTERN.recursive).toBe(100);
  });
});
