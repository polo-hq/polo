import type {
  AllowedContext,
  AnyInput,
  AnySource,
  Definition,
  InferSources,
  Resolution,
} from "./types.ts";
import { isChunks } from "./chunks.ts";
import { buildWaves, executeWaves } from "./graph.ts";
import { applyPolicies } from "./policies.ts";
import { estimateTokens, packChunks } from "./pack.ts";
import { buildTrace } from "./trace.ts";
import type { SourceTiming } from "./trace.ts";

export async function resolveDefinition<
  TInput extends AnyInput,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TSourceMap extends Record<string, AnySource<any, any>>,
  TSources extends InferSources<TSourceMap>,
  TDerived extends Record<string, unknown>,
>(
  definition: Definition<TInput, TSourceMap, TSources, TDerived>,
  input: TInput,
): Promise<Resolution<TSources, TDerived>> {
  const startedAt = new Date();
  const { _id: taskId, _sources: sourceMap, _derive: deriveFn, _policies: policies } = definition;

  // --- build execution plan ---
  const waves = buildWaves(sourceMap);

  // --- execute sources wave by wave ---
  const sourceTimings: SourceTiming[] = [];

  const resolvedRaw = await executeWaves(
    sourceMap,
    input,
    waves,
    taskId,
    (key, _value, durationMs) => {
      const source = sourceMap[key]!;
      sourceTimings.push({
        key,
        type: source._type,
        sensitivity: source._sensitivity,
        resolvedAt: new Date(),
        durationMs,
      });
    },
  );

  // --- derive ---
  const resolvedForDerive = Object.fromEntries(resolvedRaw) as TSources;
  const derived: TDerived = deriveFn ? deriveFn({ context: resolvedForDerive }) : ({} as TDerived);

  // --- apply policies ---
  const budget = policies.budget ?? Infinity;
  const { allowed, records: policyRecords } = applyPolicies<TSources, TDerived>(
    resolvedRaw,
    derived,
    policies,
    taskId,
  );

  // --- build authoritative context + pack chunk sources ---
  const context: Record<string, unknown> = {};
  let budgetUsed = 0;

  for (const key of allowed) {
    const raw = resolvedRaw.get(key);
    const source = sourceMap[key];

    if (source?._type === "chunks" && isChunks(raw)) {
      const remaining = budget === Infinity ? Infinity : budget - budgetUsed;
      const packed = packChunks(raw, remaining);

      budgetUsed += packed.tokensUsed;
      context[key] = packed.included;

      // Attach chunk records to the source timing entry
      const timing = sourceTimings.find((t) => t.key === key);
      if (timing) timing.chunkRecords = packed.records;
    } else {
      // For non-chunk sources, rough-estimate tokens from stringified value
      const str = raw === null || raw === undefined ? "" : JSON.stringify(raw);
      budgetUsed += estimateTokens(str);
      context[key] = raw;
    }
  }

  // --- merge derived values onto context ---
  Object.assign(context, derived);

  // --- build trace ---
  const completedAt = new Date();
  const trace = buildTrace({
    taskId,
    startedAt,
    completedAt,
    sourceTimings,
    policyRecords,
    derived,
    budgetMax: budget === Infinity ? 0 : budget,
    budgetUsed,
  });

  return {
    context: context as AllowedContext<TSources, TDerived>,
    trace,
  };
}
