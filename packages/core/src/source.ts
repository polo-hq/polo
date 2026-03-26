import { createChunks } from "./chunks.ts";
import type {
  AnyInput,
  AnySchema,
  Chunk,
  ChunkSource,
  ChunkSourceConfig,
  FromInputSourceOptions,
  InferSchemaOutputObject,
  InputSource,
  ResolverSource,
  SourceConfig,
} from "./types.ts";

async function validateSourceInput<TSchema extends AnySchema>(
  schema: TSchema,
  input: AnyInput,
): Promise<InferSchemaOutputObject<TSchema>> {
  const result = await schema["~standard"].validate(input);
  if (result.issues !== undefined) {
    const details = result.issues.map((issue) => issue.message).join("; ");
    throw new Error(`Source input validation failed: ${details}`);
  }

  return result.value as InferSchemaOutputObject<TSchema>;
}

export function createFromInputSource<TKey extends string>(
  key: TKey,
  options?: FromInputSourceOptions,
): InputSource<TKey> {
  return {
    _type: "input",
    _key: key,
    _tags: options?.tags ?? [],
  };
}

export function createValueSource<
  TSchema extends AnySchema,
  TContext extends Record<string, unknown>,
  TOutput,
>(
  inputSchema: TSchema,
  config: SourceConfig<InferSchemaOutputObject<TSchema>, TContext, TOutput>,
): ResolverSource<Awaited<TOutput>, InferSchemaOutputObject<TSchema>> {
  return {
    _dependencySource: config.resolve.toString(),
    _sourceKind: "value",
    _input: undefined,
    output: config.output,
    tags: config.tags ?? [],
    async resolve(runtimeInput, context): Promise<Awaited<TOutput>> {
      const normalizedInput = await validateSourceInput(inputSchema, runtimeInput);
      return await config.resolve({
        input: normalizedInput,
        context: context as TContext,
      });
    },
  };
}

export function createChunkSource<
  TSchema extends AnySchema,
  TContext extends Record<string, unknown>,
  TItem,
>(
  inputSchema: TSchema,
  config: ChunkSourceConfig<InferSchemaOutputObject<TSchema>, TContext, TItem>,
): ChunkSource<InferSchemaOutputObject<TSchema>> {
  return {
    _dependencySource: config.resolve.toString(),
    _sourceKind: "chunks",
    _input: undefined,
    output: config.output,
    tags: config.tags ?? [],
    async resolve(runtimeInput, context) {
      const normalizedInput = await validateSourceInput(inputSchema, runtimeInput);
      const result = await config.resolve({
        input: normalizedInput,
        context: context as TContext,
      });

      if (config.normalize) {
        return createChunks(Promise.resolve(result as TItem[]), config.normalize);
      }

      return createChunks(Promise.resolve(result as Chunk[]));
    },
  };
}
