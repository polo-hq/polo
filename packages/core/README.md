# @budge/core

`@budge/core` is the runtime for Budge windows: reusable sources, `compose`, `.resolve`, token budgeting, TOON-backed serialization, and trace receipts.

## Install

```bash
pnpm add @budge/core zod
```

## Quick start

```ts
import { createBudge } from "@budge/core";
import { z } from "zod";

const budge = createBudge();

const noteSource = budge.source.value(z.object({ encounterId: z.string() }), {
  async resolve({ input }) {
    return db.getNote(input.encounterId);
  },
});

const window = budge.window({
  id: "scribe-note",
  input: z.object({ encounterId: z.string() }),
  maxTokens: 2000,
  async compose({ input, use }) {
    const note = await use(noteSource, { encounterId: input.encounterId });

    return {
      system: "You are an AI medical scribe.",
      prompt: `Prior note:\n${note}`,
    };
  },
});

const result = await window.resolve({
  input: { encounterId: "enc_123" },
});
```

## Main concepts

- `budge.source.value(...)` and `budge.source.rag(...)` define reusable source handles.
- `budge.window({ id, input, maxTokens, compose })` declares one context window.
- `use(source, input)` resolves a source during `compose`.
- `.resolve({ input })` validates input, runs `compose`, measures the final prompt, and returns `trace`.

## Local development

```bash
vp test
vp check
vp pack
```
