import type { AnyInput, Chunks, ChunkSource, SourceOptions, ValueSource } from "./types.ts";

export function createSource<
  TInput extends AnyInput,
  TSources extends Record<string, unknown>,
  TResult,
>(
  fn: (input: TInput, sources: TSources) => Promise<TResult>,
  options?: SourceOptions,
): ValueSource<TInput, TSources, TResult> {
  return {
    _type: "value",
    _fn: fn,
    _sensitivity: options?.sensitivity ?? "internal",
  };
}

export function createChunkSource<
  TInput extends AnyInput,
  TSources extends Record<string, unknown>,
>(
  fn: (input: TInput, sources: TSources) => Promise<Chunks>,
  options?: SourceOptions,
): ChunkSource<TInput, TSources> {
  return {
    _type: "chunks",
    _fn: fn,
    _sensitivity: options?.sensitivity ?? "internal",
  };
}
