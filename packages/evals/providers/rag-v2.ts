import { generateText } from "ai";
import type { CallApiContextParams, ProviderOptions, ProviderResponse } from "promptfoo";
import { CorpusBm25Index } from "../lib/bm25-index.ts";
import { runChatScenario } from "../lib/chat-runner.ts";
import { chunkCorpus, verifyCorpus, type CorpusChunk } from "../lib/corpus.ts";
import {
  getLanguageModel,
  normalizeUsage,
  parsePromptPayload,
  repoRootFromImport,
  resolveFromProvider,
  summarizeWarnings,
  toPromptfooResponse,
} from "./shared.ts";

interface RagV2ProviderConfig {
  corpusRoot?: string;
  expectedCommit?: string;
  include?: string[];
  exclude?: string[];
  actionModel?: string;
  provider?: string;
  topK?: number;
  chunkSize?: number;
  overlap?: number;
}

const indexCache = new Map<string, Promise<{ chunks: CorpusChunk[]; index: CorpusBm25Index }>>();

export default class RagV2Provider {
  private readonly config: RagV2ProviderConfig;
  private readonly providerId: string;

  constructor(options: ProviderOptions) {
    this.config = (options.config ?? {}) as RagV2ProviderConfig;
    this.providerId = options.id ?? "rag-v2";
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
    const repoRoot = repoRootFromImport(import.meta.url);
    const sourceRoot = resolveFromProvider(import.meta.url, this.config.corpusRoot);
    const corpus = verifyCorpus(sourceRoot, this.config.expectedCommit);
    const topK = this.config.topK ?? 20;
    const providerName = this.config.provider ?? process.env.BUDGE_PROVIDER ?? "openai";
    const actionModelName =
      this.config.actionModel ?? process.env.BUDGE_ACTION ?? "openai/gpt-5.4-mini";
    const actionModel = await getLanguageModel(providerName, actionModelName);
    const indexedCorpus = await getIndexedCorpus({
      repoRoot,
      sourceRoot,
      commit: corpus.commit,
      include: this.config.include,
      exclude: this.config.exclude,
      chunkSize: this.config.chunkSize,
      overlap: this.config.overlap,
    });

    if (parsed.chatTurns) {
      const scenario = await runChatScenario({
        name: parsed.scenarioName,
        turns: parsed.chatTurns,
        act: async ({ history, question }) => {
          const ranked = await indexedCorpus.index.search(question, topK);
          const ragContext = renderContext(ranked.map((item) => item.chunk));
          const start = Date.now();
          const result = await generateText({
            model: actionModel,
            system: buildRagSystem(ragContext),
            messages: [...history, { role: "user", content: question }],
          });
          return {
            text: result.text,
            usage: normalizeUsage(result.usage),
            latencyMs: Date.now() - start,
            metadata: {
              retrievedChunkIds: ranked.map((item) => item.chunk.id),
              retrievedFiles: Array.from(new Set(ranked.map((item) => item.chunk.filePath))),
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
          topK,
          totalChunks: indexedCorpus.chunks.length,
          turns: scenario.turns,
        },
      });
    }

    const ranked = await indexedCorpus.index.search(parsed.task, topK);
    const ragContext = renderContext(ranked.map((item) => item.chunk));
    const actionStart = Date.now();
    const result = await generateText({
      model: actionModel,
      system: buildRagSystem(ragContext),
      messages: [{ role: "user", content: parsed.task }],
    });
    const actionMs = Date.now() - actionStart;

    return toPromptfooResponse({
      output: result.text,
      prepTokens: 0,
      actionUsage: normalizeUsage(result.usage),
      prepMs: 0,
      actionMs,
      metadata: {
        corpusCommit: corpus.commit,
        corpusRoot: corpus.sourceRoot,
        topK,
        totalChunks: indexedCorpus.chunks.length,
        chunksRetrieved: ranked.length,
        retrievedChunkIds: ranked.map((item) => item.chunk.id),
        retrievedFiles: Array.from(new Set(ranked.map((item) => item.chunk.filePath))),
        warnings: summarizeWarnings(result.warnings),
      },
    });
  }
}

async function getIndexedCorpus(opts: {
  repoRoot: string;
  sourceRoot: string;
  commit: string;
  include?: string[];
  exclude?: string[];
  chunkSize?: number;
  overlap?: number;
}): Promise<{ chunks: CorpusChunk[]; index: CorpusBm25Index }> {
  void opts.repoRoot;
  const key = JSON.stringify({
    sourceRoot: opts.sourceRoot,
    commit: opts.commit,
    include: opts.include ?? [],
    exclude: opts.exclude ?? [],
    chunkSize: opts.chunkSize ?? 500,
    overlap: opts.overlap ?? 50,
  });

  let promise = indexCache.get(key);
  if (!promise) {
    promise = Promise.resolve().then(() => {
      const chunks = chunkCorpus(opts.sourceRoot, {
        include: opts.include,
        exclude: opts.exclude,
        chunkSize: opts.chunkSize,
        overlap: opts.overlap,
      });
      return {
        chunks,
        index: new CorpusBm25Index(chunks),
      };
    });
    indexCache.set(key, promise);
  }

  return await promise;
}

function buildRagSystem(context: string): string {
  return [
    "You are a code analysis assistant.",
    "Answer the question using only the provided context. If the context is insufficient, say so.",
    "",
    "Context:",
    context,
  ].join("\n");
}

function renderContext(chunks: CorpusChunk[]): string {
  if (chunks.length === 0) return "No retrieved context.";
  return chunks
    .map((chunk) => `--- ${chunk.filePath} (${chunk.id}) ---\n${chunk.content}`)
    .join("\n\n");
}
