import type { LanguageModel } from "ai";
import { generateText } from "ai";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { z } from "zod";
import { runAgent } from "../src/agent.ts";
import * as agentModule from "../src/agent.ts";
import { createRuntime } from "../src/runtime.ts";
import { runSubcall } from "../src/subcall.ts";
import { TraceBuilder } from "../src/trace.ts";
import { buildTools } from "../src/tools.ts";
import * as toolsModule from "../src/tools.ts";

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    generateText: vi.fn(),
  };
});

const mockGenerateText = vi.mocked(generateText);
const subModel = {} as LanguageModel;
const model = {} as LanguageModel;

function makeAdapter() {
  return {
    describe: () => "fixture source",
    list: vi.fn(async () => []),
    read: vi.fn(async (path: string) => `contents for ${path}`),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("runSubcall()", () => {
  it("keeps the untyped path unchanged", async () => {
    mockGenerateText.mockResolvedValue({
      text: "summary",
      usage: { inputTokens: 3, outputTokens: 4 },
    } as Awaited<ReturnType<typeof generateText>>);

    const node = await runSubcall({
      subModel,
      adapter: makeAdapter(),
      sourceName: "codebase",
      path: "src/auth.ts",
      task: "summarize this file",
    });

    expect(node.answer).toBe("summary");
    expect(node.structured).toBeUndefined();
    expect(node.schemaName).toBeUndefined();
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.not.objectContaining({ output: expect.anything() }),
    );
  });

  it("stores structured output when a schema is provided", async () => {
    const structured = [
      {
        line: 12,
        context: "fetch('/api')",
        verdict: "missing",
      },
    ] as const;

    mockGenerateText.mockResolvedValue({
      output: structured,
      usage: { inputTokens: 5, outputTokens: 6 },
    } as Awaited<ReturnType<typeof generateText>>);

    const node = await runSubcall({
      subModel,
      adapter: makeAdapter(),
      sourceName: "codebase",
      path: "src/auth.ts",
      task: "audit fetch handling",
      schemaName: "fetch-audit",
      schema: z.array(
        z.object({
          line: z.number(),
          context: z.string(),
          verdict: z.enum(["missing", "present"]),
        }),
      ),
    });

    expect(JSON.parse(node.answer)).toEqual(structured);
    expect(node.structured).toEqual(structured);
    expect(node.schemaName).toBe("fetch-audit");
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ output: expect.any(Object) }),
    );
  });

  it("rethrows structured output validation failures", async () => {
    const error = new Error("No object generated: response did not match schema.");
    mockGenerateText.mockRejectedValue(error);

    await expect(
      runSubcall({
        subModel,
        adapter: makeAdapter(),
        sourceName: "codebase",
        path: "src/auth.ts",
        task: "audit fetch handling",
        schemaName: "fetch-audit",
        schema: z.array(
          z.object({
            line: z.number(),
            context: z.string(),
            verdict: z.enum(["missing", "present"]),
          }),
        ),
      }),
    ).rejects.toBe(error);
  });
});

describe("buildTools().run_subcall", () => {
  it("returns a string while recording structured trace data", async () => {
    const structured = {
      verdict: "missing",
      context: "fetch('/api')",
    } as const;
    const events: Array<unknown> = [];
    const trace = new TraceBuilder("audit fetch handling");

    mockGenerateText.mockResolvedValue({
      output: structured,
      usage: { inputTokens: 2, outputTokens: 3 },
    } as Awaited<ReturnType<typeof generateText>>);

    const tools = buildTools({
      sources: { codebase: makeAdapter() },
      subModel,
      trace,
      onToolCall: (event) => events.push(event),
      subcallSchemas: {
        audit: z.object({
          verdict: z.enum(["missing", "present"]),
          context: z.string(),
        }),
      },
    });

    const result = await tools.run_subcall.execute!(
      {
        source: "codebase",
        path: "src/auth.ts",
        task: "audit fetch handling",
        schemaName: "audit",
      },
      {} as never,
    );

    const built = trace.build();

    expect(typeof result).toBe("string");
    if (typeof result !== "string") {
      throw new Error("Expected run_subcall to return a string");
    }

    expect(JSON.parse(result)).toEqual(structured);
    expect(events).toEqual([
      {
        tool: "run_subcall",
        args: {
          source: "codebase",
          path: "src/auth.ts",
          task: "audit fetch handling",
          schemaName: "audit",
        },
      },
    ]);
    expect(built.tree.children).toHaveLength(1);
    expect(built.tree.children[0]).toMatchObject({
      source: "codebase",
      path: "src/auth.ts",
      task: "audit fetch handling",
      schemaName: "audit",
      structured,
    });
    expect(built.tree.toolCalls[0]).toMatchObject({
      tool: "run_subcall",
      result,
    });
  });

  it("throws a helpful error for unknown schema names", async () => {
    const tools = buildTools({
      sources: { codebase: makeAdapter() },
      subModel,
      trace: new TraceBuilder("audit fetch handling"),
      subcallSchemas: {
        audit: z.string(),
        summary: z.object({ title: z.string() }),
      },
    });

    await expect(
      tools.run_subcall.execute!(
        {
          source: "codebase",
          path: "src/auth.ts",
          task: "audit fetch handling",
          schemaName: "missing",
        },
        {} as never,
      ),
    ).rejects.toThrow('Unknown subcall schema: "missing". Available schemas: audit, summary');
  });
});

describe("schema propagation", () => {
  it("forwards subcallSchemas from runAgent into buildTools", async () => {
    const buildToolsSpy = vi.spyOn(toolsModule, "buildTools").mockReturnValue({} as never);
    const trace = new TraceBuilder("audit fetch handling");
    const subcallSchemas = {
      audit: z.object({ verdict: z.enum(["missing", "present"]) }),
    };

    mockGenerateText.mockResolvedValue({
      steps: [],
      text: "",
      usage: { inputTokens: 0, outputTokens: 0 },
    } as any);

    await runAgent({
      model,
      subModel,
      task: "audit fetch handling",
      sources: { codebase: makeAdapter() },
      subcallSchemas,
      trace,
    });

    expect(buildToolsSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        subcallSchemas,
      }),
    );
  });

  it("forwards subcallSchemas from runtime.run into runAgent", async () => {
    const runAgentSpy = vi.spyOn(agentModule, "runAgent").mockResolvedValue({
      answer: "done",
      finishReason: "finish",
    });
    const runtime = createRuntime({ model, subModel });
    const subcallSchemas = {
      audit: z.object({ verdict: z.enum(["missing", "present"]) }),
    };

    await runtime.run({
      task: "audit fetch handling",
      sources: { codebase: makeAdapter() },
      subcallSchemas,
    });

    expect(runAgentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        subcallSchemas,
      }),
    );
  });
});
