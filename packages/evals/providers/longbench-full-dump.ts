import { generateText } from "ai";
import type { CallApiContextParams, ProviderOptions, ProviderResponse } from "promptfoo";
import {
  getLongBenchTaskType,
  getFullDumpSystemPrompt,
  normalizeProviderOutput,
  parseLongBenchPayload,
  renderFullDumpUserPrompt,
} from "../lib/longbench.ts";
import {
  getLanguageModel,
  normalizeUsage,
  summarizeWarnings,
  toPromptfooResponse,
} from "./shared.ts";

interface LongBenchFullDumpProviderConfig {
  actionModel?: string;
  provider?: string;
}

export default class LongBenchFullDumpProvider {
  private readonly config: LongBenchFullDumpProviderConfig;
  private readonly providerId: string;

  constructor(options: ProviderOptions) {
    this.config = (options.config ?? {}) as LongBenchFullDumpProviderConfig;
    this.providerId = options.id ?? "longbench-full-dump";
  }

  id(): string {
    return this.providerId;
  }

  async callApi(prompt: string, _context?: CallApiContextParams): Promise<ProviderResponse> {
    const payload = parseLongBenchPayload(prompt);
    const taskType = getLongBenchTaskType(payload);
    const providerName = this.config.provider ?? process.env.BUDGE_PROVIDER ?? "openai";
    const actionModelName =
      this.config.actionModel ?? process.env.BUDGE_ACTION ?? "openai/gpt-5.4-mini";
    const actionModel = await getLanguageModel(providerName, actionModelName);

    const actionStart = Date.now();
    const result = await generateText({
      model: actionModel,
      system: getFullDumpSystemPrompt(),
      messages: [{ role: "user", content: renderFullDumpUserPrompt(payload) }],
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
        providerKind: "full-dump",
        itemId: payload._id,
        predicted,
        correctAnswer: payload.answer,
        domain: payload.domain,
        subDomain: payload.sub_domain,
        taskType,
        difficulty: payload.difficulty,
        length: payload.length,
        rawOutput: result.text,
        warnings: summarizeWarnings(result.warnings),
      },
    });
  }
}
