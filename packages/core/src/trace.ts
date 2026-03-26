import type { ChunkRecord, PolicyRecord, SourceRecord, SourceRecordType, Trace } from "./types.ts";
import { generateRunId } from "./utils.ts";

export interface SourceTiming {
  key: string;
  type: SourceRecordType;
  sensitivity: import("./types.ts").Sensitivity;
  resolvedAt: Date;
  durationMs: number;
  chunkRecords?: ChunkRecord[];
}

export function buildTrace(options: {
  taskId: string;
  startedAt: Date;
  completedAt: Date;
  sourceTimings: SourceTiming[];
  policyRecords: PolicyRecord[];
  derived: Record<string, unknown>;
  budgetMax: number;
  budgetUsed: number;
}): Trace {
  const {
    taskId,
    startedAt,
    completedAt,
    sourceTimings,
    policyRecords,
    derived,
    budgetMax,
    budgetUsed,
  } = options;

  const sources: SourceRecord[] = sourceTimings.map((t): SourceRecord => {
    const base = {
      key: t.key,
      resolvedAt: t.resolvedAt,
      durationMs: t.durationMs,
      sensitivity: t.sensitivity,
    };
    if (t.type === "chunks") {
      return { ...base, type: "chunks" as const, chunks: t.chunkRecords ?? [] };
    }
    return { ...base, type: t.type };
  });

  return {
    runId: generateRunId(),
    taskId,
    startedAt,
    completedAt,
    sources,
    policies: policyRecords,
    derived,
    budget: { max: budgetMax, used: budgetUsed },
  };
}
