import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { FsAdapter } from "../../src/sources/fs.ts";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "budge-fs-test-"));

  fs.writeFileSync(path.join(tmpDir, "index.ts"), 'export const hello = "world"\n');
  fs.writeFileSync(path.join(tmpDir, "utils.ts"), "export function noop() {}\n");
  fs.writeFileSync(path.join(tmpDir, "README.md"), "# Test repo\n");

  fs.mkdirSync(path.join(tmpDir, "lib"));
  fs.writeFileSync(path.join(tmpDir, "lib", "helper.ts"), "export const x = 1\n");
  fs.writeFileSync(path.join(tmpDir, "lib", "math.ts"), "export const pi = 3.14\n");
  fs.writeFileSync(path.join(tmpDir, "lib", "helper.test.ts"), "export const tested = true\n");

  fs.mkdirSync(path.join(tmpDir, "__tests__"));
  fs.writeFileSync(
    path.join(tmpDir, "__tests__", "integration.ts"),
    "export const integration = true\n",
  );

  fs.mkdirSync(path.join(tmpDir, "docs"));
  fs.writeFileSync(path.join(tmpDir, "docs", "guide.md"), "# Guide\n");

  fs.mkdirSync(path.join(tmpDir, "generated"));
  fs.writeFileSync(path.join(tmpDir, "generated", "types.ts"), "export type Generated = string\n");

  fs.mkdirSync(path.join(tmpDir, "build"));
  fs.writeFileSync(path.join(tmpDir, "build", "output.js"), "module.exports = {}\n");

  fs.mkdirSync(path.join(tmpDir, "node_modules", "lodash"), { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, "node_modules", "lodash", "index.js"),
    "module.exports = {}\n",
  );
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("FsAdapter filtering", () => {
  it("merges custom exclude globs with the default denylist", async () => {
    const adapter = new FsAdapter(tmpDir, { exclude: ["**/generated/**"] });
    const entries = await adapter.list();

    expect(entries).toContain("index.ts");
    expect(entries).not.toContain("build/");
    expect(entries).not.toContain("generated/");
    expect(entries).not.toContain("node_modules/");
  });

  it("uses include globs as a file allowlist while keeping directories navigable", async () => {
    const adapter = new FsAdapter(tmpDir, { include: ["**/*.ts"] });
    const entries = await adapter.list();

    expect(entries).toContain("index.ts");
    expect(entries).toContain("lib/");
    expect(entries).toContain("docs/");
    expect(entries).not.toContain("README.md");
  });

  it("applies include and exclude globs to file counts in describe()", () => {
    const adapter = new FsAdapter(tmpDir, {
      include: ["**/*.ts"],
      exclude: ["**/*.test.ts", "**/__tests__/**", "**/generated/**"],
    });

    const desc = adapter.describe();
    expect(desc).toContain("4 files");
    expect(desc).toContain("Include/exclude globs");
  });
});

describe("FsAdapter.list()", () => {
  it("lists root entries, excluding default denylist entries", async () => {
    const adapter = new FsAdapter(tmpDir);
    const entries = await adapter.list();

    expect(entries).toContain("README.md");
    expect(entries).toContain("index.ts");
    expect(entries).toContain("lib/");
    expect(entries).not.toContain("build/");
    expect(entries).not.toContain("node_modules/");
  });

  it("lists subdirectory contents", async () => {
    const adapter = new FsAdapter(tmpDir);
    const entries = await adapter.list("lib");

    expect(entries).toContain("lib/helper.ts");
    expect(entries).toContain("lib/math.ts");
  });

  it("returns sorted entries", async () => {
    const adapter = new FsAdapter(tmpDir);
    const entries = await adapter.list();

    expect(entries).toEqual([...entries].sort());
  });

  it("filters listed files with include globs", async () => {
    const adapter = new FsAdapter(tmpDir, { include: ["**/*.ts"] });
    const entries = await adapter.list("docs");

    expect(entries).toEqual([]);
  });

  it("rejects listing an excluded directory", async () => {
    const adapter = new FsAdapter(tmpDir, { exclude: ["**/__tests__/**"] });

    await expect(adapter.list("__tests__")).rejects.toThrow(/excluded/i);
  });
});

describe("FsAdapter.read()", () => {
  it("reads allowed file contents", async () => {
    const adapter = new FsAdapter(tmpDir, { include: ["**/*.ts"] });
    const content = await adapter.read("index.ts");

    expect(content).toContain('export const hello = "world"');
  });

  it("rejects excluded files", async () => {
    const adapter = new FsAdapter(tmpDir, { exclude: ["**/*.test.ts"] });

    await expect(adapter.read("lib/helper.test.ts")).rejects.toThrow(/excluded/i);
  });

  it("rejects files outside the include allowlist", async () => {
    const adapter = new FsAdapter(tmpDir, { include: ["**/*.ts"] });

    await expect(adapter.read("README.md")).rejects.toThrow(/not included/i);
  });

  it("throws on non-existent path", async () => {
    const adapter = new FsAdapter(tmpDir);

    await expect(adapter.read("does-not-exist.ts")).rejects.toThrow();
  });

  it("throws on path traversal attempt", async () => {
    const adapter = new FsAdapter(tmpDir);

    await expect(adapter.read("../../../etc/passwd")).rejects.toThrow(/traversal/i);
  });

  it("throws on symlink pointing outside root", async () => {
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "budge-outside-"));
    fs.writeFileSync(path.join(outsideDir, "secret.txt"), "secret");
    fs.symlinkSync(outsideDir, path.join(tmpDir, "escape"));

    const adapter = new FsAdapter(tmpDir);
    await expect(adapter.read("escape/secret.txt")).rejects.toThrow(/traversal/i);

    fs.rmSync(outsideDir, { recursive: true, force: true });
  });

  it("throws for a directory path", async () => {
    const adapter = new FsAdapter(tmpDir);

    await expect(adapter.read("lib")).rejects.toThrow(/not a file/i);
  });

  it("returns full content for oversized but allowed files below the hard limit", async () => {
    const bigFile = path.join(tmpDir, "big.txt");
    fs.writeFileSync(bigFile, "x".repeat(200 * 1024));

    const adapter = new FsAdapter(tmpDir);
    const content = await adapter.read("big.txt");

    expect(content).toHaveLength(200 * 1024);
    expect(content).not.toContain("[File too large to display");
  });

  it("throws before reading files above the hard limit", async () => {
    const hugeFile = path.join(tmpDir, "huge.txt");
    fs.closeSync(fs.openSync(hugeFile, "w"));
    fs.truncateSync(hugeFile, 10 * 1024 * 1024 + 1);

    const readFileSpy = vi.spyOn(fs.promises, "readFile");
    const adapter = new FsAdapter(tmpDir);

    await expect(adapter.read("huge.txt")).rejects.toThrow(/too large.*10\.0 MiB/i);
    expect(readFileSpy).not.toHaveBeenCalled();
  });

  it("allows files at the hard limit", async () => {
    const limitFile = path.join(tmpDir, "limit.txt");
    fs.closeSync(fs.openSync(limitFile, "w"));
    fs.truncateSync(limitFile, 10 * 1024 * 1024);

    const adapter = new FsAdapter(tmpDir);
    const content = await adapter.read("limit.txt");

    expect(content).toHaveLength(10 * 1024 * 1024);
  });
});

describe("FsAdapter.search()", () => {
  it("returns matches for a known string", async () => {
    const adapter = new FsAdapter(tmpDir);
    const results = await adapter.search({ text: "export", k: 10 });

    expect(results.length).toBeGreaterThan(0);
    for (const result of results) {
      expect(result.id).toBeTruthy();
      expect(result.content).toContain("export");
      expect(result.score).toBe(1.0);
    }
  });

  it("respects include and exclude globs the same way as list/read", async () => {
    const adapter = new FsAdapter(tmpDir, {
      include: ["**/*.ts"],
      exclude: ["**/*.test.ts", "**/__tests__/**", "**/generated/**"],
    });

    const results = await adapter.search({ text: "export", k: 10 });
    const files = results.map((result) => result.id);

    expect(files).toContain("index.ts");
    expect(files).toContain("lib/helper.ts");
    expect(files).not.toContain("lib/helper.test.ts");
    expect(files).not.toContain("__tests__/integration.ts");
    expect(files).not.toContain("generated/types.ts");
  });

  it("returns empty array when no matches", async () => {
    const adapter = new FsAdapter(tmpDir);
    const results = await adapter.search({ text: "xyzzy_no_match_zxqwerty", k: 10 });

    expect(results).toEqual([]);
  });

  it("respects the k limit", async () => {
    const adapter = new FsAdapter(tmpDir);
    const results = await adapter.search({ text: "export", k: 2 });

    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("with filters.fixed=true does literal string matching", async () => {
    const adapter = new FsAdapter(tmpDir);
    const results = await adapter.search({ text: "const hello", k: 5, filters: { fixed: true } });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.content).toContain("const hello");
  });

  it("returns match metadata with hitCount and lineNumbers", async () => {
    const adapter = new FsAdapter(tmpDir);
    const results = await adapter.search({ text: "export", k: 5 });

    expect(results[0]!.metadata).toBeDefined();
    expect(typeof (results[0]!.metadata as any).hitCount).toBe("number");
    expect(Array.isArray((results[0]!.metadata as any).lineNumbers)).toBe(true);
  });

  it("describe() mentions search capability", () => {
    const adapter = new FsAdapter(tmpDir);
    const desc = adapter.describe();

    expect(desc).toContain("search_source");
    expect(desc).toContain("fixed");
  });
});
