/**
 * evals/providers/baseline.ts
 *
 * Baseline provider: reads the entire codebase into a single prompt
 * and sends it directly to the model with no orchestration.
 *
 * Must be a class — promptfoo calls `new Provider(options)` for file:// providers.
 */

import path from "node:path";
import fs from "node:fs";
import picomatch from "picomatch";
import type { CallApiContextParams, ProviderOptions, ProviderResponse } from "promptfoo";

interface BaselineProviderConfig {
  root?: string;
  include?: string[];
  exclude?: string[];
  model?: string;
  provider?: string;
}

interface FsOptions {
  include?: string[];
  exclude?: string[];
}

const DEFAULT_EXCLUDE = [
  "node_modules/**",
  "**/node_modules/**",
  ".git/**",
  "**/.git/**",
  "dist/**",
  "**/dist/**",
  ".next/**",
  "**/.next/**",
  ".turbo/**",
  "**/.turbo/**",
  "coverage/**",
  "**/coverage/**",
  ".cache/**",
  "**/.cache/**",
];

function collectFiles(dir: string, options: FsOptions = {}): string[] {
  const exclude = normalizeGlobPatterns(options.exclude ?? DEFAULT_EXCLUDE);
  const include = normalizeGlobPatterns(options.include);
  return walkFiles(dir, dir, include, exclude);
}

function walkFiles(root: string, dir: string, include: string[], exclude: string[]): string[] {
  const results: string[] = [];
  const matchesInclude = include.length > 0 ? picomatch(include, { dot: true }) : undefined;
  const matchesExclude = picomatch(exclude, { dot: true });

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const rel = normalizeRelativePath(path.relative(root, fullPath));
    if (entry.isDirectory()) {
      if (matchesDirectory(rel, matchesExclude)) continue;
      results.push(...walkFiles(root, fullPath, include, exclude));
    } else if (entry.isFile()) {
      if (matchesExclude(rel)) continue;
      if (matchesInclude && !matchesInclude(rel)) continue;
      results.push(fullPath);
    }
  }

  return results;
}

function normalizeGlobPatterns(patterns?: string[]): string[] {
  if (!patterns || patterns.length === 0) return [];
  return patterns
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length > 0)
    .map((pattern) => pattern.replace(/\\/g, "/").replace(/^\.\//, ""));
}

function normalizeRelativePath(relPath: string): string {
  return relPath.replace(/\\/g, "/").replace(/^\.\//, "");
}

function matchesDirectory(relPath: string, matcher: (input: string) => boolean): boolean {
  const normalized = normalizeRelativePath(relPath);
  return matcher(normalized) || matcher(`${normalized}/__dir__`);
}

function buildFullContext(
  files: string[],
  sourceRoot: string,
  maxFileSize = 128 * 1024,
): { context: string; totalBytes: number } {
  const parts: string[] = [];
  let totalBytes = 0;

  for (const filePath of files) {
    const rel = path.relative(sourceRoot, filePath);
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > maxFileSize) {
        parts.push(`--- ${rel} ---\n[File too large: ${(stat.size / 1024).toFixed(1)} KiB]`);
        continue;
      }
      const content = fs.readFileSync(filePath, "utf8");
      parts.push(`--- ${rel} ---\n${content}`);
      totalBytes += stat.size;
    } catch {
      parts.push(`--- ${rel} ---\n[Could not read file]`);
    }
  }

  return { context: parts.join("\n\n"), totalBytes };
}

export default class BaselineProvider {
  private readonly config: BaselineProviderConfig;
  private readonly providerId: string;

  constructor(options: ProviderOptions) {
    this.config = (options.config ?? {}) as BaselineProviderConfig;
    this.providerId = options.id ?? "baseline";
  }

  id(): string {
    return this.providerId;
  }

  async callApi(prompt: string, _context?: CallApiContextParams): Promise<ProviderResponse> {
    const { config } = this;

    const evalDir = path.dirname(new URL(import.meta.url).pathname);
    const repoRoot = path.resolve(evalDir, "../../..");
    const sourceRoot = config.root
      ? path.resolve(evalDir, config.root)
      : path.resolve(repoRoot, "packages/core");

    const model = config.model ?? process.env.BASELINE_MODEL ?? "claude-sonnet-4-6";
    const providerName = config.provider ?? process.env.BUDGE_PROVIDER ?? "anthropic";

    const files = collectFiles(sourceRoot, {
      include: config.include,
      exclude: config.exclude,
    });
    const { context: fullContext, totalBytes } = buildFullContext(files, sourceRoot);

    const systemPrompt = [
      "You are an expert software engineer.",
      "You have been given the complete contents of a codebase below.",
      "Answer the user's question directly and precisely based only on the provided code.",
      "",
      "## Codebase",
      "",
      fullContext,
    ].join("\n");

    const { generateText } = await import("ai");

    let llmModel: Parameters<typeof generateText>[0]["model"];

    if (providerName === "openrouter") {
      const { createOpenRouter } = await import("@openrouter/ai-sdk-provider");
      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
      });
      llmModel = openrouter.chat(model);
    } else if (providerName === "anthropic") {
      const { anthropic } = await import("@ai-sdk/anthropic");
      llmModel = anthropic(model);
    } else {
      const { openai } = await import("@ai-sdk/openai");
      llmModel = openai(model);
    }

    const startMs = Date.now();

    try {
      const result = await generateText({
        model: llmModel,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }],
      });

      const wallMs = Date.now() - startMs;
      const totalTokens = (result.usage?.inputTokens ?? 0) + (result.usage?.outputTokens ?? 0);
      const cachedTokens =
        (result.usage as any)?.inputTokenDetails?.cacheReadTokens ??
        (result.usage as any)?.cachedInputTokens ??
        0;

      return {
        output: result.text,
        latencyMs: wallMs,
        tokenUsage: {
          total: totalTokens,
          prompt: result.usage?.inputTokens ?? 0,
          completion: result.usage?.outputTokens ?? 0,
          cached: cachedTokens,
          completionDetails: {
            cacheReadInputTokens: cachedTokens,
          },
        },
        metadata: {
          totalTokens,
          totalCachedTokens: cachedTokens,
          filesRead: files.length,
          totalBytes,
          durationMs: wallMs,
          approach: "full-context-dump",
        },
      };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
