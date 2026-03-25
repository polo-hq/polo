import type { Chunk, Chunks } from "./types.ts";

function isChunk(value: unknown): value is Chunk {
  return (
    typeof value === "object" &&
    value !== null &&
    "content" in value &&
    typeof value.content === "string"
  );
}

function isChunkArray(values: unknown[]): values is Chunk[] {
  return values.every(isChunk);
}

export function isChunks(value: unknown): value is Chunks {
  return (
    typeof value === "object" &&
    value !== null &&
    "_type" in value &&
    value._type === "chunks" &&
    "items" in value &&
    Array.isArray(value.items) &&
    isChunkArray(value.items)
  );
}

export function createChunks(promise: Promise<Chunk[]>): Promise<Chunks>;
export function createChunks<T>(
  promise: Promise<T[]>,
  normalize: (item: T) => Chunk,
): Promise<Chunks>;

export async function createChunks<T>(
  promise: Promise<T[] | Chunk[]>,
  normalize?: (item: T) => Chunk,
): Promise<Chunks> {
  const items = await promise;

  if (normalize) {
    return {
      _type: "chunks",
      items: items.map((item) => normalize(item as T)),
    };
  }

  if (!isChunkArray(items)) {
    throw new TypeError("polo.chunks() requires either Chunk[] input or a normalize function.");
  }

  return { _type: "chunks", items };
}
