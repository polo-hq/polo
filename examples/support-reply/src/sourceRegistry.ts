import { registerSources } from "@polo/core";
import { z } from "zod";
import { db, vectorDb } from "./data.ts";
import { polo } from "./polo.ts";

const accountInputSchema = z.object({
  accountId: z.string(),
});

const transcriptInputSchema = z.object({
  transcript: z.string(),
});

type Account = Awaited<ReturnType<typeof db.getAccount>>;

export const supportReplySources = registerSources({
  account: polo.source(accountInputSchema, {
    tags: ["internal"],
    async resolve({ input }) {
      return db.getAccount(input.accountId);
    },
  }),

  billingNotes: polo.source(accountInputSchema, {
    tags: ["billing"],
    async resolve({ context }: { context: { account: Account } }) {
      return db.getBillingNotes(context.account.id);
    },
  }),

  recentTickets: polo.source.chunks(transcriptInputSchema, {
    tags: ["internal"],
    async resolve({
      input,
      context,
    }: {
      input: z.output<typeof transcriptInputSchema>;
      context: { account: Account };
    }) {
      return vectorDb.searchTickets(context.account.id, input.transcript);
    },
    normalize(item) {
      return {
        content: item.pageContent,
        score: item.relevanceScore,
        metadata: { ticketId: item.id },
      };
    },
  }),
});
