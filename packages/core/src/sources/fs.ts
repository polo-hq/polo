import * as fs from "node:fs";
import * as path from "node:path";
import picomatch from "picomatch";
import { ripgrep } from "ripgrep";
import type { SearchMatch, SearchQuery, SourceAdapter } from "./interface.ts";

/**
 * Options for the filesystem source adapter.
 */
export interface FsAdapterOptions {
  /**
   * Glob patterns for files to include. If omitted, all non-excluded
   * files are included.
   *
   * Directory entries remain visible for navigation even when they do not
   * match `include` directly. The allowlist is enforced for file reads,
   * search, and file counts.
   *
   * @example ["*.{ts,tsx}", "docs/**"]
   */
  include?: string[];

  /**
   * Glob patterns to exclude, merged with the default denylist.
   *
   * These globs apply consistently to listing, reading, search, and file
   * counts. Use this to carve out generated files, tests, or other areas the
   * agent should not see.
   *
   * @default DEFAULT_EXCLUDE (dependency directories, build outputs, VCS/tooling dirs, lockfiles, OS artifacts)
   * @example ["*.test.*", "tests/**"]
   */
  exclude?: string[];
}

const DEFAULT_EXCLUDED_DIRECTORIES = [
  // Dependency directories
  "node_modules",
  "bower_components",
  "vendor",
  // Build outputs
  "dist",
  "build",
  "out",
  "coverage",
  "target",
  ".next",
  ".nuxt",
  ".turbo",
  // Python
  "venv",
  ".venv",
  "__pycache__",
  ".tox",
  // Version control & tooling
  ".git",
  ".cache",
  ".budge",
];

const DEFAULT_EXCLUDED_FILES = [
  // Lock files (filenames, not directories)
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "poetry.lock",
  "Cargo.lock",
  "Gemfile.lock",
  "composer.lock",
  "uv.lock",
  // OS artifacts
  ".DS_Store",
  "Thumbs.db",
];

const DEFAULT_EXCLUDE = [
  ...DEFAULT_EXCLUDED_DIRECTORIES.flatMap((name) => [
    name,
    `${name}/**`,
    `**/${name}`,
    `**/${name}/**`,
  ]),
  ...DEFAULT_EXCLUDED_FILES.flatMap((name) => [name, `**/${name}`]),
];

const FS_READ_HARD_LIMIT = 10 * 1024 * 1024; // 10 MiB

/**
 * A source adapter that exposes a local filesystem directory.
 *
 * Supports navigable list/read access and ripgrep-powered search.
 *
 * @example
 * ```ts
 * const codebase = source.fs("./src")
 * const codebase = source.fs("./src", { include: ["*.{ts,tsx}"] })
 * ```
 */
export class FsAdapter implements SourceAdapter {
  private readonly root: string;
  private readonly realRoot: string;
  private readonly includeGlobs: string[];
  private readonly excludeGlobs: string[];
  private readonly matchesInclude: ((input: string) => boolean) | undefined;
  private readonly matchesExclude: (input: string) => boolean;

  constructor(rootPath: string, options: FsAdapterOptions = {}) {
    this.root = path.resolve(rootPath);
    // Resolve the root's own symlinks once at construction so the realpath
    // check in resolve() compares against the true on-disk path.
    // Fall back to the string-resolved path if the root doesn't exist yet.
    try {
      this.realRoot = fs.realpathSync.native(this.root);
    } catch {
      this.realRoot = this.root;
    }
    this.includeGlobs = normalizeGlobPatterns(options.include);
    this.excludeGlobs = [...DEFAULT_EXCLUDE, ...normalizeGlobPatterns(options.exclude)];
    this.matchesInclude =
      this.includeGlobs.length > 0 ? picomatch(this.includeGlobs, { dot: true }) : undefined;
    this.matchesExclude = picomatch(this.excludeGlobs, { dot: true });
  }

  describe(): string {
    let topLevel: string[] = [];
    let fileCount = 0;
    let fileCountCapped = false;

    try {
      topLevel = fs
        .readdirSync(this.root, { withFileTypes: true })
        .filter((entry) => !this.isPathExcluded(entry.name, entry.isDirectory()))
        .filter((entry) => entry.isDirectory() || this.isPathIncluded(entry.name))
        .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
        .sort();

      ({ count: fileCount, capped: fileCountCapped } = this.countFiles(this.root));
    } catch {
      return `Local filesystem at ${this.root} (unable to read directory)`;
    }

    const countStr = fileCountCapped ? `~${fileCount}+` : `${fileCount}`;
    const topStr = topLevel.slice(0, 10).join(", ");
    const more = topLevel.length > 10 ? ` … and ${topLevel.length - 10} more` : "";
    return (
      `Local filesystem at ${this.root} — ${countStr} file${fileCount === 1 ? "" : "s"}. ` +
      `Top-level: ${topStr}${more}. ` +
      `Searchable via search_source (regex or literal). Use filters: { fixed: true } for literal string search. ` +
      `Include/exclude globs apply consistently to list, read, and search.`
    );
  }

  async list(dirPath?: string): Promise<string[]> {
    const target = dirPath ? await this.resolve(dirPath) : this.root;
    if (dirPath && this.isPathExcluded(dirPath, true)) {
      throw new Error(`Path excluded by source configuration: ${dirPath}`);
    }

    const entries = await fs.promises.readdir(target, { withFileTypes: true });
    const results: string[] = [];

    for (const entry of entries) {
      const rel = dirPath ? `${dirPath}/${entry.name}` : entry.name;
      if (this.isPathExcluded(rel, entry.isDirectory())) continue;

      if (entry.isDirectory()) {
        results.push(`${rel}/`);
      } else if (entry.isFile()) {
        if (!this.isPathIncluded(rel)) continue;
        results.push(rel);
      }
    }

    return results.sort();
  }

  async read(filePath: string): Promise<string> {
    const absolute = await this.resolve(filePath);
    const stat = await fs.promises.stat(absolute);

    if (!stat.isFile()) {
      throw new Error(`Not a file: ${filePath}`);
    }

    if (this.isPathExcluded(filePath)) {
      throw new Error(`Path excluded by source configuration: ${filePath}`);
    }

    if (!this.isPathIncluded(filePath)) {
      throw new Error(`Path not included by source configuration: ${filePath}`);
    }

    // Prevent loading arbitrarily large files into memory. Display truncation
    // happens later in the tool layer; this cap only guards the raw read.
    if (stat.size > FS_READ_HARD_LIMIT) {
      throw new Error(
        `File too large to read: ${filePath} (${formatBytes(stat.size)}, limit ${formatBytes(FS_READ_HARD_LIMIT)})`,
      );
    }

    return fs.promises.readFile(absolute, "utf8");
  }

  async search(query: SearchQuery): Promise<SearchMatch[]> {
    // --max-count limits matches *per file*. A low value (5) keeps the
    // buffered stdout proportional to k files × 5 lines, avoiding hundreds of
    // MB for broad queries on large repos. Five context lines per file is
    // enough for the orchestrator to judge relevance.
    const args: string[] = ["--json", "--max-count", "5"];

    if (query.filters?.fixed === true) {
      args.push("--fixed-strings");
    }

    if (this.includeGlobs.length > 0) {
      for (const pattern of this.includeGlobs) {
        args.push("--glob", pattern);
      }
    }

    for (const pattern of new Set(this.excludeGlobs)) {
      args.push("--glob", `!${pattern}`);
    }

    // ripgrep WASM works relative to its preopens. We pass "." as the search
    // path (which maps to this.root via the preopen) so all returned paths
    // are relative and consistent.
    args.push("--", query.text, ".");

    let stdout = "";
    try {
      const result = await ripgrep(args, {
        buffer: true,
        preopens: { ".": this.root },
      });
      // Exit code 0 = matches, 1 = no matches, 2 = error
      if (result.code === 2) return [];
      stdout = result.stdout;
    } catch {
      return [];
    }

    return parseRipgrepJson(stdout, query.k);
  }

  /**
   * Resolves a relative path against the root, guarding against traversal.
   *
   * Two-stage check:
   * 1. String check on the resolved path — catches simple `../` traversal.
   * 2. `realpath` check — dereferences symlinks and re-validates, catching
   *    symlinks that point outside the root (e.g. `lib -> /etc`).
   *
   * Returns the original `absolute` path (not the realpath) so that listings
   * and tool call results use the correct relative labels.
   */
  private async resolve(rel: string): Promise<string> {
    const absolute = path.resolve(this.root, rel);
    if (!absolute.startsWith(this.root + path.sep) && absolute !== this.root) {
      throw new Error(`Path traversal detected: ${rel}`);
    }
    // Dereference symlinks and re-check against the real root — catches
    // symlinks inside the tree that point outside it (e.g. lib -> /etc).
    const real = await fs.promises.realpath(absolute).catch(() => absolute);
    if (!real.startsWith(this.realRoot + path.sep) && real !== this.realRoot) {
      throw new Error(`Path traversal detected: ${rel}`);
    }
    return absolute;
  }

  /**
   * Count files up to `MAX_COUNT_DEPTH` levels deep to avoid blocking the
   * event loop on large trees. Returns `capped: true` when the depth limit
   * was reached so `describe()` can signal an approximate count.
   */
  private countFiles(dir: string, depth = 0): { count: number; capped: boolean } {
    const MAX_COUNT_DEPTH = 3;
    if (depth > MAX_COUNT_DEPTH) return { count: 0, capped: true };
    let count = 0;
    let capped = false;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        const rel = normalizeRelativePath(path.relative(this.root, entryPath));
        if (this.isPathExcluded(rel, entry.isDirectory())) continue;
        if (entry.isDirectory()) {
          const child = this.countFiles(entryPath, depth + 1);
          count += child.count;
          if (child.capped) capped = true;
        } else if (entry.isFile()) {
          if (!this.isPathIncluded(rel)) continue;
          count++;
        }
      }
    } catch {
      // ignore unreadable directories
    }
    return { count, capped };
  }

  private isPathExcluded(relPath: string, isDirectory = false): boolean {
    return matchesPath(this.matchesExclude, relPath, isDirectory);
  }

  private isPathIncluded(relPath: string): boolean {
    if (!this.matchesInclude) return true;
    return matchesPath(this.matchesInclude, relPath, false);
  }
}

// ---------------------------------------------------------------------------
// ripgrep JSON output parsing
// ---------------------------------------------------------------------------

interface RgText {
  text?: string;
  bytes?: string;
}

interface RgMatchData {
  path: RgText | null;
  lines: RgText;
  line_number: number | null;
}

interface RgMatchJsonLine {
  type: "match";
  data: RgMatchData;
}

interface RgOtherJsonLine {
  type: string;
  data?: unknown;
}

type RgJsonLine = RgMatchJsonLine | RgOtherJsonLine;

/**
 * Parse ripgrep's `--json` NDJSON output into SearchMatch[].
 *
 * Groups all matching lines by file, returns up to `k` files,
 * each represented as a single SearchMatch with all hit lines joined.
 */
function parseRipgrepJson(stdout: string, k: number): SearchMatch[] {
  // Group hits by file path
  const byFile = new Map<string, { lines: string[]; lineNumbers: number[] }>();

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let parsed: RgJsonLine;
    try {
      parsed = JSON.parse(trimmed) as RgJsonLine;
    } catch {
      continue;
    }

    if (parsed.type !== "match") continue;
    const matchParsed = parsed as RgMatchJsonLine;

    const filePath = matchParsed.data.path?.text;
    const matchLine = matchParsed.data.lines.text;
    const lineNum = matchParsed.data.line_number;

    if (!filePath || matchLine === undefined || lineNum === null) continue;

    const normalizedFilePath = normalizeRelativePath(filePath);
    if (!normalizedFilePath) continue;

    const trimmedMatchLine = matchLine.trimEnd();

    const existing = byFile.get(normalizedFilePath);
    if (existing) {
      existing.lines.push(trimmedMatchLine);
      existing.lineNumbers.push(lineNum);
    } else {
      byFile.set(normalizedFilePath, { lines: [trimmedMatchLine], lineNumbers: [lineNum] });
    }
  }

  const results: SearchMatch[] = [];
  for (const [filePath, { lines, lineNumbers }] of byFile) {
    if (results.length >= k) break;
    results.push({
      id: filePath,
      content: lines.join("\n"),
      score: 1.0,
      metadata: {
        file: filePath,
        hitCount: lines.length,
        lineNumbers,
      },
    });
  }

  return results;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }

  return `${bytes} B`;
}

function normalizeGlobPatterns(patterns?: string[]): string[] {
  if (!patterns || patterns.length === 0) return [];
  return patterns
    .map((pattern) => pattern.trim())
    .filter((pattern) => pattern.length > 0)
    .map((pattern) => pattern.replace(/\\/g, "/").replace(/^\.\//, ""));
}

function normalizeRelativePath(relPath: string): string {
  const normalized = path.posix.normalize(relPath.replace(/\\/g, "/")).replace(/^\.\//, "");
  if (normalized === ".") return "";
  return normalized.replace(/^\/+/, "").replace(/\/+$/, "");
}

function matchesPath(
  matcher: (input: string) => boolean,
  relPath: string,
  isDirectory: boolean,
): boolean {
  const normalized = normalizeRelativePath(relPath);
  if (!normalized) return false;
  if (matcher(normalized)) return true;
  return isDirectory ? matcher(`${normalized}/__dir__`) : false;
}
