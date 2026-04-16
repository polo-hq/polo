import * as fs from "node:fs/promises";
import path from "node:path";
import { generateText, stepCountIs, tool } from "ai";
import type { CallApiContextParams, ProviderOptions, ProviderResponse } from "promptfoo";
import { z } from "zod";
import { runChatScenario } from "../lib/chat-runner.ts";
import { collectRelativeFiles, verifyCorpus } from "../lib/corpus.ts";
import { grepCorpus } from "../lib/grep.ts";
import {
  getLanguageModel,
  normalizeUsage,
  parsePromptPayload,
  resolveFromProvider,
  summarizeWarnings,
  toPromptfooResponse,
} from "./shared.ts";

interface MonolithicV2ProviderConfig {
  corpusRoot?: string;
  expectedCommit?: string;
  include?: string[];
  exclude?: string[];
  actionModel?: string;
  provider?: string;
  maxSteps?: number;
}

export default class MonolithicV2Provider {
  private readonly config: MonolithicV2ProviderConfig;
  private readonly providerId: string;

  constructor(options: ProviderOptions) {
    this.config = (options.config ?? {}) as MonolithicV2ProviderConfig;
    this.providerId = options.id ?? "monolithic-v2";
  }

  id(): string {
    return this.providerId;
  }

  async callApi(prompt: string, _context?: CallApiContextParams): Promise<ProviderResponse> {
    if (!this.config.expectedCommit || this.config.expectedCommit.startsWith("__")) {
      throw new Error(
        "promptfooconfig.v2.yaml is not pinned. Run packages/evals/scripts/setup-corpus.sh first.",
      );
    }
    const parsed = parsePromptPayload(prompt);
    const sourceRoot = resolveFromProvider(import.meta.url, this.config.corpusRoot);
    const corpus = verifyCorpus(sourceRoot, this.config.expectedCommit);
    const providerName = this.config.provider ?? process.env.BUDGE_PROVIDER ?? "openai";
    const actionModelName =
      this.config.actionModel ?? process.env.BUDGE_ACTION ?? "openai/gpt-5.4-mini";
    const actionModel = await getLanguageModel(providerName, actionModelName);
    const access = buildCorpusAccess(sourceRoot, this.config.include, this.config.exclude);
    const tools = buildMonolithicTools({
      sourceRoot,
      include: this.config.include,
      exclude: this.config.exclude,
      access,
    });

    if (parsed.chatTurns) {
      const scenario = await runChatScenario({
        name: parsed.scenarioName,
        turns: parsed.chatTurns,
        act: async ({ history, question }) => {
          const start = Date.now();
          const result = await generateText({
            model: actionModel,
            system: MONOLITHIC_SYSTEM,
            messages: [...history, { role: "user", content: question }],
            tools,
            stopWhen: stepCountIs(this.config.maxSteps ?? 30),
          });
          return {
            text: result.text,
            usage: normalizeUsage(result.usage),
            latencyMs: Date.now() - start,
            metadata: {
              steps: result.steps.length,
              toolCalls: countToolCalls(result.steps),
              warnings: summarizeWarnings(result.warnings),
            },
          };
        },
      });

      return toPromptfooResponse({
        output: scenario.output,
        prepTokens: 0,
        actionUsage: scenario.actionUsage,
        prepMs: 0,
        actionMs: scenario.actionMs,
        metadata: {
          corpusCommit: corpus.commit,
          corpusRoot: corpus.sourceRoot,
          scenarioName: parsed.scenarioName,
          turns: scenario.turns,
        },
      });
    }

    const start = Date.now();
    const result = await generateText({
      model: actionModel,
      system: MONOLITHIC_SYSTEM,
      messages: [{ role: "user", content: parsed.task }],
      tools,
      stopWhen: stepCountIs(this.config.maxSteps ?? 30),
    });
    const actionMs = Date.now() - start;

    return toPromptfooResponse({
      output: result.text,
      prepTokens: 0,
      actionUsage: normalizeUsage(result.usage),
      prepMs: 0,
      actionMs,
      metadata: {
        corpusCommit: corpus.commit,
        corpusRoot: corpus.sourceRoot,
        steps: result.steps.length,
        toolCalls: countToolCalls(result.steps),
        warnings: summarizeWarnings(result.warnings),
      },
    });
  }
}

const MONOLITHIC_SYSTEM = [
  "You are a code analysis assistant exploring a large codebase (~3000 files).",
  "Use the provided tools to explore the codebase before answering.",
  "",
  "Strategy:",
  "1. Use grep FIRST to find relevant files — do NOT list and read directories exhaustively.",
  "2. Read only the files that grep identifies as relevant.",
  "3. Each file read is capped at 50KB — if truncated, grep for the specific function or symbol you need.",
  "4. Synthesize your answer from the files you've read. Be specific and cite file paths.",
  "",
  "IMPORTANT: This is a large codebase. Reading files blindly will exhaust your context budget.",
  "Be surgical. Grep, then read only what matters.",
].join("\n");

const READ_FILE_MAX_BYTES = 50 * 1024; // 50KB — matches Budge's READ_MAX_BYTES

function buildMonolithicTools(opts: {
  sourceRoot: string;
  include?: string[];
  exclude?: string[];
  access: CorpusAccess;
}) {
  return {
    list_directory: tool({
      description: "List filtered files and directories at a relative path.",
      inputSchema: z.object({ path: z.string().optional() }),
      execute: async ({ path: dirPath }) => {
        const normalized = normalizeRelativePath(dirPath ?? "");
        const entries = opts.access.directories.get(normalized);
        if (!entries) {
          throw new Error(`Unknown directory: ${normalized || "."}`);
        }
        return entries.join("\n");
      },
    }),
    read_file: tool({
      description:
        "Read a file inside the filtered corpus. Output is capped at 50KB — use grep to find specific sections in large files.",
      inputSchema: z.object({ path: z.string() }),
      execute: async ({ path: filePath }) => {
        const normalized = normalizeRelativePath(filePath);
        if (!opts.access.files.has(normalized)) {
          throw new Error(`Unknown or excluded file: ${normalized}`);
        }
        const content = await fs.readFile(path.join(opts.sourceRoot, normalized), "utf8");
        const bytes = Buffer.byteLength(content, "utf8");
        if (bytes <= READ_FILE_MAX_BYTES) {
          return content;
        }
        // Truncate to ~50KB, keeping the head (imports + exports + top-level declarations)
        const truncated = content.slice(0, READ_FILE_MAX_BYTES);
        const removedBytes = bytes - Buffer.byteLength(truncated, "utf8");
        return `${truncated}\n\n[Output truncated. ${removedBytes} bytes omitted. Use grep to find specific symbols in this file.]`;
      },
    }),
    grep: tool({
      description:
        "Search for a pattern across the filtered corpus. Returns file paths and line numbers.",
      inputSchema: z.object({
        pattern: z.string(),
        fileExtensions: z.array(z.string()).optional(),
      }),
      execute: async ({ pattern, fileExtensions }) => {
        return await grepCorpus(opts.sourceRoot, pattern, {
          fileExtensions,
          include: opts.include,
          exclude: opts.exclude,
        });
      },
    }),
  };
}

interface CorpusAccess {
  files: Set<string>;
  directories: Map<string, string[]>;
}

function buildCorpusAccess(
  sourceRoot: string,
  include?: string[],
  exclude?: string[],
): CorpusAccess {
  const files = collectRelativeFiles(sourceRoot, { include, exclude });
  const fileSet = new Set(files);
  const directoryEntries = new Map<string, Set<string>>([["", new Set<string>()]]);

  for (const file of files) {
    const parts = file.split("/");
    let currentDir = "";

    for (const [index, part] of parts.entries()) {
      const isLeaf = index === parts.length - 1;
      const entries = directoryEntries.get(currentDir) ?? new Set<string>();
      const relativeEntry = currentDir ? `${currentDir}/${part}` : part;
      entries.add(isLeaf ? relativeEntry : `${relativeEntry}/`);
      directoryEntries.set(currentDir, entries);

      if (!isLeaf) {
        currentDir = relativeEntry;
        if (!directoryEntries.has(currentDir)) {
          directoryEntries.set(currentDir, new Set<string>());
        }
      }
    }
  }

  return {
    files: fileSet,
    directories: new Map(
      Array.from(directoryEntries.entries(), ([dir, entries]) => [dir, Array.from(entries).sort()]),
    ),
  };
}

function countToolCalls(steps: Array<{ toolCalls?: unknown[] }>): number {
  return steps.reduce((sum, step) => sum + (step.toolCalls?.length ?? 0), 0);
}

function normalizeRelativePath(relPath: string): string {
  return relPath.replace(/\\/g, "/").replace(/^\.\//, "");
}
