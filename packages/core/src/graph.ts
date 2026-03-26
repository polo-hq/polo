import type { AnyInput, InputSource, ResolverSource } from "./types.ts";
import { SourceResolutionError } from "./errors.ts";

function isInputSource(source: unknown): source is InputSource<string> {
  return (
    typeof source === "object" &&
    source !== null &&
    "_type" in source &&
    (source as { _type?: unknown })._type === "input"
  );
}

function isResolverSource(source: unknown): source is ResolverSource<unknown> {
  return (
    typeof source === "object" &&
    source !== null &&
    "resolve" in source &&
    typeof (source as { resolve?: unknown }).resolve === "function"
  );
}

function stripCommentsAndLiterals(source: string): string {
  return source.replace(
    /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\/(?:\\[\s\S]|[^/\\\n])+\/[gimsuvy]*/g,
    (match) => match.replace(/[^\n]/g, " "),
  );
}

function inferDestructuredDependencies(source: string, validKeys: Set<string>): Set<string> {
  const dependencies = new Set<string>();
  const parameterMatch = source.match(/^[^(]*\(([^)]*)\)/);
  const parameters = parameterMatch?.[1] ?? "";
  const secondParameter = parameters.split(/,(.+)/)[1]?.trim() ?? "";

  if (!secondParameter.startsWith("{") || !secondParameter.endsWith("}")) {
    return dependencies;
  }

  const body = secondParameter.slice(1, -1);
  for (const segment of body.split(",")) {
    const candidate = segment.trim();
    if (!candidate || candidate.startsWith("...")) {
      continue;
    }

    const key = candidate.split(":", 1)[0]?.trim();
    if (key && validKeys.has(key)) {
      dependencies.add(key);
    }
  }

  return dependencies;
}

function inferDependencies<TSourceMap extends Record<string, unknown>>(
  sourceMap: TSourceMap,
  key: string,
): Set<string> {
  const source = sourceMap[key];
  if (!source || isInputSource(source) || !isResolverSource(source)) {
    return new Set();
  }

  const validKeys = new Set(Object.keys(sourceMap));
  const accessed = new Set<string>();
  const fnStr = stripCommentsAndLiterals(source._dependencySource ?? source.resolve.toString());

  for (const dep of inferDestructuredDependencies(fnStr, validKeys)) {
    if (dep !== key) {
      accessed.add(dep);
    }
  }

  const dotPattern = /\b(?:sources|context)\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  const bracketPattern = /\b(?:sources|context)\[["']([a-zA-Z_$][a-zA-Z0-9_$]*)["']\]/g;

  for (const match of fnStr.matchAll(dotPattern)) {
    const dep = match[1];
    if (dep && validKeys.has(dep) && dep !== key) {
      accessed.add(dep);
    }
  }

  for (const match of fnStr.matchAll(bracketPattern)) {
    const dep = match[1];
    if (dep && validKeys.has(dep) && dep !== key) {
      accessed.add(dep);
    }
  }

  return accessed;
}

interface Wave {
  keys: string[];
}

/**
 * Build an ordered list of execution waves from the source map.
 * Sources in the same wave can be resolved in parallel.
 */
export function buildWaves<TSourceMap extends Record<string, unknown>>(
  sourceMap: TSourceMap,
): Wave[] {
  const keys = Object.keys(sourceMap);
  const deps = new Map<string, Set<string>>();

  for (const key of keys) {
    deps.set(key, inferDependencies(sourceMap, key));
  }

  const waves: Wave[] = [];
  const resolved = new Set<string>();

  while (resolved.size < keys.length) {
    const wave: string[] = [];

    for (const key of keys) {
      if (resolved.has(key)) continue;
      const keyDeps = deps.get(key) ?? new Set();
      const allResolved = [...keyDeps].every((dep) => resolved.has(dep));
      if (allResolved) {
        wave.push(key);
      }
    }

    if (wave.length === 0) {
      const unresolved = keys.filter((k) => !resolved.has(k));
      throw new Error(
        `Circular dependency or unresolvable sources detected: ${unresolved.join(", ")}`,
      );
    }

    waves.push({ keys: wave });
    for (const key of wave) resolved.add(key);
  }

  return waves;
}

/**
 * Execute sources wave by wave.
 * Sources within a wave resolve in parallel.
 * Returns a map of key -> resolved value.
 */
export async function executeWaves<TSourceMap extends Record<string, unknown>>(
  sourceMap: TSourceMap,
  input: AnyInput,
  waves: Wave[],
  taskId: string,
  onResolved: (key: string, value: unknown, durationMs: number) => void,
): Promise<Map<string, unknown>> {
  const resolved = new Map<string, unknown>();

  // Build a proxy that reads from the resolved map
  const sourcesProxy: Record<string, unknown> = new Proxy(
    {},
    {
      get(_target, prop: string) {
        return resolved.get(prop);
      },
    },
  );

  for (const wave of waves) {
    await Promise.all(
      wave.keys.map(async (key) => {
        const source = sourceMap[key];
        const start = Date.now();

        try {
          let value: unknown;

          if (isInputSource(source)) {
            value = input[source._key];
          } else if (isResolverSource(source)) {
            value = await source.resolve(input, sourcesProxy);
          } else {
            throw new TypeError(`Invalid source definition for "${key}".`);
          }

          const durationMs = Date.now() - start;
          resolved.set(key, value);
          onResolved(key, value, durationMs);
        } catch (err) {
          throw new SourceResolutionError(key, taskId, err);
        }
      }),
    );
  }

  return resolved;
}
