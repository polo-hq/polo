# Budge Evals

Budge vs. full-context-dump baseline evaluation suite using [promptfoo](https://promptfoo.dev).

## Structure

```
evals/
  promptfooconfig.yaml     # v1 regression suite on packages/core
  promptfooconfig.v2.yaml  # generated v2 config for the Next.js corpus
  providers/
    budge.ts               # custom provider: wraps budge.prepare()
    baseline.ts            # custom provider: naive full-context-dump
    budge-v2.ts            # Budge vs large corpus
    rag-v2.ts              # BM25 baseline
    monolithic-v2.ts       # agent-with-tools baseline
  tasks/                   # v2 task source of truth
  scripts/                 # corpus setup, config generation, results rendering
  results/                 # output from eval runs (gitignored)
```

## Setup

```bash
cd packages/evals
vp install
```

Set your Anthropic API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Make sure `packages/core` is built:

```bash
cd ../core
vp pack
cd ../evals
```

## Running

```bash
# Run all test cases against both providers
vp run eval

# Open the results UI
vp exec promptfoo view

# Run a single test by description (useful during iteration)
vp exec promptfoo eval --config promptfooconfig.yaml --filter-description "six root tools"
```

## Running v2

```bash
# Clone Next.js, pin the commit, and regenerate promptfooconfig.v2.yaml
./scripts/setup-corpus.sh

# Run the full v2 suite and render EVAL-V2-RESULTS.md from the output JSON
vp run eval:v2
```

`promptfooconfig.v2.yaml` is generated from `tasks/*.yaml` plus the pinned corpus commit. If the config still contains the `__RUN_SETUP_CORPUS__` placeholder, the v2 providers will fail fast instead of running against an unpinned corpus.

## Running LongBench v2

Download the dataset into the local eval corpus:

```bash
mkdir -p packages/evals/corpus/longbench-v2
curl -L "https://huggingface.co/datasets/THUDM/LongBench-v2/resolve/main/data.json" -o packages/evals/corpus/longbench-v2/data.json
```

Generate the LongBench promptfoo config from the hard short/medium subset:

```bash
vp run generate:longbench-config
```

Run the eval and render the markdown summary:

```bash
vp run eval:longbench
```

By default this selects a deterministic 48-question subset filtered to `difficulty=hard`, `length in [short, medium]`, then excludes cases whose estimated full-dump prompt would exceed the current action-model window. You can override the subset size or fit cap with `LONGBENCH_SAMPLE_SIZE` and `LONGBENCH_MAX_FULL_DUMP_PROMPT_TOKENS`.

## What you're measuring

Each test case runs against both `budge` and `baseline (full-context-dump)`.

**budge**: calls `budge.prepare()` with `source.fs` pointed at `packages/core/src`. The orchestrator navigates lazily — only reads what's relevant.

**baseline**: reads every `**/*.ts` file upfront and stuffs them all into a single system prompt, then calls the model once.

### Key metrics to compare in the UI

| Metric             | Where to find it                                             |
| ------------------ | ------------------------------------------------------------ |
| Answer correctness | Pass/fail on `contains` + `llm-rubric` assertions            |
| Total tokens       | `tokenUsage.total` column                                    |
| Subcalls spawned   | `metadata.totalSubcalls` (budge only)                        |
| Wall time          | `metadata.durationMs`                                        |
| Finish reason      | `metadata.finishReason` (`finish`, `max_steps`, `no_finish`) |
| Tool call count    | `metadata.toolCallCount` (budge only)                        |

The story you're trying to tell: **budge matches baseline quality at significantly lower token cost**.

## Adding test cases

Edit `promptfooconfig.yaml` and add to the `tests` array. Prefer `icontains` assertions for things you know with certainty are in the correct answer (function names, file names, specific values). Use `llm-rubric` only for reasoning-quality checks where ground truth is fuzzy.

## Switching to Tono

Update the `root` in both provider configs:

```yaml
config:
  root: "../../path/to/tono/src"
  include: ["**/*.{ts,tsx}"]
```

And replace the test cases with Tono-specific tasks.
