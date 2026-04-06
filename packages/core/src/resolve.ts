import { randomUUID } from "node:crypto";
import { BudgetExceededError, RequiredSourceValueError, SourceResolutionError } from "./errors.ts";
import { estimateTokens, serialize } from "./pack.ts";
import { buildTrace } from "./trace.ts";
import type { SourceTiming } from "./trace.ts";
import type {
  AnyInput,
  AnyResolverSource,
  ComposeContext,
  ComposeResult,
  InferSource,
  InferSourceInput,
  PromptTrace,
  ResolveResult,
  UseFn,
  WindowSpec,
} from "./types.ts";

interface InterpolationState {
  proxyCache: WeakMap<object, unknown>;
  slotCache: WeakMap<object, string>;
  slotStrings: Map<string, string>;
  slotNonce: string;
  slotCounter: number;
}

function isInterpolatedObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function createSerializationSlot(state: InterpolationState, value: object): string {
  const existing = state.slotCache.get(value);
  if (existing) {
    return existing;
  }

  const token = `\u001fBUDGE_SLOT_${state.slotNonce}_${state.slotCounter++}\u001f`;
  state.slotCache.set(value, token);
  state.slotStrings.set(token, serialize(value));
  return token;
}

function wrapInterpolatedValue<T>(value: T, state: InterpolationState): T {
  if (!isInterpolatedObject(value)) {
    return value;
  }

  const cached = state.proxyCache.get(value);
  if (cached !== undefined) {
    return cached as T;
  }

  const proxy = new Proxy(value, {
    get(target, prop, receiver) {
      if (prop === Symbol.toPrimitive) {
        return () => createSerializationSlot(state, target);
      }

      if (prop === "toString") {
        return () => createSerializationSlot(state, target);
      }

      if (prop === "valueOf") {
        return () => createSerializationSlot(state, target);
      }

      const result = Reflect.get(target, prop, receiver);
      return wrapInterpolatedValue(result, state);
    },
  });

  state.proxyCache.set(value, proxy);
  return proxy as T;
}

function materializeInterpolatedText(
  text: string | undefined,
  slotStrings: Map<string, string>,
): string | undefined {
  if (text === undefined) {
    return undefined;
  }

  let output = text;
  for (const [token, serializedValue] of slotStrings) {
    output = output.split(token).join(serializedValue);
  }
  return output;
}

function normalizeComposeResult(result: ComposeResult): ComposeResult {
  if (result.system !== undefined && typeof result.system !== "string") {
    throw new TypeError("compose() must return a string or undefined for system.");
  }

  if (result.prompt !== undefined && typeof result.prompt !== "string") {
    throw new TypeError("compose() must return a string or undefined for prompt.");
  }

  return result;
}

async function validateInput<TResolveInput extends AnyInput, TInput extends AnyInput>(
  schema: WindowSpec<TInput, TResolveInput>["_inputSchema"],
  input: TResolveInput,
  windowId: string,
): Promise<TInput> {
  const result = await schema["~standard"].validate(input);
  if (result.issues !== undefined) {
    const details = result.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Input validation failed for context window "${windowId}": ${details}`);
  }

  return result.value;
}

function createPromptTrace(system: string | undefined, prompt: string | undefined): PromptTrace {
  const systemTokens = estimateTokens(system ?? "");
  const promptTokens = estimateTokens(prompt ?? "");

  return {
    systemTokens,
    promptTokens,
    totalTokens: systemTokens + promptTokens,
  };
}

const EMPTY_PROMPT_TRACE: PromptTrace = {
  systemTokens: 0,
  promptTokens: 0,
  totalTokens: 0,
};

function attachTrace(error: unknown, trace: ResolveResult["trace"]): void {
  if (typeof error === "object" && error !== null) {
    (error as { trace?: ResolveResult["trace"] }).trace = trace;
  }
}

function createUse(
  windowId: string,
  state: InterpolationState,
  sourceTimings: SourceTiming[],
): UseFn {
  const use = async <TSource extends AnyResolverSource>(
    source: TSource,
    input: InferSourceInput<TSource>,
  ): Promise<NonNullable<InferSource<TSource>>> => {
    const startedAt = Date.now();

    try {
      const resolved = await source.resolve(input);

      if (resolved === null || resolved === undefined) {
        throw new RequiredSourceValueError(source._internalId, windowId);
      }

      const requiredResolved = resolved as NonNullable<InferSource<TSource>>;

      const resolvedAt = new Date();
      sourceTimings.push({
        sourceId: source._internalId,
        kind: source._sourceKind,
        tags: source.tags ?? [],
        resolvedAt,
        durationMs: Date.now() - startedAt,
        ...(Array.isArray(requiredResolved) && source._sourceKind === "rag"
          ? { itemCount: requiredResolved.length }
          : {}),
      });

      return wrapInterpolatedValue(requiredResolved, state);
    } catch (error) {
      if (error instanceof RequiredSourceValueError) {
        throw error;
      }

      throw new SourceResolutionError(source._internalId, windowId, error);
    }
  };

  return use satisfies UseFn;
}

export async function resolveWindowSpec<
  TInput extends AnyInput,
  TResolveInput extends AnyInput = TInput,
>(
  windowSpec: WindowSpec<TInput, TResolveInput>,
  payload: { input: TResolveInput },
): Promise<ResolveResult> {
  const startedAt = new Date();
  const sourceTimings: SourceTiming[] = [];
  const interpolationState: InterpolationState = {
    proxyCache: new WeakMap(),
    slotCache: new WeakMap(),
    slotStrings: new Map(),
    slotNonce: randomUUID(),
    slotCounter: 0,
  };

  const normalizedInput = await validateInput(
    windowSpec._inputSchema,
    payload.input,
    windowSpec._id,
  );
  const composeContext: ComposeContext<TInput> = {
    input: normalizedInput,
    use: createUse(windowSpec._id, interpolationState, sourceTimings),
  };
  const createTrace = (
    completedAt: Date,
    options: {
      prompt?: PromptTrace;
      budgetUsed?: number;
      budgetExceeded?: boolean;
    } = {},
  ): ResolveResult["trace"] =>
    buildTrace({
      windowId: windowSpec._id,
      startedAt,
      completedAt,
      sourceTimings,
      budgetMax: windowSpec._maxTokens,
      budgetUsed: options.budgetUsed ?? 0,
      budgetExceeded: options.budgetExceeded ?? false,
      prompt: options.prompt ?? EMPTY_PROMPT_TRACE,
    });

  try {
    const composed = normalizeComposeResult(await windowSpec._compose(composeContext));
    const system = materializeInterpolatedText(composed.system, interpolationState.slotStrings);
    const prompt = materializeInterpolatedText(composed.prompt, interpolationState.slotStrings);
    const promptTrace = createPromptTrace(system, prompt);
    const budgetExceeded =
      Number.isFinite(windowSpec._maxTokens) && promptTrace.totalTokens > windowSpec._maxTokens;
    const completedAt = new Date();
    const trace = createTrace(completedAt, {
      prompt: promptTrace,
      budgetUsed: promptTrace.totalTokens,
      budgetExceeded,
    });

    if (budgetExceeded) {
      const error = new BudgetExceededError(
        windowSpec._id,
        windowSpec._maxTokens,
        promptTrace.totalTokens,
      );
      error.trace = trace;
      throw error;
    }

    return { system, prompt, trace };
  } catch (error) {
    if (
      error instanceof BudgetExceededError ||
      error instanceof RequiredSourceValueError ||
      error instanceof SourceResolutionError
    ) {
      if (!error.trace) {
        error.trace = createTrace(new Date());
      }

      throw error;
    }

    const trace = createTrace(new Date());
    attachTrace(error, trace);
    throw error;
  }
}
