import path from "node:path";
import { pathToFileURL } from "node:url";
import { generateText } from "ai";
import type { CallApiContextParams, ProviderOptions, ProviderResponse } from "promptfoo";
import type { createBudge as CreateBudge, source as Source, ToolCallEvent } from "@budge/core";
import { runChatScenario } from "../lib/chat-runner.ts";
import { verifyCorpus } from "../lib/corpus.ts";
import {
  getLanguageModel,
  normalizeUsage,
  parsePromptPayload,
  repoRootFromImport,
  resolveFromProvider,
  summarizeWarnings,
  toPromptfooResponse,
} from "./shared.ts";
import { homedir } from "node:os";
import { mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";

interface BudgeV2ProviderConfig {
  corpusRoot?: string;
  expectedCommit?: string;
  include?: string[];
  exclude?: string[];
  orchestratorModel?: string;
  workerModel?: string;
  actionModel?: string;
  provider?: string;
  maxSteps?: number;
}

const traceDir = path.join(homedir(), ".budge", "traces", "nextjs");
mkdirSync(traceDir, { recursive: true });

function sanitizeForFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 60);
}

async function writeTrace(opts: {
  subdir: string;
  scenarioName: string | undefined;
  task: string;
  payload: Record<string, unknown>;
}): Promise<void> {
  try {
    const label = opts.scenarioName ?? opts.task;
    const file = path.join(traceDir, `${sanitizeForFilename(label)}-${Date.now()}.json`);
    await writeFile(file, JSON.stringify(opts.payload, null, 2));
  } catch {
    // best-effort; don't fail the eval on trace-write errors
  }
}

export default class BudgeV2Provider {
  private readonly config: BudgeV2ProviderConfig;
  private readonly providerId: string;

  constructor(options: ProviderOptions) {
    this.config = (options.config ?? {}) as BudgeV2ProviderConfig;
    this.providerId = options.id ?? "budge-v2";
  }

  id(): string {
    return this.providerId;
  }

  async callApi(prompt: string, _context?: CallApiContextParams): Promise<ProviderResponse> {
    const { config } = this;
    if (!config.expectedCommit || config.expectedCommit.startsWith("__")) {
      throw new Error(
        "promptfooconfig.v2.yaml is not pinned. Run packages/evals/scripts/setup-corpus.sh first.",
      );
    }
    const parsed = parsePromptPayload(prompt);
    const repoRoot = repoRootFromImport(import.meta.url);
    const sourceRoot = resolveFromProvider(import.meta.url, config.corpusRoot);
    const corpus = verifyCorpus(sourceRoot, config.expectedCommit);
    const mod = await import(
      pathToFileURL(path.resolve(repoRoot, "packages/core/src/index.ts")).href
    );
    const createBudge = mod.createBudge as typeof CreateBudge;
    const source = mod.source as typeof Source;

    const providerName = config.provider ?? process.env.BUDGE_PROVIDER ?? "openai";
    const orchestratorModel =
      config.orchestratorModel ?? process.env.BUDGE_ORCHESTRATOR ?? "openai/gpt-5.4-mini";
    const workerModel = config.workerModel ?? process.env.BUDGE_WORKER ?? "openai/gpt-5.4-mini";
    const actionModelName = config.actionModel ?? process.env.BUDGE_ACTION ?? "openai/gpt-5.4-mini";

    const orchestrator = await getLanguageModel(providerName, orchestratorModel);
    const worker = await getLanguageModel(providerName, workerModel);
    const actionModel = await getLanguageModel(providerName, actionModelName);
    const budge = createBudge({ orchestrator, worker });
    const fsOptions: Parameters<typeof Source.fs>[1] = {};
    if (config.include) fsOptions.include = config.include;
    if (config.exclude) fsOptions.exclude = config.exclude;

    let toolCallCount = 0;
    const toolCallLog: string[] = [];
    const onToolCall = (event: ToolCallEvent) => {
      const label =
        event.tool === "read_source" || event.tool === "run_subcall"
          ? `${event.tool} -> ${event.args.source}/${event.args.path}`
          : event.tool === "run_subcalls"
            ? `run_subcalls -> ${event.args.calls.length} calls`
            : event.tool;
      toolCallLog.push(`[${toolCallCount++}] ${label}`);
    };

    if (parsed.chatTurns) {
      let prepMetadata: Record<string, unknown> = {};
      const scenario = await runChatScenario({
        name: parsed.scenarioName,
        turns: parsed.chatTurns,
        prepare: async (firstTurn) => {
          const start = Date.now();
          const context = await budge.prepare({
            task: firstTurn,
            sources: { nextjs: source.fs(sourceRoot, fsOptions) },
            maxSteps: config.maxSteps ?? 40,
            onToolCall,
          });
          prepMetadata = {
            finishReason: context.finishReason,
            handoff: context.handoff,
            handoffStructured: context.handoffStructured,
            totalSubcalls: context.trace.totalSubcalls,
            handoffFailed: context.handoffFailed,
          };

          return {
            system: context.handoff,
            prepTokens: context.trace.totalTokens,
            prepMs: Date.now() - start,
          };
        },
        act: async ({ history, question, system }) => {
          const start = Date.now();
          const result = await generateText({
            model: actionModel,
            system,
            messages: [...history, { role: "user", content: question }],
          });
          return {
            text: result.text,
            usage: normalizeUsage(result.usage),
            latencyMs: Date.now() - start,
            metadata: {
              warnings: summarizeWarnings(result.warnings),
            },
          };
        },
      });

      await writeTrace({
        subdir: "nextjs",
        scenarioName: parsed.scenarioName,
        task: parsed.task,
        payload: {
          task: parsed.task,
          scenarioName: parsed.scenarioName,
          output: scenario.output,
          turns: scenario.turns,
          finishReason: (prepMetadata as { finishReason?: string }).finishReason,
          handoff: (prepMetadata as { handoff?: string }).handoff,
          handoffStructured: (prepMetadata as { handoffStructured?: unknown }).handoffStructured,
          handoffFailed: (prepMetadata as { handoffFailed?: boolean }).handoffFailed,
          toolCallLog,
        },
      });

      return toPromptfooResponse({
        output: scenario.output,
        prepTokens: scenario.prepTokens,
        actionUsage: scenario.actionUsage,
        prepMs: scenario.prepMs,
        actionMs: scenario.actionMs,
        metadata: {
          corpusCommit: corpus.commit,
          corpusRoot: corpus.sourceRoot,
          toolCallCount,
          toolCallLog,
          scenarioName: parsed.scenarioName,
          turnCount: scenario.turns.length,
          turns: scenario.turns,
          ...prepMetadata,
        },
      });
    }

    const prepStart = Date.now();
    const context = await budge.prepare({
      task: parsed.task,
      sources: { nextjs: source.fs(sourceRoot, fsOptions) },
      maxSteps: config.maxSteps ?? 40,
      onToolCall,
    });
    const prepMs = Date.now() - prepStart;

    const actionStart = Date.now();
    const result = await generateText({
      model: actionModel,
      system: context.handoff,
      messages: [{ role: "user", content: parsed.task }],
    });
    const actionMs = Date.now() - actionStart;

    await writeTrace({
      subdir: "nextjs",
      scenarioName: undefined,
      task: parsed.task,
      payload: {
        task: parsed.task,
        answer: result.text,
        trace: context.trace,
        finishReason: context.finishReason,
        handoff: context.handoff,
        handoffStructured: context.handoffStructured,
        handoffFailed: context.handoffFailed,
        toolCallLog,
      },
    });

    return toPromptfooResponse({
      output: result.text,
      prepTokens: context.trace.totalTokens,
      actionUsage: normalizeUsage(result.usage),
      prepMs,
      actionMs,
      metadata: {
        corpusCommit: corpus.commit,
        corpusRoot: corpus.sourceRoot,
        finishReason: context.finishReason,
        totalSubcalls: context.trace.totalSubcalls,
        handoffFailed: context.handoffFailed,
        handoff: context.handoff,
        handoffStructured: context.handoffStructured,
        toolCallCount,
        toolCallLog,
        warnings: summarizeWarnings(result.warnings),
      },
    });
  }
}
