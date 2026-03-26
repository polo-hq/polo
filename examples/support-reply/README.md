# Support Reply Example

This example shows the smallest useful `@polo/core` flow:

- `polo.input()` for transcript input
- inline `sources` descriptors with `resolve()` for account and billing data
- `polo.chunks()` for ranked ticket retrieval
- `derive()` for prompt-ready values
- `exclude` to remove billing notes when the task is not billing-related
- budget-aware chunk dropping with a trace

## Run

```bash
vp pack
vp run demo
```

The demo prints:

- the final authoritative context keys
- a sample system prompt
- a sample user prompt
- the full trace JSON
