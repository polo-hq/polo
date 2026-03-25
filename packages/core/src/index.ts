// Public API
export { polo } from "./polo.ts";
export { chunkSource } from "./polo.ts";

// Public types
export type {
  AnyInput,
  Chunks,
  Chunk,
  ChunkRecord,
  Definition,
  DeriveFn,
  ExcludeDecision,
  InferSource,
  InferSources,
  InputSource,
  InputSourceOptions,
  Policies,
  PolicyExcludeFn,
  PolicyRecord,
  Resolution,
  Sensitivity,
  SingleSource,
  SourceOptions,
  SourceRecord,
  Trace,
} from "./types.ts";

// Errors
export { RequiredSourceMissingError, SourceResolutionError } from "./errors.ts";
