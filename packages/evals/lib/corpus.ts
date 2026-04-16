import * as fs from "node:fs";
import * as path from "node:path";
import picomatch from "picomatch";
import { estimateTokenCount, splitByTokens } from "tokenx";

export interface CorpusFilterOptions {
  include?: string[];
  exclude?: string[];
}

export interface CorpusFile {
  absolutePath: string;
  relativePath: string;
  content: string;
  tokenCount: number;
}

export interface CorpusChunk {
  id: string;
  filePath: string;
  content: string;
  tokenCount: number;
}

export interface CorpusInfo {
  checkoutRoot: string;
  sourceRoot: string;
  commit: string;
}

export interface ChunkCorpusOptions extends CorpusFilterOptions {
  chunkSize?: number;
  overlap?: number;
}

export const DEFAULT_CORPUS_ROOT = "packages/evals/corpus/eval-corpus";
export const DEFAULT_SOURCE_ROOT = "packages/evals/corpus/eval-corpus/packages/next/src";
export const DEFAULT_INCLUDE = ["**/*.{ts,tsx,js,jsx}"];
export const DEFAULT_EXCLUDE = ["**/*.test.*", "**/__tests__/**", "**/test/**"];

export function resolveCorpusRoot(repoRoot: string, relativePath = DEFAULT_CORPUS_ROOT): string {
  return path.resolve(repoRoot, relativePath);
}

export function resolveCorpusSourceRoot(
  repoRoot: string,
  relativePath = DEFAULT_SOURCE_ROOT,
): string {
  return path.resolve(repoRoot, relativePath);
}

export function verifyCorpus(sourceRoot: string, expectedCommit?: string): CorpusInfo {
  const marker = findUpwards(sourceRoot, ".eval-commit");
  if (!marker) {
    throw new Error(`Missing .eval-commit for corpus rooted at ${sourceRoot}`);
  }

  const commit = fs.readFileSync(marker, "utf8").trim();
  if (!commit) {
    throw new Error(`Empty .eval-commit at ${marker}`);
  }

  if (expectedCommit && expectedCommit !== commit) {
    throw new Error(`Corpus commit mismatch: expected ${expectedCommit}, found ${commit}`);
  }

  return {
    checkoutRoot: path.dirname(marker),
    sourceRoot,
    commit,
  };
}

export function loadCorpusFiles(
  sourceRoot: string,
  options: CorpusFilterOptions = {},
): CorpusFile[] {
  const relativePaths = collectRelativeFiles(sourceRoot, options);
  return relativePaths.map((relativePath) => {
    const absolutePath = path.join(sourceRoot, relativePath);
    const content = fs.readFileSync(absolutePath, "utf8");
    return {
      absolutePath,
      relativePath,
      content,
      tokenCount: estimateTokenCount(content),
    };
  });
}

export function collectRelativeFiles(
  sourceRoot: string,
  options: CorpusFilterOptions = {},
): string[] {
  const include = normalizeGlobPatterns(options.include ?? DEFAULT_INCLUDE);
  const exclude = normalizeGlobPatterns(options.exclude ?? DEFAULT_EXCLUDE);
  return walk(sourceRoot, sourceRoot, include, exclude).sort();
}

export function chunkCorpus(sourceRoot: string, options: ChunkCorpusOptions = {}): CorpusChunk[] {
  const files = loadCorpusFiles(sourceRoot, options);
  const chunkSize = options.chunkSize ?? 500;
  const overlap = options.overlap ?? 50;
  const chunks: CorpusChunk[] = [];

  for (const file of files) {
    const rawChunks = splitByTokens(file.content, chunkSize, { overlap });
    const normalizedChunks = rawChunks
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 0);

    if (normalizedChunks.length === 0) {
      chunks.push({
        id: `${file.relativePath}#chunk:0`,
        filePath: file.relativePath,
        content: file.content,
        tokenCount: file.tokenCount,
      });
      continue;
    }

    normalizedChunks.forEach((chunk, index) => {
      chunks.push({
        id: `${file.relativePath}#chunk:${index}`,
        filePath: file.relativePath,
        content: chunk,
        tokenCount: estimateTokenCount(chunk),
      });
    });
  }

  return chunks;
}

export function estimateCorpusTokens(files: CorpusFile[]): number {
  return files.reduce((sum, file) => sum + file.tokenCount, 0);
}

function walk(root: string, dir: string, include: string[], exclude: string[]): string[] {
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
    const absolutePath = path.join(dir, entry.name);
    const relativePath = normalizeRelativePath(path.relative(root, absolutePath));

    if (entry.isDirectory()) {
      if (matchesDirectory(relativePath, matchesExclude)) continue;
      results.push(...walk(root, absolutePath, include, exclude));
      continue;
    }

    if (!entry.isFile()) continue;
    if (matchesExclude(relativePath)) continue;
    if (matchesInclude && !matchesInclude(relativePath)) continue;
    results.push(relativePath);
  }

  return results;
}

function findUpwards(start: string, fileName: string): string | undefined {
  let current = path.resolve(start);
  while (true) {
    const candidate = path.join(current, fileName);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
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
  return matcher(relPath) || matcher(`${relPath}/__dir__`);
}
