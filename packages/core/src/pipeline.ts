import { Effect } from "effect";
import type { LanguageModel } from "ai";
import { buildHandoff, buildFallbackHandoff } from "./handoff.ts";
import { runAgent } from "./agent.ts";
import type { TraceBuilder } from "./trace.ts";
import type { SourceAdapter } from "./sources/interface.ts";
import type { HandoffStructured, PrepareOptions, RunFinishReason, RuntimeTrace } from "./types.ts";
import type { Truncator } from "./truncation.ts";

// ---------------------------------------------------------------------------
// Stage 1: classify
// Stub — will dispatch strategy (research / chain / auto) once eval suite exists
// ---------------------------------------------------------------------------

export function stageClassify(): Effect.Effect<void> {
  return Effect.void;
}

// ---------------------------------------------------------------------------
// Stage 2: research
// Agentic exploration of sources — currently the full runAgent loop
// ---------------------------------------------------------------------------

export function stageResearch<S extends Record<string, SourceAdapter>>(opts: {
  task: string;
  sources: S;
  orchestrator: LanguageModel;
  worker: LanguageModel;
  concurrency: number;
  maxSteps: number | undefined;
  onToolCall: PrepareOptions<S>["onToolCall"];
  subcallSchemas: PrepareOptions<S>["subcallSchemas"];
  trace: TraceBuilder<S>;
  truncator: Truncator;
}): Effect.Effect<{ answer: string; finishReason: RunFinishReason }, Error> {
  return Effect.tryPromise({
    try: () =>
      runAgent({
        orchestrator: opts.orchestrator,
        worker: opts.worker,
        task: opts.task,
        sources: opts.sources,
        onToolCall: opts.onToolCall,
        maxSteps: opts.maxSteps,
        subcallSchemas: opts.subcallSchemas,
        concurrency: opts.concurrency,
        trace: opts.trace,
        truncator: opts.truncator,
      }),
    catch: (e) => (e instanceof Error ? e : new Error(String(e))),
  });
}

// ---------------------------------------------------------------------------
// Stage 3: synthesize
// Stub — will become AggAgent-style trace navigation once gather is stable
// ---------------------------------------------------------------------------

export function stageSynthesize(): Effect.Effect<void> {
  return Effect.void;
}

// ---------------------------------------------------------------------------
// Stage 4: handoff
// Synthesizes the briefing document for the action agent
// ---------------------------------------------------------------------------

export function stageHandoff<S extends Record<string, SourceAdapter>>(opts: {
  task: string;
  answer: string;
  trace: RuntimeTrace<S>;
  worker: LanguageModel;
  system: string | undefined;
}): Effect.Effect<{ structured: HandoffStructured; markdown: string; failed: boolean }, Error> {
  return Effect.tryPromise({
    try: async () => {
      try {
        const result = await buildHandoff({
          task: opts.task,
          answer: opts.answer,
          trace: opts.trace,
          worker: opts.worker,
          system: opts.system,
        });
        return { ...result, failed: false };
      } catch {
        const result = buildFallbackHandoff({
          task: opts.task,
          answer: opts.answer,
          trace: opts.trace,
          system: opts.system,
        });
        return { ...result, failed: true };
      }
    },
    catch: (e) => (e instanceof Error ? e : new Error(String(e))),
  });
}
