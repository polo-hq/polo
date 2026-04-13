<p align="center">
  <picture>
    <source
      media="(prefers-color-scheme: dark)"
      srcset="./assets/budge-logo-dark.png"
    />
    <img
      src="./assets/budge-logo.png"
      alt="Budge logo"
      width="240"
    />
  </picture>
</p>

# Budge

The orchestration runtime for agents.

Agents fail on long tasks because they're given everything at once.
Budge inverts this — your agent navigates context like a librarian,
not a reader. The model decides what to read and when. You never
touch a context window.

## Install

pnpm add @budge/core @ai-sdk/anthropic

## Usage

import { createRuntime, source } from "@budge/core"
import { anthropic } from "@ai-sdk/anthropic"

const runtime = createRuntime({
model: anthropic("claude-sonnet-4-6"),
subModel: anthropic("claude-haiku-4-5"),
})

const result = await runtime.run({
task: "what does the auth module do and how could it be improved",
sources: {
codebase: source.fs("./src"),
docs: source.files(["./README.md"]),
}
})

console.log(result.answer)
console.log(result.trace)

## How it works

The root agent receives your task and descriptions of what's
available — not the data itself. It navigates sources via tool
calls, reading only what it needs. When a sub-task requires deeper
focus, it spawns a scoped sub-call against a slice of context using
the cheaper subModel. The trace captures every decision.

## Sources

source.fs(rootPath) — local filesystem
source.files(paths[]) — explicit file list  
source.conversation(msgs[]) — message history

The source adapter interface is public. Build your own.

## Trace

result.trace gives you the full decomposition tree — which sources
were read, tokens per call, sub-calls spawned, wall time.

## Status

Early. API will change. Build with it anyway.

## License

MIT
