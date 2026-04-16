import { generateText } from "ai";
import type { CallApiContextParams, ProviderOptions, ProviderResponse } from "promptfoo";
import { CorpusBm25Index } from "../lib/bm25-index.ts";
import {
  buildDocumentChunks,
  DEFAULT_RAG_CHUNK_OVERLAP,
  DEFAULT_RAG_CHUNK_SIZE,
  DEFAULT_RAG_TOP_K,
  getLongBenchTaskType,
  normalizeProviderOutput,
  parseLongBenchPayload,
  renderQuestionWithChoices,
  renderRetrievedContext,
  type LongBenchPayload,
} from "../lib/longbench.ts";
import type { CorpusChunk } from "../lib/corpus.ts";
import {
  getLanguageModel,
  normalizeUsage,
  summarizeWarnings,
  toPromptfooResponse,
} from "./shared.ts";

interface LongBenchRagProviderConfig {
  actionModel?: string;
  provider?: string;
  topK?: number;
  chunkSize?: number;
  overlap?: number;
}

const indexCache = new Map<string, Promise<{ chunks: CorpusChunk[]; index: CorpusBm25Index }>>();

export default class LongBenchRagProvider {
  private readonly config: LongBenchRagProviderConfig;
  private readonly providerId: string;

  constructor(options: ProviderOptions) {
    this.config = (options.config ?? {}) as LongBenchRagProviderConfig;
    this.providerId = options.id ?? "longbench-rag-bm25";
  }

  id(): string {
    return this.providerId;
  }

  async callApi(prompt: string, _context?: CallApiContextParams): Promise<ProviderResponse> {
    const payload = parseLongBenchPayload(prompt);
    const taskType = getLongBenchTaskType(payload);
    const topK = this.config.topK ?? DEFAULT_RAG_TOP_K;
    const providerName = this.config.provider ?? process.env.BUDGE_PROVIDER ?? "openai";
    const actionModelName =
      this.config.actionModel ?? process.env.BUDGE_ACTION ?? "openai/gpt-5.4-mini";
    const actionModel = await getLanguageModel(providerName, actionModelName);
    const indexed = await getIndexedDocument(payload, this.config.chunkSize, this.config.overlap);
    const ranked = await indexed.index.search(payload.question, topK);
    const retrievedChunks = ranked.map((item) => item.chunk);
    const retrievedChunkPositions = retrievedChunks.map((chunk) => {
      const chunkIndex = Number.parseInt(chunk.id.split("chunk:")[1] ?? "", 10);
      return Number.isFinite(chunkIndex) && indexed.chunks.length > 0
        ? chunkIndex / indexed.chunks.length
        : null;
    });
    const ragContext = renderRetrievedContext(retrievedChunks);

    const actionStart = Date.now();
    const result = await generateText({
      model: actionModel,
      system: [
        "Answer the multiple choice question using only the retrieved context.",
        "Reply with just the letter (A, B, C, or D).",
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: ["Context:", ragContext, "", renderQuestionWithChoices(payload)].join("\n"),
        },
      ],
    });
    const actionMs = Date.now() - actionStart;
    const predicted = normalizeProviderOutput(result.text);

    return toPromptfooResponse({
      output: predicted,
      prepTokens: 0,
      actionUsage: normalizeUsage(result.usage),
      prepMs: 0,
      actionMs,
      metadata: {
        providerKind: "rag-bm25",
        itemId: payload._id,
        predicted,
        correctAnswer: payload.answer,
        domain: payload.domain,
        subDomain: payload.sub_domain,
        taskType,
        difficulty: payload.difficulty,
        length: payload.length,
        topK,
        chunkSize: this.config.chunkSize ?? DEFAULT_RAG_CHUNK_SIZE,
        overlap: this.config.overlap ?? DEFAULT_RAG_CHUNK_OVERLAP,
        totalChunks: indexed.chunks.length,
        retrievedChunkIds: retrievedChunks.map((chunk) => chunk.id),
        retrievedChunkPositions,
        rawOutput: result.text,
        warnings: summarizeWarnings(result.warnings),
      },
    });
  }
}

async function getIndexedDocument(
  payload: LongBenchPayload,
  chunkSize?: number,
  overlap?: number,
): Promise<{ chunks: CorpusChunk[]; index: CorpusBm25Index }> {
  const key = JSON.stringify({
    id: payload._id,
    chunkSize: chunkSize ?? DEFAULT_RAG_CHUNK_SIZE,
    overlap: overlap ?? DEFAULT_RAG_CHUNK_OVERLAP,
  });

  let promise = indexCache.get(key);
  if (!promise) {
    promise = Promise.resolve().then(() => {
      const chunks = buildDocumentChunks(payload, { chunkSize, overlap });
      return { chunks, index: new CorpusBm25Index(chunks) };
    });
    indexCache.set(key, promise);
  }

  return await promise;
}
