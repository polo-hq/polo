import type { ModelMessage } from "ai";
import { appendTurn, renderChatTranscript, type NormalizedUsage } from "../providers/shared.ts";

export interface ChatTurnResult {
  turn: number;
  question: string;
  answer: string;
  usage: NormalizedUsage;
  prepTokens: number;
  latencyMs: number;
  metadata?: Record<string, unknown>;
}

export interface ChatScenarioResult {
  output: string;
  turns: ChatTurnResult[];
  prepTokens: number;
  prepMs: number;
  actionUsage: NormalizedUsage;
  actionMs: number;
}

export async function runChatScenario(opts: {
  name?: string;
  turns: string[];
  prepare?: (firstTurn: string) => Promise<{
    system: string;
    prepTokens: number;
    prepMs: number;
    metadata?: Record<string, unknown>;
  }>;
  act: (input: {
    turn: number;
    question: string;
    history: ModelMessage[];
    system?: string;
  }) => Promise<{
    text: string;
    usage: NormalizedUsage;
    latencyMs: number;
    metadata?: Record<string, unknown>;
  }>;
}): Promise<ChatScenarioResult> {
  const turnResults: ChatTurnResult[] = [];
  let history: ModelMessage[] = [];
  let prepTokens = 0;
  let prepMs = 0;
  let system: string | undefined;

  if (opts.turns.length === 0) {
    return {
      output: "",
      turns: [],
      prepTokens: 0,
      prepMs: 0,
      actionUsage: { input: 0, output: 0, total: 0, cached: 0 },
      actionMs: 0,
    };
  }

  if (opts.prepare) {
    const prepared = await opts.prepare(opts.turns[0]!);
    prepTokens = prepared.prepTokens;
    prepMs = prepared.prepMs;
    system = prepared.system;
  }

  let actionMs = 0;
  let actionUsage: NormalizedUsage = { input: 0, output: 0, total: 0, cached: 0 };

  for (const [turn, question] of opts.turns.entries()) {
    const result = await opts.act({ turn, question, history, system });
    actionMs += result.latencyMs;
    actionUsage = {
      input: actionUsage.input + result.usage.input,
      output: actionUsage.output + result.usage.output,
      total: actionUsage.total + result.usage.total,
      cached: actionUsage.cached + result.usage.cached,
    };

    turnResults.push({
      turn,
      question,
      answer: result.text,
      usage: result.usage,
      prepTokens: turn === 0 ? prepTokens : 0,
      latencyMs: result.latencyMs,
      metadata: result.metadata,
    });

    history = appendTurn(history, question, result.text);
  }

  return {
    output: renderChatTranscript(opts.name, turnResults),
    turns: turnResults,
    prepTokens,
    prepMs,
    actionUsage,
    actionMs,
  };
}
