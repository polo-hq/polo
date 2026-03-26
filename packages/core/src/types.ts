// ============================================================
// Input
// ============================================================

export type AnyInput = Record<string, unknown>;

// ============================================================
// Sensitivity
// ============================================================

export type Sensitivity = "public" | "internal" | "restricted" | "phi";

// ============================================================
// Chunks
// ============================================================

export interface Chunk {
  content: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface Chunks {
  _type: "chunks";
  items: Chunk[];
}

// ============================================================
// Source definitions
// ============================================================

export interface InputSourceOptions {
  sensitivity?: Sensitivity;
}

export interface SourceOptions {
  sensitivity?: Sensitivity;
}

export interface InputSource<TInput extends AnyInput, TKey extends string & keyof TInput> {
  _type: "input";
  _key: TKey;
  _sensitivity: Sensitivity;
}

export interface ValueSource<
  TInput extends AnyInput,
  TSources extends Record<string, unknown>,
  TResult,
> {
  _type: "value";
  _fn(input: TInput, sources: TSources): Promise<TResult>;
  _sensitivity: Sensitivity;
}

export interface ChunkSource<TInput extends AnyInput, TSources extends Record<string, unknown>> {
  _type: "chunks";
  _fn(input: TInput, sources: TSources): Promise<Chunks>;
  _sensitivity: Sensitivity;
}

export type AnySource<
  TInput extends AnyInput = AnyInput,
  TSources extends Record<string, unknown> = Record<string, unknown>,
> =
  | InputSource<TInput, string & keyof TInput>
  | ValueSource<TInput, TSources, unknown>
  | ChunkSource<TInput, TSources>;

// ============================================================
// Infer resolved type from a source
// ============================================================

export type InferSource<TSource> =
  TSource extends InputSource<infer TInput, infer TKey>
    ? TInput[TKey]
    : TSource extends ValueSource<AnyInput, Record<string, unknown>, infer TResult>
      ? TResult
      : TSource extends ChunkSource<AnyInput, Record<string, unknown>>
        ? Chunk[]
        : never;

export type InferSources<TSourceMap extends Record<string, AnySource>> = {
  [K in keyof TSourceMap]: InferSource<TSourceMap[K]>;
};

// ============================================================
// Derive
// ============================================================

export type DeriveFn<
  TSources extends Record<string, unknown>,
  TDerived extends Record<string, unknown>,
> = (resolved: { context: TSources }) => TDerived;

// ============================================================
// Policies
// ============================================================

export interface ExcludeDecision {
  source: string;
  reason: string;
}

export type PolicyExcludeFn<
  TSources extends Record<string, unknown>,
  TDerived extends Record<string, unknown>,
> = (resolved: { context: TSources & TDerived }) => ExcludeDecision | false;

export interface Policies<
  TSources extends Record<string, unknown>,
  TDerived extends Record<string, unknown>,
> {
  require?: Array<keyof TSources>;
  prefer?: Array<keyof TSources>;
  exclude?: Array<PolicyExcludeFn<TSources, TDerived>>;
  budget?: number;
}

// ============================================================
// Trace
// ============================================================

export interface ChunkRecord {
  content: string;
  score?: number;
  included: boolean;
  reason?: string;
}

/** Discriminant for each entry in `Trace.sources`. */
export type SourceRecordType = "input" | "value" | "chunks";

type SourceRecordBase = {
  key: string;
  resolvedAt: Date;
  durationMs: number;
  sensitivity: Sensitivity;
};

export type SourceRecord =
  | (SourceRecordBase & { type: "input" | "value"; chunks?: never })
  | (SourceRecordBase & { type: "chunks"; chunks: ChunkRecord[] });

export interface PolicyRecord {
  source: string;
  action: "included" | "excluded" | "required" | "preferred" | "dropped";
  reason: string;
}

export interface Trace {
  runId: string;
  taskId: string;
  startedAt: Date;
  completedAt: Date;
  sources: SourceRecord[];
  policies: PolicyRecord[];
  derived: Record<string, unknown>;
  budget: { max: number; used: number };
}

// ============================================================
// Resolution — authoritative
// ============================================================

export type AllowedContext<
  TSources extends Record<string, unknown>,
  TDerived extends Record<string, unknown>,
> = Partial<TSources> & TDerived;

export interface Resolution<
  TSources extends Record<string, unknown>,
  TDerived extends Record<string, unknown>,
> {
  context: AllowedContext<TSources, TDerived>;
  trace: Trace;
}

// ============================================================
// Definition
// ============================================================

export interface Definition<
  TInput extends AnyInput,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TSourceMap extends Record<string, AnySource<any, any>>,
  TSources extends Record<string, unknown>,
  TDerived extends Record<string, unknown>,
> {
  _id: string;
  _sources: TSourceMap;
  _derive: DeriveFn<TSources, TDerived> | undefined;
  _policies: Policies<TSources, TDerived>;
  _input?: TInput; // phantom type for inference only
}
