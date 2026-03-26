import type { InferContext, Trace } from "@polo/core";
import { z } from "zod";
import { polo } from "./polo.ts";
import { supportReplySources } from "./sourceRegistry.ts";

const supportReplyInputSchema = z.object({
  accountId: z.string(),
  transcript: z.string(),
});

export const supportReply = polo.define(supportReplyInputSchema, {
  id: "support_reply",
  sources: {
    transcript: polo.source.fromInput("transcript", { tags: ["restricted"] }),
    account: supportReplySources.account,
    billingNotes: supportReplySources.billingNotes,
    recentTickets: supportReplySources.recentTickets,
  },

  derive: ({ context }) => ({
    isEnterprise: context.account.plan === "enterprise",
    replyStyle: context.account.tier === "priority" ? ("concise" as const) : ("standard" as const),
    mentionsBilling: /\b(invoice|refund|charge|billing)\b/i.test(context.transcript),
  }),

  policies: {
    require: ["transcript", "account"],
    prefer: ["recentTickets", "billingNotes"],
    exclude: [
      ({ context }) =>
        !context.mentionsBilling
          ? {
              source: "billingNotes",
              reason: "billing notes are excluded unless the transcript is billing-related",
            }
          : false,
    ],
    budget: 110,
  },
});

type SupportReplyContext = InferContext<typeof supportReply>;

export function buildSystemPrompt(context: SupportReplyContext): string {
  return [
    "You are a support engineer drafting a customer reply.",
    `Use a ${context.replyStyle} tone.`,
    context.isEnterprise
      ? "Prioritize urgency and ownership."
      : "Keep the reply practical and direct.",
  ].join(" ");
}

export function buildPrompt(context: SupportReplyContext): string {
  const sections: string[] = [];

  sections.push(`Transcript:\n${context.transcript}`);

  sections.push(
    [
      "Account:",
      `- ${context.account.name}`,
      `- plan: ${context.account.plan}`,
      `- tier: ${context.account.tier}`,
      `- region: ${context.account.region}`,
    ].join("\n"),
  );

  if (context.recentTickets?.length) {
    sections.push(
      [
        "Relevant recent tickets:",
        ...context.recentTickets.map((ticket) => `- ${ticket.content}`),
      ].join("\n"),
    );
  }

  if (context.billingNotes) {
    sections.push(
      [
        "Billing notes:",
        `- invoice status: ${context.billingNotes.lastInvoiceStatus}`,
        `- ${context.billingNotes.summary}`,
      ].join("\n"),
    );
  }

  return sections.join("\n\n");
}

export function summarizeTrace(trace: Trace): string {
  const lines = [
    `run: ${trace.runId}`,
    `task: ${trace.taskId}`,
    `budget: ${trace.budget.used}/${trace.budget.max}`,
    "policies:",
    ...trace.policies.map((policy) => `  - ${policy.source}: ${policy.action} (${policy.reason})`),
  ];

  for (const source of trace.sources) {
    if (!source.chunks?.length) {
      continue;
    }

    const dropped = source.chunks.filter((chunk) => !chunk.included);
    if (dropped.length) {
      lines.push(`dropped chunks for ${source.key}:`);
      lines.push(
        ...dropped.map((chunk) => `  - ${chunk.reason ?? "dropped"} (score=${chunk.score ?? 0})`),
      );
    }
  }

  return lines.join("\n");
}
