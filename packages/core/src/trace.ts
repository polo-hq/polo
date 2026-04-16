import type { SourceAdapter } from "./sources/interface.ts";
import type {
  RootTraceNode,
  RuntimeTrace,
  SubcallTraceNode,
  ToolCallRecord,
  TokenUsage,
} from "./types.ts";

// ---------------------------------------------------------------------------
// Immutable Trace — raw accumulator state
// @internal — not exported from index.ts
// ---------------------------------------------------------------------------

/**
 * Immutable accumulator for a single prepare() call.
 * All mutation returns a new Trace value.
 * Will be held in a Ref<Trace> when pipeline.ts is introduced.
 * @internal
 */
export interface Trace {
  readonly task: string;
  readonly startMs: number;
  readonly rootUsage: TokenUsage;
  readonly toolCalls: ReadonlyArray<ToolCallRecord>;
  readonly subcalls: ReadonlyArray<SubcallTraceNode>;
  readonly accessed: ReadonlyMap<string, ReadonlySet<string>>;
}

// ---------------------------------------------------------------------------
// Pure constructors and reducers
// ---------------------------------------------------------------------------

export function emptyTrace(task: string): Trace {
  return {
    task,
    startMs: Date.now(),
    rootUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cachedInputTokens: 0 },
    toolCalls: [],
    subcalls: [],
    accessed: new Map(),
  };
}

export function traceAddToolCall(trace: Trace, record: ToolCallRecord): Trace {
  return { ...trace, toolCalls: [...trace.toolCalls, record] };
}

export function traceAddRead(trace: Trace, source: string, path: string): Trace {
  const existing = trace.accessed.get(source);
  const newSet = new Set(existing);
  newSet.add(path);
  const newAccessed = new Map(trace.accessed);
  newAccessed.set(source, newSet);
  return { ...trace, accessed: newAccessed };
}

export function traceAddSubcall(trace: Trace, node: SubcallTraceNode): Trace {
  const withRead = traceAddRead(trace, node.source, node.path);
  return { ...withRead, subcalls: [...withRead.subcalls, node] };
}

export function traceAddRootUsage(trace: Trace, usage: TokenUsage): Trace {
  return { ...trace, rootUsage: sumUsage(trace.rootUsage, usage) };
}

export function buildTrace<S extends Record<string, SourceAdapter>>(trace: Trace): RuntimeTrace<S> {
  const durationMs = Date.now() - trace.startMs;

  const rootNode: RootTraceNode = {
    type: "root",
    task: trace.task,
    usage: { ...trace.rootUsage },
    durationMs,
    toolCalls: [...trace.toolCalls],
    children: [...trace.subcalls],
  };

  const totalSubcallTokens = trace.subcalls.reduce((sum, s) => sum + s.usage.totalTokens, 0);
  const totalCachedTokens =
    trace.rootUsage.cachedInputTokens +
    trace.subcalls.reduce((sum, s) => sum + s.usage.cachedInputTokens, 0);

  const sourcesAccessed: Partial<Record<keyof S & string, string[]>> = {};
  for (const [source, paths] of trace.accessed) {
    (sourcesAccessed as Record<string, string[]>)[source] = [...paths];
  }

  return {
    totalSubcalls: trace.subcalls.length,
    totalTokens: trace.rootUsage.totalTokens + totalSubcallTokens,
    durationMs,
    totalCachedTokens,
    sourcesAccessed,
    tree: rootNode,
  };
}

// ---------------------------------------------------------------------------
// TraceBuilder — thin shim over pure functions
// Keeps agent.ts and tools.ts unchanged for now.
// Replaced by Ref<Trace> when pipeline.ts is introduced.
// ---------------------------------------------------------------------------

/**
 * @internal
 */
export class TraceBuilder<S extends Record<string, SourceAdapter>> {
  private trace: Trace;

  constructor(task: string) {
    this.trace = emptyTrace(task);
  }

  recordToolCall(record: ToolCallRecord): void {
    this.trace = traceAddToolCall(this.trace, record);
  }

  recordRead(source: string, path: string): void {
    this.trace = traceAddRead(this.trace, source, path);
  }

  recordSubcall(node: SubcallTraceNode): void {
    this.trace = traceAddSubcall(this.trace, node);
  }

  addRootUsage(usage: TokenUsage): void {
    this.trace = traceAddRootUsage(this.trace, usage);
  }

  build(): RuntimeTrace<S> {
    return buildTrace<S>(this.trace);
  }
}

// ---------------------------------------------------------------------------
// Subcall node constructor (unchanged)
// ---------------------------------------------------------------------------

export function makeSubcallNode(opts: {
  source: string;
  path: string;
  task: string;
  answer: string;
  structured?: unknown;
  schemaName?: string;
  usage: TokenUsage;
  startMs: number;
  parallel?: boolean;
  truncated?: boolean;
  overflowPath?: string;
}): SubcallTraceNode {
  return {
    type: "subcall",
    source: opts.source,
    path: opts.path,
    task: opts.task,
    answer: opts.answer,
    structured: opts.structured,
    schemaName: opts.schemaName,
    usage: opts.usage,
    durationMs: Date.now() - opts.startMs,
    parallel: opts.parallel,
    truncated: opts.truncated,
    overflowPath: opts.overflowPath,
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function sumUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    totalTokens: a.totalTokens + b.totalTokens,
    cachedInputTokens: a.cachedInputTokens + b.cachedInputTokens,
  };
}
