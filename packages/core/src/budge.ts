import { Effect, Ref, SubscriptionRef } from "effect";
import type { SourceAdapter } from "./sources/interface.ts";
import type { BudgeOptions, PrepareOptions, PreparedContext } from "./types.ts";
import { Truncator } from "./truncation.ts";
import { withPromptCaching } from "./cache.ts";
import { stageClassify, stageResearch, stageSynthesize, stageHandoff } from "./pipeline.ts";
import { buildTrace, emptyTrace } from "./trace.ts";

export interface Budge {
  prepare<S extends Record<string, SourceAdapter>>(
    options: PrepareOptions<S>,
  ): Promise<PreparedContext<S>>;
}

function runPipeline<S extends Record<string, SourceAdapter>>(
  prepareOptions: PrepareOptions<S>,
  deps: {
    orchestrator: ReturnType<typeof withPromptCaching>;
    worker: ReturnType<typeof withPromptCaching>;
    concurrency: number;
    truncator: Truncator;
  },
): Effect.Effect<PreparedContext<S>, Error> {
  return Effect.gen(function* () {
    const { task, sources, onToolCall, maxSteps, subcallSchemas, system } = prepareOptions;

    void deps.truncator.cleanup().catch(() => {});

    // fresh SubscriptionRef per prepare() call — .changes available for future streaming
    const traceRef = yield* SubscriptionRef.make(emptyTrace(task));

    const routing = yield* stageClassify({
      task,
      sources,
      worker: deps.worker,
      traceRef,
    });

    const { answer, finishReason } = yield* stageResearch({
      task,
      sources,
      orchestrator: deps.orchestrator,
      worker: deps.worker,
      concurrency: deps.concurrency,
      maxSteps,
      onToolCall,
      subcallSchemas,
      traceRef,
      truncator: deps.truncator,
      pattern: routing.pattern,
    });

    const builtTrace = buildTrace<S>(yield* Ref.get(traceRef));

    yield* stageSynthesize();

    const { structured, markdown, failed } = yield* stageHandoff({
      task,
      answer,
      trace: builtTrace,
      worker: deps.worker,
      system,
    });

    return {
      task,
      answer,
      handoff: markdown,
      handoffStructured: structured,
      handoffFailed: failed,
      finishReason,
      routing,
      trace: builtTrace,
    } satisfies PreparedContext<S>;
  });
}

export function createBudge(options: BudgeOptions): Budge {
  const { orchestrator, worker, concurrency = 5 } = options;
  const normalizedConcurrency = Math.max(1, Math.floor(concurrency));
  const truncator = new Truncator();
  const cachedOrchestrator = withPromptCaching(orchestrator);
  const cachedWorker = withPromptCaching(worker);

  const deps = {
    orchestrator: cachedOrchestrator,
    worker: cachedWorker,
    concurrency: normalizedConcurrency,
    truncator,
  };

  return {
    prepare<S extends Record<string, SourceAdapter>>(
      prepareOptions: PrepareOptions<S>,
    ): Promise<PreparedContext<S>> {
      return Effect.runPromise(runPipeline(prepareOptions, deps));
    },
  };
}
