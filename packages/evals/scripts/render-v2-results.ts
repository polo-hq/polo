import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { loadV2TaskSuite } from "../lib/tasks.ts";

interface PromptfooResultFile {
  results?: {
    timestamp?: string;
    results?: PromptfooCaseResult[];
  };
}

interface PromptfooCaseResult {
  provider?: { label?: string };
  response?: { metadata?: Record<string, unknown> };
  metadata?: Record<string, unknown>;
  gradingResult?: { pass?: boolean; score?: number };
  score?: number;
  testCase?: {
    description?: string;
    metadata?: Record<string, unknown>;
    vars?: Record<string, unknown>;
  };
}

interface MetricBundle {
  quality: string;
  passRate: string;
  avgBilledTokens: string;
  avgLatency: string;
  p95Latency: string;
  avgToolCalls: string;
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const evalsDir = path.resolve(repoRoot, "packages/evals");
const resultsPath = path.resolve(evalsDir, "results/v2-latest.json");
const configPath = path.resolve(evalsDir, "promptfooconfig.v2.yaml");
const outputPath = path.resolve(evalsDir, "EVAL-V2-RESULTS.md");
const taskSuite = loadV2TaskSuite(path.resolve(evalsDir, "tasks"));

if (!fs.existsSync(resultsPath)) {
  throw new Error(`Missing results file: ${resultsPath}`);
}

const promptfooResults = JSON.parse(fs.readFileSync(resultsPath, "utf8")) as PromptfooResultFile;
const config = YAML.parse(fs.readFileSync(configPath, "utf8")) as {
  providers?: Array<{ label?: string; config?: Record<string, unknown> }>;
};
const cases = promptfooResults.results?.results ?? [];
const providerDiscounts = new Map<string, number>();

for (const provider of config.providers ?? []) {
  if (!provider.label) continue;
  providerDiscounts.set(provider.label, inferCacheDiscount(provider.config ?? {}));
}

const synthesisResults = byCategory(cases, taskSuite.synthesis.category);
const lookupResults = byCategory(cases, taskSuite.lookup.category);
const chatResults = byCategory(cases, taskSuite.chat.category);

const markdown = [
  "# Budge Benchmark Results",
  "",
  buildHeader(config, promptfooResults),
  "",
  "## Cross-Source Synthesis (5 tasks)",
  "",
  renderCategoryTable(synthesisResults, providerDiscounts),
  "",
  renderTaskDetails("Cross-Source Synthesis", synthesisResults),
  "",
  "## Targeted Lookup (5 tasks)",
  "",
  renderCategoryTable(lookupResults, providerDiscounts),
  "",
  renderTaskDetails("Targeted Lookup", lookupResults),
  "",
  "## Chat Amortization (3 scenarios x 5 turns)",
  "",
  renderChatTable(chatResults),
  "",
  renderChatDetails(chatResults),
  "",
  "## Notes",
  "",
  "- This benchmark is directional. The task count is intentionally small and not designed for statistical significance.",
  "- The action model is held constant across baselines so the comparison isolates retrieval and orchestration strategy.",
  "- Billed-equivalent token estimates discount cached tokens by 0.10 for Anthropic-style caching and 0.25 for OpenAI-style caching.",
].join("\n");

fs.writeFileSync(outputPath, `${markdown}\n`);

function buildHeader(
  promptfooConfig: { providers?: Array<{ config?: Record<string, unknown> }> },
  results: PromptfooResultFile,
): string {
  const firstProvider = promptfooConfig.providers?.[0]?.config ?? {};
  const commit =
    typeof firstProvider.expectedCommit === "string" ? firstProvider.expectedCommit : "unknown";
  const actionModel =
    typeof firstProvider.actionModel === "string" ? firstProvider.actionModel : "unknown";
  const date = results.results?.timestamp
    ? new Date(results.results.timestamp).toISOString().slice(0, 10)
    : "unknown";
  return `Corpus: Next.js (vercel/next.js @ commit ${commit}), filtered to packages/next/src\nModels: ${actionModel} for all baselines (action agent identical across comparisons)\nDate: ${date}`;
}

function byCategory(
  results: PromptfooCaseResult[],
  category: string,
): Map<string, PromptfooCaseResult[]> {
  const grouped = new Map<string, PromptfooCaseResult[]>();
  for (const result of results) {
    if (result.testCase?.metadata?.category !== category) continue;
    const label = result.provider?.label ?? "unknown";
    const existing = grouped.get(label) ?? [];
    existing.push(result);
    grouped.set(label, existing);
  }
  return grouped;
}

function renderCategoryTable(
  grouped: Map<string, PromptfooCaseResult[]>,
  discounts: Map<string, number>,
): string {
  return [
    "| Metric | Budge | RAG (BM25) | Monolithic Agent |",
    "| --- | --- | --- | --- |",
    `| Avg quality score | ${metricFor(grouped, "budge", discounts).quality} | ${metricFor(grouped, "rag (bm25)", discounts).quality} | ${metricFor(grouped, "monolithic agent", discounts).quality} |`,
    `| Pass rate | ${metricFor(grouped, "budge", discounts).passRate} | ${metricFor(grouped, "rag (bm25)", discounts).passRate} | ${metricFor(grouped, "monolithic agent", discounts).passRate} |`,
    `| Avg billed-equiv tokens | ${metricFor(grouped, "budge", discounts).avgBilledTokens} | ${metricFor(grouped, "rag (bm25)", discounts).avgBilledTokens} | ${metricFor(grouped, "monolithic agent", discounts).avgBilledTokens} |`,
    `| Avg latency | ${metricFor(grouped, "budge", discounts).avgLatency} | ${metricFor(grouped, "rag (bm25)", discounts).avgLatency} | ${metricFor(grouped, "monolithic agent", discounts).avgLatency} |`,
    `| P95 latency | ${metricFor(grouped, "budge", discounts).p95Latency} | ${metricFor(grouped, "rag (bm25)", discounts).p95Latency} | ${metricFor(grouped, "monolithic agent", discounts).p95Latency} |`,
    `| Avg tool calls | ${metricFor(grouped, "budge", discounts).avgToolCalls} | ${metricFor(grouped, "rag (bm25)", discounts).avgToolCalls} | ${metricFor(grouped, "monolithic agent", discounts).avgToolCalls} |`,
  ].join("\n");
}

function renderTaskDetails(title: string, grouped: Map<string, PromptfooCaseResult[]>): string {
  const rows: string[] = [
    `<details>`,
    `<summary>${title} details</summary>`,
    "",
    "| Task | Provider | Score | Pass | Tokens | Latency |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const [provider, results] of grouped) {
    for (const result of results) {
      const tokenUsage = getTokenUsage(result);
      const timing = getTiming(result);
      rows.push(
        `| ${escapeCell(result.testCase?.description ?? "unknown")} | ${escapeCell(provider)} | ${formatNumber(result.gradingResult?.score ?? result.score ?? 0)} | ${result.gradingResult?.pass ? "yes" : "no"} | ${Math.round(tokenUsage.total)} | ${formatSeconds(timing.totalMs)} |`,
      );
    }
  }
  rows.push("", `</details>`);
  return rows.join("\n");
}

function renderChatTable(grouped: Map<string, PromptfooCaseResult[]>): string {
  return [
    "| Metric | Budge | RAG (BM25) | Monolithic Agent |",
    "| --- | --- | --- | --- |",
    `| Avg session cost (tokens) | ${chatMetric(grouped, "budge").sessionCost} | ${chatMetric(grouped, "rag (bm25)").sessionCost} | ${chatMetric(grouped, "monolithic agent").sessionCost} |`,
    `| Turn 1 avg cost | ${chatMetric(grouped, "budge").turn1} | ${chatMetric(grouped, "rag (bm25)").turn1} | ${chatMetric(grouped, "monolithic agent").turn1} |`,
    `| Turn 2-5 avg cost | ${chatMetric(grouped, "budge").turnN} | ${chatMetric(grouped, "rag (bm25)").turnN} | ${chatMetric(grouped, "monolithic agent").turnN} |`,
    `| Amortization ratio | ${chatMetric(grouped, "budge").amortization} | ${chatMetric(grouped, "rag (bm25)").amortization} | ${chatMetric(grouped, "monolithic agent").amortization} |`,
    `| Avg quality (across all turns) | ${chatMetric(grouped, "budge").quality} | ${chatMetric(grouped, "rag (bm25)").quality} | ${chatMetric(grouped, "monolithic agent").quality} |`,
  ].join("\n");
}

function renderChatDetails(grouped: Map<string, PromptfooCaseResult[]>): string {
  const lines = [
    "<details>",
    "<summary>Chat details</summary>",
    "",
    "| Scenario | Provider | Session Tokens | Turn 1 | Turn 2-5 Avg | Context Growth |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const [provider, results] of grouped) {
    for (const result of results) {
      const turns = getTurns(result);
      const scenarioNameValue = result.testCase?.metadata?.scenarioName;
      const scenarioName =
        typeof scenarioNameValue === "string"
          ? scenarioNameValue
          : (result.testCase?.description ?? "unknown");
      const turn1 = turns[0] ? turns[0].prepTokens + turns[0].usage.total : 0;
      const later = turns.slice(1).map((turn) => turn.usage.total);
      const turnN = later.length > 0 ? average(later) : 0;
      const contextGrowth =
        turns.length > 1 ? turns[turns.length - 1]!.usage.input - turns[0]!.usage.input : 0;
      lines.push(
        `| ${escapeCell(scenarioName)} | ${escapeCell(provider)} | ${Math.round(getTokenUsage(result).total)} | ${Math.round(turn1)} | ${Math.round(turnN)} | ${contextGrowth >= 0 ? "+" : ""}${Math.round(contextGrowth)} input tokens |`,
      );

      lines.push(
        "",
        `Per-turn breakdown for ${escapeCell(scenarioName)} / ${escapeCell(provider)}`,
        "",
        "| Turn | Total Tokens | Input | Output | Prep | Latency |",
        "| --- | --- | --- | --- | --- | --- |",
      );
      for (const [index, turn] of turns.entries()) {
        lines.push(
          `| ${index + 1} | ${Math.round(turn.usage.total + turn.prepTokens)} | ${Math.round(turn.usage.input)} | ${Math.round(turn.usage.output)} | ${Math.round(turn.prepTokens)} | ${formatSeconds(turn.latencyMs)} |`,
        );
      }
      lines.push("");
    }
  }
  lines.push("", "</details>");
  return lines.join("\n");
}

function metricFor(
  grouped: Map<string, PromptfooCaseResult[]>,
  provider: string,
  discounts: Map<string, number>,
): MetricBundle {
  const results = grouped.get(provider) ?? [];
  if (results.length === 0) {
    return {
      quality: "n/a",
      passRate: "n/a",
      avgBilledTokens: "n/a",
      avgLatency: "n/a",
      p95Latency: "n/a",
      avgToolCalls: "n/a",
    };
  }

  const discount = discounts.get(provider) ?? 0.25;
  const quality = average(
    results.map((result) => result.gradingResult?.score ?? result.score ?? 0),
  );
  const passCount = results.filter((result) => result.gradingResult?.pass).length;
  const billed = average(results.map((result) => billedTokens(getTokenUsage(result), discount)));
  const latency = average(results.map((result) => getTiming(result).totalMs));
  const p95 = percentile(
    results.map((result) => getTiming(result).totalMs),
    95,
  );
  const toolCalls = average(
    results.map(getToolCallCount).filter((value) => value !== undefined) as number[],
  );

  return {
    quality: formatNumber(quality),
    passRate: `${passCount}/${results.length}`,
    avgBilledTokens: Math.round(billed).toString(),
    avgLatency: formatSeconds(latency),
    p95Latency: formatSeconds(p95),
    avgToolCalls: Number.isFinite(toolCalls) ? formatNumber(toolCalls) : "n/a",
  };
}

function chatMetric(grouped: Map<string, PromptfooCaseResult[]>, provider: string) {
  const results = grouped.get(provider) ?? [];
  if (results.length === 0) {
    return { sessionCost: "n/a", turn1: "n/a", turnN: "n/a", amortization: "n/a", quality: "n/a" };
  }

  const sessionCosts = results.map((result) => getTokenUsage(result).total);
  const turn1Costs = results.map((result) => {
    const turns = getTurns(result);
    return turns[0] ? turns[0].prepTokens + turns[0].usage.total : 0;
  });
  const turnNCosts = results.flatMap((result) =>
    getTurns(result)
      .slice(1)
      .map((turn) => turn.usage.total),
  );
  const quality = average(
    results.map((result) => result.gradingResult?.score ?? result.score ?? 0),
  );
  const avgTurn1 = average(turn1Costs);
  const avgTurnN = average(turnNCosts);

  return {
    sessionCost: Math.round(average(sessionCosts)).toString(),
    turn1: Math.round(avgTurn1).toString(),
    turnN: Math.round(avgTurnN).toString(),
    amortization: avgTurnN > 0 ? `${formatNumber(avgTurn1 / avgTurnN)}x` : "n/a",
    quality: formatNumber(quality),
  };
}

function getTokenUsage(result: PromptfooCaseResult): {
  prep: number;
  action: number;
  total: number;
  cached: number;
} {
  const metadata = (result.metadata ?? result.response?.metadata ?? {}) as Record<string, unknown>;
  const usage = metadata.tokenUsage as Record<string, unknown> | undefined;
  return {
    prep: numberValue(usage?.prep),
    action: numberValue(usage?.action),
    total: numberValue(usage?.total),
    cached: numberValue(usage?.cached),
  };
}

function getTiming(result: PromptfooCaseResult): {
  prepMs: number;
  actionMs: number;
  totalMs: number;
} {
  const metadata = (result.metadata ?? result.response?.metadata ?? {}) as Record<string, unknown>;
  const timing = metadata.timing as Record<string, unknown> | undefined;
  return {
    prepMs: numberValue(timing?.prepMs),
    actionMs: numberValue(timing?.actionMs),
    totalMs: numberValue(timing?.totalMs),
  };
}

function getTurns(result: PromptfooCaseResult): Array<{
  prepTokens: number;
  usage: { input: number; output: number; total: number; cached: number };
  latencyMs: number;
}> {
  const metadata = (result.metadata ?? result.response?.metadata ?? {}) as Record<string, unknown>;
  return Array.isArray(metadata.turns)
    ? (metadata.turns as Array<{
        prepTokens: number;
        usage: { input: number; output: number; total: number; cached: number };
        latencyMs: number;
      }>)
    : [];
}

function getToolCallCount(result: PromptfooCaseResult): number | undefined {
  const metadata = (result.metadata ?? result.response?.metadata ?? {}) as Record<string, unknown>;
  if (typeof metadata.toolCallCount === "number") return metadata.toolCallCount;
  if (typeof metadata.toolCalls === "number") return metadata.toolCalls;
  return undefined;
}

function billedTokens(usage: { total: number; cached: number }, discount: number): number {
  return usage.total - usage.cached + usage.cached * discount;
}

function inferCacheDiscount(config: Record<string, unknown>): number {
  const models = [config.actionModel, config.orchestratorModel, config.workerModel].filter(
    (value): value is string => typeof value === "string",
  );
  if (models.some((model) => model.startsWith("anthropic/"))) return 0.1;
  if (models.some((model) => model.startsWith("openai/"))) return 0.25;
  return 0.25;
}

function numberValue(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function average(values: number[]): number {
  if (values.length === 0) return Number.NaN;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))] ?? Number.NaN;
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "n/a";
}

function formatSeconds(milliseconds: number): string {
  return Number.isFinite(milliseconds) ? `${(milliseconds / 1000).toFixed(1)}s` : "n/a";
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}
