# Polo

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/polo-hq/polo)

Polo is a typed context assembly runtime for production AI. Create a Polo instance, register reusable context sources, define tasks that aggregate those sources, and resolve a context object that is ready to use in your prompt.

## Installation

```sh
pnpm add @polo/core zod
```

Examples below use `zod` for schemas, but Polo works with Standard Schema-compatible validators.

## Usage

### Create instance

```ts
import { createPolo } from "@polo/core";

export const polo = createPolo();
```

`createPolo()` gives you an isolated runtime surface. You can also pass runtime hooks like `logger` and `onTrace` if you want to forward traces into your own observability layer.

### Create context sources

```ts
import { registerSources } from "@polo/core";
import { z } from "zod";

const supportReplyInputSchema = z.object({
  accountId: z.string(),
  transcript: z.string(),
});

const accountSourceInputSchema = z.object({
  accountId: z.string(),
});

const transcriptSourceInputSchema = z.object({
  transcript: z.string(),
});

const supportReplySources = registerSources({
  account: polo.source(accountSourceInputSchema, {
    tags: ["internal"],
    async resolve({ input }) {
      return db.getAccount(input.accountId);
    },
  }),

  billingNotes: polo.source(accountSourceInputSchema, {
    tags: ["billing"],
    async resolve({ context }: { context: { account: Account } }) {
      return db.getBillingNotes(context.account.id);
    },
  }),

  recentTickets: polo.source.chunks(transcriptSourceInputSchema, {
    tags: ["internal"],
    async resolve({
      input,
      context,
    }: {
      input: z.output<typeof transcriptSourceInputSchema>;
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
```

Use `registerSources(...)` for shared resolver-style sources only. Input passthroughs like `transcript` stay local to each task definition.

### Define tasks to aggregate sources

```ts
const supportReply = polo.define(supportReplyInputSchema, {
  id: "support_reply",
  sources: {
    transcript: polo.source.fromInput("transcript", { tags: ["restricted"] }),
    account: supportReplySources.account,
    billingNotes: supportReplySources.billingNotes,
    recentTickets: supportReplySources.recentTickets,
  },

  derive: ({ context }) => ({
    isEnterprise: context.account.plan === "enterprise",
    replyStyle: context.account.tier === "priority" ? "concise" : "standard",
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
```

`polo.define(inputSchema, config)` declares the contract for one task: what inputs are accepted, what sources can be resolved, what derived fields should exist, and what policies govern the final context.

### Resolve context

```ts
const { context, trace } = await polo.resolve(supportReply, {
  accountId: "acc_123",
  transcript:
    "Our webhook deliveries have been timing out in production since yesterday's deploy. Can you help us figure out the safest next step?",
});
```

### Use context in your prompt

```ts
import { generateText } from "ai";

const { text } = await generateText({
  model: "openai/gpt-5.4",
  system: buildSystemPrompt(context),
  prompt: buildPrompt(context),
});
```

`context` contains only what policy allowed through. Excluded sources are absent at runtime, not nulled out. Polo does not own the prompt layer. It governs the data surface you use to build it.

---

## API

|                                           |                                                |
| ----------------------------------------- | ---------------------------------------------- |
| `createPolo(options?)`                    | Create an isolated Polo runtime                |
| `registerSources(sources)`                | Compose reusable shared resolver/chunk sources |
| `polo.define(inputSchema, config)`        | Declare the context contract for a task        |
| `polo.resolve(definition, input)`         | Resolve context at runtime                     |
| `polo.source.fromInput(key, options?)`    | Passthrough from call-time input               |
| `polo.source(inputSchema, config)`        | Resolve a single async value                   |
| `polo.source.chunks(inputSchema, config)` | Resolve ranked multi-block context             |

---

## Sources

`polo.source.fromInput()` passes through a value from task input. `polo.source()` wraps any async resolver: database queries, HTTP requests, file reads, whatever you already have.

Resolvers receive a single argument object with:

- `input`: task input narrowed by the source's schema
- `context`: already-resolved source values the resolver depends on

Polo infers the dependency graph automatically from resolver usage and runs independent sources in parallel.

```ts
account: polo.source(accountSourceInputSchema, {
  async resolve({ input }) {
    return db.getAccount(input.accountId);
  },
});

billingNotes: polo.source(accountSourceInputSchema, {
  async resolve({ context }: { context: { account: Account } }) {
    return db.getBillingNotes(context.account.id);
  },
});
```

## Chunks

`polo.source.chunks()` is for sources that return multiple ranked blocks. Polo fits as many as the token budget allows, drops the rest, and records each decision in the trace.

```ts
recentTickets: polo.source.chunks(transcriptSourceInputSchema, {
  async resolve({
    input,
    context,
  }: {
    input: { transcript: string };
    context: { account: Account };
  }) {
    return vectorDb.searchTickets(context.account.id, input.transcript);
  },
  normalize(item) {
    return {
      content: item.pageContent,
      score: item.relevanceScore,
    };
  },
});
```

## Derive

`derive()` computes values from resolved sources. The result is merged onto `context` alongside source data.

```ts
derive: ({ context }) => ({
  isEnterprise: context.account.plan === "enterprise",
  replyStyle: context.account.tier === "priority" ? "concise" : "standard",
  mentionsBilling: /\b(invoice|refund|charge|billing)\b/i.test(context.transcript),
});
```

## Policies

```ts
policies: {
  require: ["transcript", "account"],
  prefer:  ["recentTickets", "billingNotes"],
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
}
```

`require` — must resolve or `polo.resolve()` throws.  
`prefer` — included if it fits in budget.  
`exclude` — excludes a source with a reason, recorded in the trace.  
`budget` — token ceiling for the full context. Token counts are estimated at 96% accuracy using [tokenx](https://github.com/johannschopplich/tokenx). Required sources always pass through; preferred and default-included sources are dropped when over budget and recorded in the trace.

> **v0:** policies operate on top-level source keys only. If nested data needs separate treatment, promote it to its own source.

## Trace

`polo.resolve()` returns a `trace` alongside `context`. The trace records source resolution timing, tags, policy decisions, chunk inclusion, and budget usage. Raw resolved values are not stored.

```json
{
  "sources": [
    { "key": "transcript", "type": "input", "tags": ["restricted"] },
    { "key": "account", "type": "value", "tags": ["internal"], "durationMs": 1 },
    {
      "key": "billingNotes",
      "type": "value",
      "tags": ["billing"],
      "durationMs": 0
    },
    {
      "key": "recentTickets",
      "type": "chunks",
      "tags": ["internal"],
      "chunks": [
        { "included": true, "score": 0.36 },
        { "included": false, "score": 0.14, "reason": "over_budget" }
      ]
    }
  ],
  "policies": [
    { "source": "transcript", "action": "required", "reason": "required by task" },
    {
      "source": "billingNotes",
      "action": "excluded",
      "reason": "billing notes are excluded unless the transcript is billing-related"
    }
  ],
  "budget": { "max": 110, "used": 102 }
}
```

---

## Why Polo

Context assembly is usually handwritten glue — sources fetched manually, included unconditionally, with no token budget and no record of what the model actually saw. This works fine until outputs go wrong and you can't tell why.

Polo gives you:

- **consistent outputs** — same policies run every time, same sources, same budget
- **explicit contracts** — input schemas, source schemas, and policies live next to the task
- **typed context** — `context` is fully typed from your source definitions, no casting
- **automatic dependency resolution** — sources run in parallel waves, no manual sequencing
- **debuggable** — when outputs go wrong, the trace tells you exactly what the model saw

---

## Fits Your Stack

- **AI SDK** — use `context` directly with `generateText`, `generateObject`, or streaming APIs
- **`Prisma` / Drizzle / any ORM** — `polo.source(inputSchema, { resolve })` takes any async resolver
- **LangSmith / Braintrust** — pass `trace` to your existing observability layer

---

## License

MIT
