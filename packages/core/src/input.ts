import type { AnyInput, InputSource, InputSourceOptions } from "./types.ts";

export function createInput<TInput extends AnyInput, TKey extends string & keyof TInput>(
  key: TKey,
  options?: InputSourceOptions,
): InputSource<TInput, TKey> {
  return {
    _type: "input",
    _key: key,
    _sensitivity: options?.sensitivity ?? "internal",
  };
}
