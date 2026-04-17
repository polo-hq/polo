import { emptyTrace, traceSetRouting, type Trace } from "../src/trace.ts";
import type { RoutingDecision } from "../src/router.ts";
import { Effect, SubscriptionRef } from "effect";

export function stubRouting(overrides: Partial<RoutingDecision> = {}): RoutingDecision {
  return {
    pattern: "recursive",
    classifierPattern: "recursive",
    axes: {
      decomposition: "synthetic",
      budget: "standard",
      confidence: 0.9,
      rationale: "test fixture",
    },
    classifierFailed: false,
    classifierDurationMs: 0,
    ...overrides,
  };
}

export function emptyTraceWithStubRouting(task: string): Trace {
  return traceSetRouting(emptyTrace(task), stubRouting());
}

export const makeTraceRef = (task: string) =>
  Effect.runPromise(SubscriptionRef.make(emptyTraceWithStubRouting(task)));
