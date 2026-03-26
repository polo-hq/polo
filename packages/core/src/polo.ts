import type {
  AnyInput,
  AnySource,
  Chunks,
  Chunk,
  Definition,
  DeriveFn,
  InferSources,
  InputSource,
  InputSourceOptions,
  Policies,
  Resolution,
  SourceOptions,
  ValueSource,
} from "./types.ts";
import { createInput } from "./input.ts";
import { createSource, createChunkSource } from "./source.ts";
import { createChunks } from "./chunks.ts";
import { createDefinition } from "./define.ts";
import { resolveDefinition } from "./resolve.ts";

interface Polo {
  /**
   * Declare the context contract for a task.
   */
  define<
    TInput extends AnyInput,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TSourceMap extends Record<string, AnySource<any, any>>,
    TSources extends InferSources<TSourceMap>,
    TDerived extends Record<string, unknown> = Record<string, never>,
  >(options: {
    id: string;
    sources: TSourceMap;
    derive?: DeriveFn<TSources, TDerived>;
    policies?: Policies<TSources, TDerived>;
  }): Definition<TInput, TSourceMap, TSources, TDerived>;

  /**
   * Resolve context at runtime for a task definition.
   */
  resolve<
    TInput extends AnyInput,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TSourceMap extends Record<string, AnySource<any, any>>,
    TSources extends InferSources<TSourceMap>,
    TDerived extends Record<string, unknown>,
  >(
    definition: Definition<TInput, TSourceMap, TSources, TDerived>,
    input: TInput,
  ): Promise<Resolution<TSources, TDerived>>;

  /**
   * Declare an input source that passes through a value from call-time input.
   */
  input<TInput extends AnyInput, TKey extends string & keyof TInput>(
    key: TKey,
    options?: InputSourceOptions,
  ): InputSource<TInput, TKey>;

  /**
   * Declare a source that resolves an async value.
   */
  source<TInput extends AnyInput, TSources extends Record<string, unknown>, TResult>(
    fn: (input: TInput, sources: TSources) => Promise<TResult>,
    options?: SourceOptions,
  ): ValueSource<TInput, TSources, TResult>;

  /**
   * Wrap a ranked multi-block source result.
   * Polo will pack as many chunks as the budget allows and record dropped chunks.
   */
  chunks<T>(promise: Promise<T[]>, normalize?: (item: T) => Chunk): Promise<Chunks>;
}

export const polo: Polo = {
  define(options) {
    return createDefinition(options);
  },

  resolve(definition, input) {
    return resolveDefinition(definition, input);
  },

  input(key, options) {
    return createInput(key, options);
  },

  source(fn, options) {
    // When a source fn returns a Chunks result, treat it as a chunk source
    return createSource(fn, options);
  },

  chunks(promise, normalize) {
    if (normalize) {
      return createChunks(promise, normalize);
    }

    return createChunks(promise as Promise<Chunk[]>);
  },
};

/**
 * Helper that wraps a source fn returning Chunks as a ChunkSource.
 * Use this inside polo.define when you want chunk packing behaviour.
 */
export function chunkSource<TInput extends AnyInput, TSources extends Record<string, unknown>>(
  fn: (input: TInput, sources: TSources) => Promise<Chunks>,
  options?: SourceOptions,
) {
  return createChunkSource<TInput, TSources>(fn, options);
}
