import { Context, Ref } from "effect";
import type { LanguageModel } from "ai";
import type { SourceAdapter } from "./sources/interface.ts";
import type { Trace } from "./trace.ts";

// ---------------------------------------------------------------------------
// Unique identifier interfaces — one per service, prevents tag collisions
// ---------------------------------------------------------------------------

interface _OrchestratorModel {
  readonly _tag: "budge/OrchestratorModel";
}
interface _WorkerModel {
  readonly _tag: "budge/WorkerModel";
}
interface _TraceRef {
  readonly _tag: "budge/TraceRef";
}
interface _SourceRegistry {
  readonly _tag: "budge/SourceRegistry";
}

// ---------------------------------------------------------------------------
// Model services
// ---------------------------------------------------------------------------

export const OrchestratorModel = Context.GenericTag<_OrchestratorModel, LanguageModel>(
  "budge/OrchestratorModel",
);
export type OrchestratorModel = Context.Tag<_OrchestratorModel, LanguageModel>;

export const WorkerModel = Context.GenericTag<_WorkerModel, LanguageModel>("budge/WorkerModel");
export type WorkerModel = Context.Tag<_WorkerModel, LanguageModel>;

// ---------------------------------------------------------------------------
// Trace ref — mutable cell holding the current immutable Trace
// Provided once per prepare() call, used by all pipeline stages
// ---------------------------------------------------------------------------

export const TraceRef = Context.GenericTag<_TraceRef, Ref.Ref<Trace>>("budge/TraceRef");
export type TraceRef = Context.Tag<_TraceRef, Ref.Ref<Trace>>;

// ---------------------------------------------------------------------------
// Source registry
// ---------------------------------------------------------------------------

export interface SourceRegistryShape {
  readonly get: (name: string) => SourceAdapter | undefined;
  readonly entries: () => ReadonlyArray<readonly [string, SourceAdapter]>;
  readonly has: (name: string, method: "list" | "read" | "search" | "tools") => boolean;
}

export const SourceRegistry = Context.GenericTag<_SourceRegistry, SourceRegistryShape>(
  "budge/SourceRegistry",
);
export type SourceRegistry = Context.Tag<_SourceRegistry, SourceRegistryShape>;
