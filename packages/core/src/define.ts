import type { AnyInput, AnySource, Definition, DeriveFn, InferSources, Policies } from "./types.ts";

export function createDefinition<
  TInput extends AnyInput,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TSourceMap extends Record<string, AnySource<any, any>>,
  TSources extends InferSources<TSourceMap>,
  TDerived extends Record<string, unknown>,
>(options: {
  id: string;
  sources: TSourceMap;
  derive?: DeriveFn<TSources, TDerived>;
  policies?: Policies<TSources, TDerived>;
}): Definition<TInput, TSourceMap, TSources, TDerived> {
  return {
    _id: options.id,
    _sources: options.sources,
    _derive: options.derive,
    _policies: options.policies ?? {},
  };
}
