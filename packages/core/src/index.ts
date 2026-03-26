// Public API
export { polo } from "./polo.ts";
export { chunkSource } from "./polo.ts";

// Public types
export type {
  AnyInput,
  Chunk,
  ChunkRecord,
  Chunks,
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
  SourceOptions,
  SourceRecord,
  SourceRecordType,
  Trace,
  ValueSource,
} from "./types.ts";

// Errors
export { RequiredSourceMissingError, SourceResolutionError } from "./errors.ts";
