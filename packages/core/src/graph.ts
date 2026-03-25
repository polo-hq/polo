import type { AnyInput, AnySource } from "./types.ts";
import { SourceResolutionError } from "./errors.ts";

function stripCommentsAndLiterals(source: string): string {
  let result = "";
  let index = 0;
  let state:
    | "code"
    | "single-quote"
    | "double-quote"
    | "template"
    | "line-comment"
    | "block-comment" = "code";
  const templateExpressionStack: number[] = [];

  while (index < source.length) {
    const current = source[index] ?? "";
    const next = source[index + 1] ?? "";

    if (state === "code") {
      if (current === "/" && next === "/") {
        result += "  ";
        state = "line-comment";
        index += 2;
        continue;
      }

      if (current === "/" && next === "*") {
        result += "  ";
        state = "block-comment";
        index += 2;
        continue;
      }

      if (current === "'") {
        result += " ";
        state = "single-quote";
        index += 1;
        continue;
      }

      if (current === '"') {
        result += " ";
        state = "double-quote";
        index += 1;
        continue;
      }

      if (current === "`") {
        result += " ";
        state = "template";
        index += 1;
        continue;
      }

      if (templateExpressionStack.length > 0) {
        if (current === "{") {
          templateExpressionStack[templateExpressionStack.length - 1] += 1;
        } else if (current === "}") {
          const depth = templateExpressionStack[templateExpressionStack.length - 1] ?? 0;
          if (depth === 1) {
            templateExpressionStack.pop();
            result += current;
            state = "template";
            index += 1;
            continue;
          }

          templateExpressionStack[templateExpressionStack.length - 1] = depth - 1;
        }
      }

      result += current;
      index += 1;
      continue;
    }

    if (state === "line-comment") {
      result += current === "\n" ? "\n" : " ";
      if (current === "\n") {
        state = "code";
      }
      index += 1;
      continue;
    }

    if (state === "block-comment") {
      if (current === "*" && next === "/") {
        result += "  ";
        state = "code";
        index += 2;
        continue;
      }

      result += current === "\n" ? "\n" : " ";
      index += 1;
      continue;
    }

    if (state === "single-quote" || state === "double-quote") {
      const quote = state === "single-quote" ? "'" : '"';

      if (current === "\\") {
        result += next ? "  " : " ";
        index += next ? 2 : 1;
        continue;
      }

      result += current === "\n" ? "\n" : " ";
      if (current === quote) {
        state = "code";
      }
      index += 1;
      continue;
    }

    // template
    if (current === "\\") {
      result += next ? "  " : " ";
      index += next ? 2 : 1;
      continue;
    }

    if (current === "$" && next === "{") {
      result += "  ";
      templateExpressionStack.push(1);
      state = "code";
      index += 2;
      continue;
    }

    result += current === "\n" ? "\n" : " ";
    if (current === "`") {
      state = "code";
    }
    index += 1;
  }

  return result;
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

/**
 * Infer which source keys a source function depends on by statically
 * analysing the function source string for `sources.KEY` access patterns and
 * destructured second-parameter dependencies.
 *
 * This avoids executing the function during the planning pass, which is
 * important because async functions execute side effects up to the first
 * `await` even when called with a proxy.
 *
 * Matches patterns like:
 *   sources.foo
 *   sources.foo.bar.baz
 *   sources["foo"]
 */
function inferDependencies<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TSourceMap extends Record<string, AnySource<any, any>>,
>(sourceMap: TSourceMap, key: string): Set<string> {
  const source = sourceMap[key];
  if (!source) return new Set();

  // input sources have no dependencies
  if (source._type === "input") return new Set();

  const validKeys = new Set(Object.keys(sourceMap));
  const accessed = new Set<string>();

  const fnStr = stripCommentsAndLiterals(source._fn.toString());

  for (const dep of inferDestructuredDependencies(fnStr, validKeys)) {
    if (dep !== key) {
      accessed.add(dep);
    }
  }

  // Match sources.identifier or sources["identifier"] or sources['identifier']
  const dotPattern = /\bsources\.([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  const bracketPattern = /\bsources\[["']([a-zA-Z_$][a-zA-Z0-9_$]*)["']\]/g;

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
export function buildWaves<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TSourceMap extends Record<string, AnySource<any, any>>,
>(sourceMap: TSourceMap): Wave[] {
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
export async function executeWaves<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TSourceMap extends Record<string, AnySource<any, any>>,
>(
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
        const source = sourceMap[key]!;
        const start = Date.now();

        try {
          let value: unknown;

          if (source._type === "input") {
            value = input[source._key];
          } else {
            value = await source._fn(input, sourcesProxy);
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
