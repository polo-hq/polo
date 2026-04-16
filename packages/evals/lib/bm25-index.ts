import type { BMDocument } from "okapibm25";
import type { CorpusChunk } from "./corpus.ts";

interface Bm25Index {
  documents: string[];
  docIndexMap: Map<string, number>;
}

// okapibm25 is CJS. Resolve the callable default lazily so module init stays sync.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let bm25Fn: ((...args: any[]) => number[] | BMDocument[]) | undefined;

async function getBm25(): Promise<(...args: unknown[]) => number[] | BMDocument[]> {
  if (bm25Fn) return bm25Fn;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod = (await import("okapibm25")) as any;
  bm25Fn = mod.default?.default ?? mod.default;
  return bm25Fn!;
}

export interface RankedChunk {
  chunk: CorpusChunk;
  score: number;
}

export class CorpusBm25Index {
  private readonly index: Bm25Index;

  constructor(private readonly chunks: CorpusChunk[]) {
    const documents = chunks.map((chunk) => chunk.content);
    const docIndexMap = new Map<string, number>();
    for (let index = documents.length - 1; index >= 0; index--) {
      docIndexMap.set(documents[index]!, index);
    }
    this.index = { documents, docIndexMap };
  }

  async search(query: string, k: number): Promise<RankedChunk[]> {
    if (this.chunks.length === 0) return [];

    const keywords = tokenizeForBm25(query);
    if (keywords.length === 0) return [];

    const BM25 = await getBm25();
    const results = BM25(
      this.index.documents,
      keywords,
      { b: 0.75, k1: 1.2 },
      (left: BMDocument, right: BMDocument) => right.score - left.score,
    ) as BMDocument[];

    const ranked: RankedChunk[] = [];
    for (const result of results) {
      if (result.score <= 0) break;
      if (ranked.length >= k) break;
      const index = this.index.docIndexMap.get(result.document);
      if (index === undefined) continue;
      ranked.push({ chunk: this.chunks[index]!, score: result.score });
    }

    return ranked;
  }
}

function tokenizeForBm25(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1);
}
