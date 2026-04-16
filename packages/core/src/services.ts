import { Context, SubscriptionRef } from "effect";
import type { SourceAdapter } from "./sources/interface.ts";
import type { Trace } from "./trace.ts";

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

import type { LanguageModel } from "ai";

export const OrchestratorModel = Context.GenericTag<_OrchestratorModel, LanguageModel>(
  "budge/OrchestratorModel",
);
export type OrchestratorModel = Context.Tag<_OrchestratorModel, LanguageModel>;

export const WorkerModel = Context.GenericTag<_WorkerModel, LanguageModel>("budge/WorkerModel");
export type WorkerModel = Context.Tag<_WorkerModel, LanguageModel>;

// SubscriptionRef — exposes .changes stream for future progress streaming
export const TraceRef = Context.GenericTag<_TraceRef, SubscriptionRef.SubscriptionRef<Trace>>(
  "budge/TraceRef",
);

export interface SourceRegistryShape {
  readonly get: (name: string) => SourceAdapter | undefined;
  readonly entries: () => ReadonlyArray<readonly [string, SourceAdapter]>;
  readonly has: (name: string, method: "list" | "read" | "search" | "tools") => boolean;
}

export const SourceRegistry = Context.GenericTag<_SourceRegistry, SourceRegistryShape>(
  "budge/SourceRegistry",
);
export type SourceRegistry = Context.Tag<_SourceRegistry, SourceRegistryShape>;
