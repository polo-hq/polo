import type {
  AllowedContext,
  AnyInput,
  Definition,
  InputSchema,
  InputSource,
  ResolverSource,
  InferSources,
  Resolution,
} from "./types.ts";
import { isChunks } from "./chunks.ts";
import { buildWaves, executeWaves } from "./graph.ts";
import { applyPolicies } from "./policies.ts";
import { estimateTokens, packChunks } from "./pack.ts";
import { buildTrace } from "./trace.ts";
import type { SourceTiming } from "./trace.ts";

function isInputSource(source: unknown): source is InputSource<string> {
  return (
    typeof source === "object" &&
    source !== null &&
    "_type" in source &&
    (source as { _type?: unknown })._type === "input"
  );
}

function isResolverSource(source: unknown): source is ResolverSource<unknown> {
  return (
    typeof source === "object" &&
    source !== null &&
    "resolve" in source &&
    typeof (source as { resolve?: unknown }).resolve === "function"
  );
}

async function validateInput<TResolveInput extends AnyInput, TInput extends AnyInput>(
  schema: InputSchema<TResolveInput, TInput>,
  input: TResolveInput,
  taskId: string,
): Promise<TInput> {
  const result = await schema["~standard"].validate(input);
  if (result.issues !== undefined) {
    const details = result.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Input validation failed for task "${taskId}": ${details}`);
  }

  return result.value;
}

export async function resolveDefinition<
  TInput extends AnyInput,
  TSourceMap extends Record<string, unknown>,
  TDerived extends Record<string, unknown>,
  TRequired extends readonly Extract<keyof InferSources<TInput, TSourceMap>, string>[] = [],
  TPrefer extends readonly Extract<keyof InferSources<TInput, TSourceMap>, string>[] = [],
  TResolveInput extends AnyInput = TInput,
>(
  definition: Definition<TInput, TSourceMap, TDerived, TRequired, TPrefer, TResolveInput>,
  input: TResolveInput,
): Promise<Resolution<InferSources<TInput, TSourceMap>, TDerived, TRequired>> {
  const startedAt = new Date();
  const {
    _id: taskId,
    _inputSchema: inputSchema,
    _sources: sourceMap,
    _derive: deriveFn,
    _policies: policies,
  } = definition;
  const normalizedInput = await validateInput(inputSchema, input, taskId);

  // --- build execution plan ---
  const waves = buildWaves(sourceMap);

  // --- execute sources wave by wave ---
  const sourceTimings: SourceTiming[] = [];

  const resolvedRaw = await executeWaves(
    sourceMap,
    normalizedInput,
    waves,
    taskId,
    (key, value, durationMs) => {
      const source = sourceMap[key]!;
      const type = isInputSource(source) ? "input" : isChunks(value) ? "chunks" : "value";

      sourceTimings.push({
        key,
        type,
        tags: isInputSource(source)
          ? source._tags
          : isResolverSource(source)
            ? (source.tags ?? [])
            : [],
        resolvedAt: new Date(),
        durationMs,
      });
    },
  );

  // --- derive ---
  const resolvedForDerive = Object.fromEntries(resolvedRaw) as InferSources<TInput, TSourceMap>;
  const derived: TDerived = deriveFn ? deriveFn({ context: resolvedForDerive }) : ({} as TDerived);

  // --- apply policies ---
  const budget = policies.budget ?? Infinity;
  const { allowed, records: policyRecords } = applyPolicies<
    InferSources<TInput, TSourceMap>,
    TDerived,
    TRequired,
    TPrefer
  >(resolvedRaw, derived, policies, taskId);

  // --- build authoritative context + pack chunk sources ---
  const context: Record<string, unknown> = {};
  let budgetUsed = 0;

  const requiredKeys = new Set((policies.require ?? []).map(String));
  const preferredKeys = new Set((policies.prefer ?? []).map(String));

  // Iterate in priority order so required sources consume budget first,
  // then preferred, then default-included. This ensures budget gating
  // drops lower-priority sources before higher-priority ones.
  const orderedKeys = [
    ...(policies.require ?? []).map(String).filter((k) => allowed.has(k)),
    ...(policies.prefer ?? []).map(String).filter((k) => allowed.has(k) && !requiredKeys.has(k)),
    ...[...allowed].filter((k) => !requiredKeys.has(k) && !preferredKeys.has(k)),
  ];

  for (const key of orderedKeys) {
    const raw = resolvedRaw.get(key);

    if (isChunks(raw)) {
      const remaining = budget === Infinity ? Infinity : budget - budgetUsed;
      const packed = packChunks(raw, remaining);

      budgetUsed += packed.tokensUsed;
      context[key] = packed.included;

      // Attach chunk records to the source timing entry
      const timing = sourceTimings.find((t) => t.key === key);
      if (timing) timing.chunkRecords = packed.records;
    } else {
      const str = raw === null || raw === undefined ? "" : JSON.stringify(raw);
      const tokens = estimateTokens(str);

      if (!requiredKeys.has(key) && budget !== Infinity && budgetUsed + tokens > budget) {
        policyRecords.push({ source: key, action: "dropped", reason: "over_budget" });
        continue;
      }

      budgetUsed += tokens;
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
    context: context as AllowedContext<InferSources<TInput, TSourceMap>, TDerived, TRequired>,
    trace,
  };
}
