import type {
  AnyInput,
  ComposeFn,
  InferSchemaInputObject,
  InferSchemaOutputObject,
  InputSchema,
  WindowSpec,
} from "./types.ts";

export function createWindowSpec<TSchema extends InputSchema<AnyInput, AnyInput>>(
  input: TSchema,
  config: {
    id: string;
    maxTokens: number;
    compose: ComposeFn<InferSchemaOutputObject<TSchema>>;
  },
): WindowSpec<InferSchemaOutputObject<TSchema>, InferSchemaInputObject<TSchema>> {
  return {
    _id: config.id,
    _inputSchema: input as unknown as InputSchema<
      InferSchemaInputObject<TSchema>,
      InferSchemaOutputObject<TSchema>
    >,
    _maxTokens: config.maxTokens,
    _compose: config.compose,
  };
}
