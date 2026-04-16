import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

type SliceField = "domain" | "difficulty" | "task_type";

interface PromptfooResultFile {
  results?: {
    timestamp?: string;
    results?: PromptfooCaseResult[];
    prompts?: PromptfooPromptSummary[];
    stats?: {
      successes?: number;
      failures?: number;
      errors?: number;
      durationMs?: number;
    };
  };
}

interface PromptfooPromptSummary {
  provider?: string;
  label?: string;
  metrics?: {
    testPassCount?: number;
    testFailCount?: number;
    testErrorCount?: number;
    totalLatencyMs?: number;
    tokenUsage?: {
      total?: number;
      cached?: number;
    };
  };
}

interface PromptfooCaseResult {
  provider?: { label?: string; id?: string };
  metadata?: Record<string, unknown>;
  response?: {
    metadata?: Record<string, unknown>;
    tokenUsage?: Record<string, unknown>;
    latencyMs?: number;
    output?: string;
  };
  gradingResult?: { pass?: boolean } | null;
  latencyMs?: number;
  success?: boolean;
  error?: string;
  testCase?: {
    description?: string;
    metadata?: Record<string, unknown>;
  };
}

interface TokenUsageSummary {
  prep: number;
  action: number;
  total: number;
  cached: number;
}

interface TimingSummary {
  prepMs: number;
  actionMs: number;
  totalMs: number;
}

interface ProviderMetricSummary {
  rows: number;
  passCount: number;
  failCount: number;
  errorCount: number;
  avgTokens: string;
  avgLatency: string;
}

interface BudgeAnswerRow {
  questionId: string;
  domain: string;
  taskType: string;
  finishReason: string;
  direct: string;
  handoff: string;
  correct: string;
}

interface BudgeAnswerStats {
  total: number;
  directCorrect: number;
  handoffCorrect: number;
  agreement: number;
  directInvalid: number;
  handoffInvalid: number;
  bothCorrect: number;
  directOnlyWins: number;
  handoffOnlyWins: number;
  bothWrongSame: number;
  bothWrongDifferent: number;
  missingEither: number;
}

const PROVIDERS = ["budge", "rag (bm25)", "full-dump"] as const;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const evalsDir = path.resolve(repoRoot, "packages/evals");
const resultsPath = path.resolve(evalsDir, "results/longbench-latest.json");
const configPath = path.resolve(evalsDir, "promptfooconfig.longbench.yaml");
const outputPath = path.resolve(evalsDir, "EVAL-LONGBENCH-RESULTS.md");

if (!fs.existsSync(resultsPath)) {
  throw new Error(`Missing results file: ${resultsPath}`);
}

const promptfooResults = JSON.parse(fs.readFileSync(resultsPath, "utf8")) as PromptfooResultFile;
const config = YAML.parse(fs.readFileSync(configPath, "utf8")) as {
  description?: string;
  providers?: Array<{ label?: string; config?: Record<string, unknown> }>;
  tests?: Array<{ metadata?: Record<string, unknown> }>;
};
const cases = promptfooResults.results?.results ?? [];
const promptSummaries = promptfooResults.results?.prompts ?? [];
const configuredQuestions = config.tests?.length ?? 0;
const observedQuestions = getObservedQuestionCount(cases);
const totalQuestions = observedQuestions || configuredQuestions;
const budgeRows = getBudgeAnswerRows(cases);

const markdown = [
  "# LongBench v2 Results",
  "",
  buildHeader(config, promptfooResults, configuredQuestions, observedQuestions),
  "",
  "## Run Health",
  "",
  renderRunHealthSummary(configuredQuestions, observedQuestions, cases.length, promptfooResults),
  "",
  renderRunHealthTable(cases, promptSummaries),
  "",
  "## Overall",
  "",
  renderOverallTable(cases, promptSummaries),
  "",
  "## Accuracy By Domain",
  "",
  renderSliceTable(cases, promptSummaries, "domain"),
  "",
  "## Accuracy By Difficulty",
  "",
  renderSliceTable(cases, promptSummaries, "difficulty"),
  "",
  "## Accuracy By Task Type",
  "",
  renderSliceTable(cases, promptSummaries, "task_type"),
  "",
  "## Budge: Orchestrator vs Action Agent",
  "",
  renderBudgeAnswerComparisonTable(budgeRows, totalQuestions),
  "",
  renderBudgeAnswerDiagnosticsTable(budgeRows, totalQuestions),
  "",
  "## Budge: Orchestrator vs Action Agent By Task Type",
  "",
  renderBudgeAnswerSliceTable(budgeRows, (row) => row.taskType, "Task Type"),
  "",
  "## Budge: Orchestrator vs Action Agent By Finish Reason",
  "",
  renderBudgeAnswerSliceTable(budgeRows, (row) => row.finishReason, "Finish Reason"),
  "",
  "## Budge: Disagreement Examples",
  "",
  renderBudgeAnswerExamples(budgeRows),
  "",
  "## Budge Finish Reasons By Task Type",
  "",
  renderBudgeFinishReasonTable(cases),
  "",
  "## Per-Question Details",
  "",
  renderQuestionDetails(cases),
  "",
  "## Notes",
  "",
  "- Accuracy is exact-match on the predicted answer letter.",
  "- Budge comparison uses `directAnswer` from the orchestrator and `handoffAnswer` from the action agent output.",
  "- If direct accuracy materially exceeds handoff accuracy, the library handoff is likely dropping signal; if both are similarly low, exploration or model choice is the more likely bottleneck.",
  "- Run Health falls back to provider aggregates when a promptfoo export omits per-question rows.",
].join("\n");

fs.writeFileSync(outputPath, `${markdown}\n`);

function buildHeader(
  promptfooConfig: {
    description?: string;
    providers?: Array<{ config?: Record<string, unknown> }>;
  },
  results: PromptfooResultFile,
  configuredQuestionCount: number,
  observedQuestionCount: number,
): string {
  const firstProvider = promptfooConfig.providers?.[0]?.config ?? {};
  const actionModel =
    typeof firstProvider.actionModel === "string" ? firstProvider.actionModel : "unknown";
  const date = results.results?.timestamp
    ? new Date(results.results.timestamp).toISOString().slice(0, 10)
    : "unknown";
  return [
    `Subset: ${promptfooConfig.description ?? "LongBench v2"}`,
    `Configured questions: ${configuredQuestionCount}`,
    `Observed questions: ${observedQuestionCount}`,
    `Action model: ${actionModel}`,
    `Date: ${date}`,
  ].join("\n");
}

function renderRunHealthSummary(
  configuredQuestionCount: number,
  observedQuestionCount: number,
  caseRowCount: number,
  results: PromptfooResultFile,
): string {
  const durationMs = numberValue(results.results?.stats?.durationMs);
  return [
    "| Metric | Value |",
    "| --- | --- |",
    `| Configured questions | ${configuredQuestionCount} |`,
    `| Observed unique questions | ${observedQuestionCount} |`,
    `| Per-question rows | ${caseRowCount} |`,
    `| Reportable duration | ${formatSeconds(durationMs)} |`,
    `| Export contains per-question rows | ${caseRowCount > 0 ? "yes" : "no"} |`,
  ].join("\n");
}

function renderRunHealthTable(
  results: PromptfooCaseResult[],
  promptSummaryRows: PromptfooPromptSummary[],
): string {
  const lines = [
    "| Provider | Rows | Pass | Fail | Error | Avg tokens | Avg latency |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const provider of PROVIDERS) {
    const summary = summarizeProvider(results, promptSummaryRows, provider);
    lines.push(
      `| ${escapeCell(provider)} | ${summary.rows} | ${summary.passCount} | ${summary.failCount} | ${summary.errorCount} | ${summary.avgTokens} | ${summary.avgLatency} |`,
    );
  }

  return lines.join("\n");
}

function renderOverallTable(
  results: PromptfooCaseResult[],
  promptSummaryRows: PromptfooPromptSummary[],
): string {
  const budge = overallMetric(results, promptSummaryRows, "budge");
  const rag = overallMetric(results, promptSummaryRows, "rag (bm25)");
  const fullDump = overallMetric(results, promptSummaryRows, "full-dump");

  return [
    "| Metric | Budge | RAG (BM25) | Full-Dump |",
    "| --- | --- | --- | --- |",
    `| Accuracy | ${budge.accuracy} | ${rag.accuracy} | ${fullDump.accuracy} |`,
    `| Errors | ${budge.errors} | ${rag.errors} | ${fullDump.errors} |`,
    `| Avg tokens | ${budge.avgTokens} | ${rag.avgTokens} | ${fullDump.avgTokens} |`,
    `| Avg latency | ${budge.avgLatency} | ${rag.avgLatency} | ${fullDump.avgLatency} |`,
    `| Avg prep | ${budge.avgPrep} | ${rag.avgPrep} | ${fullDump.avgPrep} |`,
    `| Avg action | ${budge.avgAction} | ${rag.avgAction} | ${fullDump.avgAction} |`,
  ].join("\n");
}

function renderSliceTable(
  results: PromptfooCaseResult[],
  promptSummaryRows: PromptfooPromptSummary[],
  field: SliceField,
): string {
  if (results.length === 0) {
    return "No per-question rows available in this promptfoo export.";
  }

  const values = Array.from(
    new Set(results.map((result) => sliceFieldValue(result, field)).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));

  const lines = ["| Slice | Budge | RAG (BM25) | Full-Dump |", "| --- | --- | --- | --- |"];

  for (const value of values) {
    lines.push(
      `| ${escapeCell(value)} | ${sliceAccuracy(results, promptSummaryRows, "budge", field, value)} | ${sliceAccuracy(results, promptSummaryRows, "rag (bm25)", field, value)} | ${sliceAccuracy(results, promptSummaryRows, "full-dump", field, value)} |`,
    );
  }

  return lines.join("\n");
}

function renderBudgeAnswerComparisonTable(rows: BudgeAnswerRow[], totalQuestions: number): string {
  if (rows.length === 0) {
    return "No per-question Budge rows available in this promptfoo export.";
  }

  const stats = summarizeBudgeRows(rows);
  const denominator = totalQuestions > 0 ? totalQuestions : rows.length;
  const netDelta = stats.handoffCorrect - stats.directCorrect;
  const netDeltaPp = ((stats.handoffCorrect - stats.directCorrect) / denominator) * 100;

  return [
    "| Metric | Orchestrator (direct) | Action Agent (handoff) |",
    "| --- | --- | --- |",
    `| Measured rows | ${rows.length}/${denominator} | ${rows.length}/${denominator} |`,
    `| Accuracy | ${stats.directCorrect}/${denominator} (${formatPercent(stats.directCorrect, denominator)}) | ${stats.handoffCorrect}/${denominator} (${formatPercent(stats.handoffCorrect, denominator)}) |`,
    `| Invalid / missing | ${stats.directInvalid}/${denominator} (${formatPercent(stats.directInvalid, denominator)}) | ${stats.handoffInvalid}/${denominator} (${formatPercent(stats.handoffInvalid, denominator)}) |`,
    `| Agreement | ${stats.agreement}/${denominator} (${formatPercent(stats.agreement, denominator)}) | ${stats.agreement}/${denominator} (${formatPercent(stats.agreement, denominator)}) |`,
    `| Net vs direct | - | ${formatSignedInt(netDelta)} (${formatSignedPercent(netDeltaPp)}) |`,
  ].join("\n");
}

function renderBudgeAnswerDiagnosticsTable(rows: BudgeAnswerRow[], totalQuestions: number): string {
  if (rows.length === 0) {
    return "No Budge diagnostics available.";
  }

  const stats = summarizeBudgeRows(rows);
  const denominator = totalQuestions > 0 ? totalQuestions : rows.length;

  return [
    "| Diagnostic | Value |",
    "| --- | --- |",
    `| Rows | ${rows.length}/${denominator} |`,
    `| Both correct | ${stats.bothCorrect}/${denominator} (${formatPercent(stats.bothCorrect, denominator)}) |`,
    `| Direct-only wins | ${stats.directOnlyWins}/${denominator} (${formatPercent(stats.directOnlyWins, denominator)}) |`,
    `| Handoff-only wins | ${stats.handoffOnlyWins}/${denominator} (${formatPercent(stats.handoffOnlyWins, denominator)}) |`,
    `| Both wrong, same answer | ${stats.bothWrongSame}/${denominator} (${formatPercent(stats.bothWrongSame, denominator)}) |`,
    `| Both wrong, different answers | ${stats.bothWrongDifferent}/${denominator} (${formatPercent(stats.bothWrongDifferent, denominator)}) |`,
    `| Missing direct or handoff | ${stats.missingEither}/${denominator} (${formatPercent(stats.missingEither, denominator)}) |`,
    `| Library-risk signal | ${formatSignedInt(stats.handoffOnlyWins - stats.directOnlyWins)} |`,
  ].join("\n");
}

function renderBudgeAnswerSliceTable(
  rows: BudgeAnswerRow[],
  keyFn: (row: BudgeAnswerRow) => string,
  headerLabel: string,
): string {
  if (rows.length === 0) {
    return "No per-question Budge rows available in this promptfoo export.";
  }

  const slices = Array.from(new Set(rows.map(keyFn).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right),
  );

  const lines = [
    `| ${headerLabel} | Rows | Direct acc | Handoff acc | Agreement | Direct-only wins | Handoff-only wins | Invalid direct | Invalid handoff |`,
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const slice of slices) {
    const sliceRows = rows.filter((row) => keyFn(row) === slice);
    const stats = summarizeBudgeRows(sliceRows);
    lines.push(
      `| ${escapeCell(slice)} | ${sliceRows.length} | ${stats.directCorrect}/${sliceRows.length} (${formatPercent(stats.directCorrect, sliceRows.length)}) | ${stats.handoffCorrect}/${sliceRows.length} (${formatPercent(stats.handoffCorrect, sliceRows.length)}) | ${stats.agreement}/${sliceRows.length} (${formatPercent(stats.agreement, sliceRows.length)}) | ${stats.directOnlyWins} | ${stats.handoffOnlyWins} | ${stats.directInvalid} | ${stats.handoffInvalid} |`,
    );
  }

  return lines.join("\n");
}

function renderBudgeAnswerExamples(rows: BudgeAnswerRow[]): string {
  if (rows.length === 0) {
    return "No per-question Budge rows available in this promptfoo export.";
  }

  return [
    "### Direct-Only Wins",
    "",
    renderBudgeExampleTable(
      rows.filter(
        (row) => isCorrect(row.direct, row.correct) && !isCorrect(row.handoff, row.correct),
      ),
    ),
    "",
    "### Handoff-Only Wins",
    "",
    renderBudgeExampleTable(
      rows.filter(
        (row) => isCorrect(row.handoff, row.correct) && !isCorrect(row.direct, row.correct),
      ),
    ),
  ].join("\n");
}

function renderBudgeExampleTable(rows: BudgeAnswerRow[]): string {
  if (rows.length === 0) {
    return "None.";
  }

  const lines = [
    "| ID | Task Type | Finish | Direct | Handoff | Correct | Domain |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const row of rows
    .slice()
    .sort(
      (left, right) =>
        left.taskType.localeCompare(right.taskType) ||
        left.questionId.localeCompare(right.questionId),
    )
    .slice(0, 12)) {
    lines.push(
      `| ${escapeCell(row.questionId)} | ${escapeCell(row.taskType)} | ${escapeCell(row.finishReason)} | ${row.direct} | ${row.handoff} | ${row.correct} | ${escapeCell(row.domain)} |`,
    );
  }

  return lines.join("\n");
}

function renderBudgeFinishReasonTable(results: PromptfooCaseResult[]): string {
  const budgeResults = results.filter((result) => providerLabel(result) === "budge");
  if (budgeResults.length === 0) {
    return "No Budge results.";
  }

  const taskTypes = Array.from(
    new Set(budgeResults.map((result) => taskTypeValue(result)).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));
  const finishReasons = Array.from(
    new Set(budgeResults.map((result) => finishReasonValue(result)).filter(Boolean)),
  ).sort(compareFinishReasons);

  const header = [
    "| Task Type | Total |",
    ...finishReasons.map((reason) => `${escapeCell(reason)} |`),
  ].join(" ");
  const divider = ["| --- | --- |", ...finishReasons.map(() => "--- |")].join(" ");
  const lines = [header, divider];

  for (const taskType of taskTypes) {
    const taskTypeResults = budgeResults.filter((result) => taskTypeValue(result) === taskType);
    const cells = finishReasons.map((reason) => {
      const matching = taskTypeResults.filter(
        (result) => finishReasonValue(result) === reason,
      ).length;
      return `${matching}/${taskTypeResults.length} (${formatPercent(matching, taskTypeResults.length)})`;
    });
    lines.push(`| ${escapeCell(taskType)} | ${taskTypeResults.length} | ${cells.join(" | ")} |`);
  }

  return lines.join("\n");
}

function renderQuestionDetails(results: PromptfooCaseResult[]): string {
  if (results.length === 0) {
    return "No per-question rows available in this promptfoo export.";
  }

  const sorted = [...results].sort((left, right) => {
    return (
      questionIdValue(left).localeCompare(questionIdValue(right)) ||
      providerLabel(left).localeCompare(providerLabel(right))
    );
  });

  const lines = [
    "| ID | Task Type | Provider | Direct | Predicted | Correct | Finish | Pass | Tokens | Latency |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const result of sorted) {
    const tokenUsage = getTokenUsage(result);
    const timing = getTiming(result);
    lines.push(
      `| ${escapeCell(questionIdValue(result) || "unknown")} | ${escapeCell(taskTypeValue(result))} | ${escapeCell(providerLabel(result))} | ${directAnswerValue(result)} | ${predictedAnswerValue(result)} | ${correctAnswerValue(result)} | ${escapeCell(finishReasonValue(result))} | ${didPass(result) ? "yes" : "no"} | ${Math.round(tokenUsage.total)} | ${formatSeconds(timing.totalMs)} |`,
    );
  }

  return lines.join("\n");
}

function summarizeProvider(
  results: PromptfooCaseResult[],
  promptSummaryRows: PromptfooPromptSummary[],
  provider: string,
): ProviderMetricSummary {
  const filtered = results.filter((result) => providerLabel(result) === provider);
  const summary = getPromptSummary(promptSummaryRows, provider);

  if (filtered.length > 0) {
    const passCount = filtered.filter(didPass).length;
    const totalRows = filtered.length;
    const errorCount = numberValue(summary?.metrics?.testErrorCount);
    const failCount = Math.max(
      numberValue(summary?.metrics?.testFailCount),
      totalRows - passCount - errorCount,
    );
    return {
      rows: totalRows,
      passCount,
      failCount,
      errorCount,
      avgTokens: Math.round(
        average(filtered.map((result) => getTokenUsage(result).total)),
      ).toString(),
      avgLatency: formatSeconds(
        average(
          filtered.map(
            (result) =>
              getTiming(result).totalMs ||
              responseLatencyMs(result) ||
              numberValue(result.latencyMs),
          ),
        ),
      ),
    };
  }

  if (summary) {
    const totalRows = promptSummaryTotal(summary);
    return {
      rows: totalRows,
      passCount: numberValue(summary.metrics?.testPassCount),
      failCount: numberValue(summary.metrics?.testFailCount),
      errorCount: numberValue(summary.metrics?.testErrorCount),
      avgTokens:
        totalRows > 0
          ? Math.round(numberValue(summary.metrics?.tokenUsage?.total) / totalRows).toString()
          : "n/a",
      avgLatency:
        totalRows > 0
          ? formatSeconds(numberValue(summary.metrics?.totalLatencyMs) / totalRows)
          : "n/a",
    };
  }

  return {
    rows: 0,
    passCount: 0,
    failCount: 0,
    errorCount: 0,
    avgTokens: "n/a",
    avgLatency: "n/a",
  };
}

function overallMetric(
  results: PromptfooCaseResult[],
  promptSummaryRows: PromptfooPromptSummary[],
  provider: string,
) {
  const filtered = results.filter((result) => providerLabel(result) === provider);
  const summary = getPromptSummary(promptSummaryRows, provider);

  if (filtered.length > 0) {
    const passCount = filtered.filter(didPass).length;
    const totalRows = filtered.length;
    return {
      accuracy: `${passCount}/${totalRows} (${formatPercent(passCount, totalRows)})`,
      errors: numberValue(summary?.metrics?.testErrorCount).toString(),
      avgTokens: Math.round(
        average(filtered.map((result) => getTokenUsage(result).total)),
      ).toString(),
      avgLatency: formatSeconds(
        average(
          filtered.map(
            (result) =>
              getTiming(result).totalMs ||
              responseLatencyMs(result) ||
              numberValue(result.latencyMs),
          ),
        ),
      ),
      avgPrep:
        average(filtered.map((result) => getTiming(result).prepMs)) > 0
          ? formatSeconds(average(filtered.map((result) => getTiming(result).prepMs)))
          : "0.0s",
      avgAction:
        average(filtered.map((result) => getTiming(result).actionMs)) > 0
          ? formatSeconds(average(filtered.map((result) => getTiming(result).actionMs)))
          : "0.0s",
    };
  }

  if (summary) {
    const totalRows = promptSummaryTotal(summary);
    return {
      accuracy:
        totalRows > 0
          ? `${numberValue(summary.metrics?.testPassCount)}/${totalRows} (${formatPercent(numberValue(summary.metrics?.testPassCount), totalRows)})`
          : "n/a",
      errors: numberValue(summary.metrics?.testErrorCount).toString(),
      avgTokens:
        totalRows > 0
          ? Math.round(numberValue(summary.metrics?.tokenUsage?.total) / totalRows).toString()
          : "n/a",
      avgLatency:
        totalRows > 0
          ? formatSeconds(numberValue(summary.metrics?.totalLatencyMs) / totalRows)
          : "n/a",
      avgPrep: "n/a",
      avgAction: "n/a",
    };
  }

  return {
    accuracy: "n/a",
    errors: "n/a",
    avgTokens: "n/a",
    avgLatency: "n/a",
    avgPrep: "n/a",
    avgAction: "n/a",
  };
}

function sliceAccuracy(
  results: PromptfooCaseResult[],
  _promptSummaryRows: PromptfooPromptSummary[],
  provider: string,
  field: SliceField,
  value: string,
): string {
  const filtered = results.filter(
    (result) => providerLabel(result) === provider && sliceFieldValue(result, field) === value,
  );
  if (filtered.length === 0) return "n/a";
  const passCount = filtered.filter(didPass).length;
  return `${passCount}/${filtered.length} (${formatPercent(passCount, filtered.length)})`;
}

function getObservedQuestionCount(results: PromptfooCaseResult[]): number {
  return new Set(results.map((result) => questionIdValue(result)).filter(Boolean)).size;
}

function getBudgeAnswerRows(results: PromptfooCaseResult[]): BudgeAnswerRow[] {
  return results
    .filter((result) => providerLabel(result) === "budge")
    .map((result) => ({
      questionId: questionIdValue(result),
      domain: domainValue(result),
      taskType: taskTypeValue(result),
      finishReason: finishReasonValue(result),
      direct: directAnswerValue(result),
      handoff: handoffAnswerValue(result),
      correct: correctAnswerValue(result),
    }));
}

function summarizeBudgeRows(rows: BudgeAnswerRow[]): BudgeAnswerStats {
  return rows.reduce<BudgeAnswerStats>(
    (stats, row) => {
      const directValid = isAnswer(row.direct);
      const handoffValid = isAnswer(row.handoff);
      const directCorrect = isCorrect(row.direct, row.correct);
      const handoffCorrect = isCorrect(row.handoff, row.correct);
      const agreement = directValid && handoffValid && row.direct === row.handoff;

      return {
        total: stats.total + 1,
        directCorrect: stats.directCorrect + Number(directCorrect),
        handoffCorrect: stats.handoffCorrect + Number(handoffCorrect),
        agreement: stats.agreement + Number(agreement),
        directInvalid: stats.directInvalid + Number(!directValid),
        handoffInvalid: stats.handoffInvalid + Number(!handoffValid),
        bothCorrect: stats.bothCorrect + Number(directCorrect && handoffCorrect),
        directOnlyWins: stats.directOnlyWins + Number(directCorrect && !handoffCorrect),
        handoffOnlyWins: stats.handoffOnlyWins + Number(handoffCorrect && !directCorrect),
        bothWrongSame: stats.bothWrongSame + Number(agreement && !directCorrect),
        bothWrongDifferent:
          stats.bothWrongDifferent +
          Number(directValid && handoffValid && !agreement && !directCorrect && !handoffCorrect),
        missingEither: stats.missingEither + Number(!directValid || !handoffValid),
      };
    },
    {
      total: 0,
      directCorrect: 0,
      handoffCorrect: 0,
      agreement: 0,
      directInvalid: 0,
      handoffInvalid: 0,
      bothCorrect: 0,
      directOnlyWins: 0,
      handoffOnlyWins: 0,
      bothWrongSame: 0,
      bothWrongDifferent: 0,
      missingEither: 0,
    },
  );
}

function responseMetadata(result: PromptfooCaseResult): Record<string, unknown> {
  return {
    ...((result.response?.metadata ?? {}) as Record<string, unknown>),
    ...((result.metadata ?? {}) as Record<string, unknown>),
  };
}

function getPromptSummary(
  promptSummaryRows: PromptfooPromptSummary[],
  provider: string,
): PromptfooPromptSummary | undefined {
  return promptSummaryRows.find((row) => (row.provider ?? row.label) === provider);
}

function promptSummaryTotal(summary: PromptfooPromptSummary): number {
  return (
    numberValue(summary.metrics?.testPassCount) +
    numberValue(summary.metrics?.testFailCount) +
    numberValue(summary.metrics?.testErrorCount)
  );
}

function questionIdValue(result: PromptfooCaseResult): string {
  return (
    stringValue(result.testCase?.metadata?._id) ||
    stringValue(result.metadata?._id) ||
    stringValue(responseMetadata(result).itemId) ||
    ""
  );
}

function domainValue(result: PromptfooCaseResult): string {
  return (
    stringValue(result.testCase?.metadata?.domain) ||
    stringValue(result.metadata?.domain) ||
    stringValue(responseMetadata(result).domain) ||
    "unknown"
  );
}

function difficultyValue(result: PromptfooCaseResult): string {
  return (
    stringValue(result.testCase?.metadata?.difficulty) ||
    stringValue(result.metadata?.difficulty) ||
    stringValue(responseMetadata(result).difficulty) ||
    "unknown"
  );
}

function taskTypeValue(result: PromptfooCaseResult): string {
  return (
    stringValue(result.testCase?.metadata?.task_type) ||
    stringValue(result.metadata?.task_type) ||
    stringValue(result.metadata?.taskType) ||
    stringValue(responseMetadata(result).taskType) ||
    "unknown"
  );
}

function sliceFieldValue(result: PromptfooCaseResult, field: SliceField): string {
  if (field === "task_type") return taskTypeValue(result);
  if (field === "difficulty") return difficultyValue(result);
  return domainValue(result);
}

function correctAnswerValue(result: PromptfooCaseResult): string {
  return normalizeAnswer(
    stringValue(result.testCase?.metadata?.answer) ||
      stringValue(result.metadata?.answer) ||
      stringValue(responseMetadata(result).correctAnswer),
  );
}

function predictedAnswerValue(result: PromptfooCaseResult): string {
  return normalizeAnswer(
    stringValue(responseMetadata(result).predicted) || stringValue(result.response?.output),
  );
}

function directAnswerValue(result: PromptfooCaseResult): string {
  return normalizeAnswer(stringValue(responseMetadata(result).directAnswer));
}

function handoffAnswerValue(result: PromptfooCaseResult): string {
  return normalizeAnswer(
    stringValue(responseMetadata(result).handoffAnswer) || predictedAnswerValue(result),
  );
}

function finishReasonValue(result: PromptfooCaseResult): string {
  return stringValue(responseMetadata(result).finishReason) || "unknown";
}

function getTokenUsage(result: PromptfooCaseResult): TokenUsageSummary {
  const metadataUsage = responseMetadata(result).tokenUsage as Record<string, unknown> | undefined;
  const responseUsage = result.response?.tokenUsage;
  return {
    prep: numberValue(metadataUsage?.prep),
    action: numberValue(metadataUsage?.action),
    total: numberValue(metadataUsage?.total) || numberValue(responseUsage?.total),
    cached: numberValue(metadataUsage?.cached) || numberValue(responseUsage?.cached),
  };
}

function getTiming(result: PromptfooCaseResult): TimingSummary {
  const timing = responseMetadata(result).timing as Record<string, unknown> | undefined;
  const fallbackTotalMs = responseLatencyMs(result) || numberValue(result.latencyMs);
  return {
    prepMs: numberValue(timing?.prepMs),
    actionMs: numberValue(timing?.actionMs),
    totalMs: numberValue(timing?.totalMs) || fallbackTotalMs,
  };
}

function responseLatencyMs(result: PromptfooCaseResult): number {
  return numberValue(result.response?.latencyMs);
}

function didPass(result: PromptfooCaseResult): boolean {
  return result.gradingResult?.pass === true;
}

function providerLabel(result: PromptfooCaseResult): string {
  return result.provider?.label ?? "unknown";
}

function normalizeAnswer(value: string): string {
  const upper = value.trim().toUpperCase();
  return upper === "A" || upper === "B" || upper === "C" || upper === "D" ? upper : "?";
}

function isAnswer(value: string): boolean {
  return value === "A" || value === "B" || value === "C" || value === "D";
}

function isCorrect(answer: string, correct: string): boolean {
  return isAnswer(answer) && isAnswer(correct) && answer === correct;
}

function average(values: number[]): number {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (filtered.length === 0) return Number.NaN;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function formatPercent(numerator: number, denominator: number): string {
  if (denominator === 0) return "n/a";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function formatSignedPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)} pp`;
}

function formatSignedInt(value: number): string {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function compareFinishReasons(left: string, right: string): number {
  const rank = new Map([
    ["finish", 0],
    ["max_steps", 1],
    ["no_finish", 2],
    ["unknown", 3],
  ]);
  return (
    (rank.get(left) ?? Number.MAX_SAFE_INTEGER) - (rank.get(right) ?? Number.MAX_SAFE_INTEGER) ||
    left.localeCompare(right)
  );
}

function formatSeconds(milliseconds: number): string {
  return Number.isFinite(milliseconds) ? `${(milliseconds / 1000).toFixed(1)}s` : "n/a";
}

function numberValue(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}
