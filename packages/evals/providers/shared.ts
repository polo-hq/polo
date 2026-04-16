import path from "node:path";
import type { LanguageModel, ModelMessage } from "ai";
import type { ProviderResponse } from "promptfoo";

export interface NormalizedUsage {
  input: number;
  output: number;
  total: number;
  cached: number;
}

export interface ParsedPrompt {
  task: string;
  chatTurns?: string[];
  scenarioName?: string;
}

export interface PromptfooEvalResult {
  output: string;
  prepTokens: number;
  actionUsage: NormalizedUsage;
  prepMs: number;
  actionMs: number;
  metadata: Record<string, unknown>;
}

export function repoRootFromImport(importMetaUrl: string): string {
  const providerDir = path.dirname(new URL(importMetaUrl).pathname);
  return path.resolve(providerDir, "../../..");
}

export function resolveFromProvider(importMetaUrl: string, relativePath?: string): string {
  const providerDir = path.dirname(new URL(importMetaUrl).pathname);
  return relativePath
    ? path.resolve(providerDir, relativePath)
    : path.resolve(
        repoRootFromImport(importMetaUrl),
        "packages/evals/corpus/eval-corpus/packages/next/src",
      );
}

export async function getLanguageModel(
  providerName: string,
  modelName: string,
): Promise<LanguageModel> {
  if (providerName === "openrouter") {
    const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
    const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
    return openrouter.chat(modelName);
  }

  if (providerName === "anthropic") {
    const { anthropic } = await import("@ai-sdk/anthropic");
    return anthropic(modelName);
  }

  const { openai } = await import("@ai-sdk/openai");
  return openai(modelName);
}

export function normalizeUsage(
  usage:
    | {
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
        cachedInputTokens?: number;
        inputTokenDetails?: { cacheReadTokens?: number };
        cachedTokens?: number;
      }
    | null
    | undefined,
): NormalizedUsage {
  const input = usage?.inputTokens ?? 0;
  const output = usage?.outputTokens ?? 0;
  const total = usage?.totalTokens ?? input + output;
  const cached =
    usage?.cachedInputTokens ??
    usage?.inputTokenDetails?.cacheReadTokens ??
    usage?.cachedTokens ??
    0;
  return { input, output, total, cached };
}

export function toPromptfooResponse(result: PromptfooEvalResult): ProviderResponse {
  const totalTokens = result.prepTokens + result.actionUsage.total;
  return {
    output: result.output,
    latencyMs: result.prepMs + result.actionMs,
    tokenUsage: {
      total: totalTokens,
      prompt: result.prepTokens + result.actionUsage.input,
      completion: result.actionUsage.output,
      cached: result.actionUsage.cached,
      completionDetails: {
        cacheReadInputTokens: result.actionUsage.cached,
      },
    },
    metadata: {
      ...result.metadata,
      tokenUsage: {
        prep: result.prepTokens,
        action: result.actionUsage.total,
        total: totalTokens,
        cached: result.actionUsage.cached,
      },
      timing: {
        prepMs: result.prepMs,
        actionMs: result.actionMs,
        totalMs: result.prepMs + result.actionMs,
      },
    },
  };
}

export function parsePromptPayload(prompt: string): ParsedPrompt {
  try {
    const parsed = JSON.parse(prompt) as unknown;
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return {
        task: parsed[0] ?? "",
        chatTurns: parsed,
      };
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { turns?: unknown }).turns) &&
      (parsed as { turns: unknown[] }).turns.every((item) => typeof item === "string")
    ) {
      const scenario = parsed as { name?: unknown; turns: string[] };
      return {
        task: scenario.turns[0] ?? "",
        chatTurns: scenario.turns,
        scenarioName: typeof scenario.name === "string" ? scenario.name : undefined,
      };
    }
  } catch {
    // plain text prompt
  }

  return { task: prompt };
}

export function appendTurn(
  history: ModelMessage[],
  user: string,
  assistant: string,
): ModelMessage[] {
  return [...history, { role: "user", content: user }, { role: "assistant", content: assistant }];
}

export function renderChatTranscript(
  name: string | undefined,
  turns: Array<{ turn: number; question: string; answer: string }>,
): string {
  const lines: string[] = [];
  if (name) {
    lines.push(`# ${name}`, "");
  }
  for (const turn of turns) {
    lines.push(`## Turn ${turn.turn + 1}`);
    lines.push(`Question: ${turn.question}`);
    lines.push("");
    lines.push(turn.answer);
    lines.push("");
  }
  return lines.join("\n").trim();
}

export function summarizeWarnings(warnings: unknown[] | undefined): string[] {
  return (warnings ?? []).map((warning) => {
    if (warning && typeof warning === "object") {
      const withMessage = warning as { message?: unknown; type?: unknown; details?: unknown };
      if (typeof withMessage.message === "string") return withMessage.message;
      if (typeof withMessage.type === "string" && typeof withMessage.details === "string") {
        return `${withMessage.type}: ${withMessage.details}`;
      }
      if (typeof withMessage.type === "string") return withMessage.type;
    }
    return "unknown warning";
  });
}
