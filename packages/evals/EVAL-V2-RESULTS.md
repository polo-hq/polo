# Budge Benchmark Results

Corpus: Next.js (vercel/next.js @ commit 92b0789be78183faba91c0e6f054cce26010cd4b), filtered to packages/next/src
Models: openai/gpt-5.4-mini for all baselines (action agent identical across comparisons)
Date: 2026-04-17

## Cross-Source Synthesis (5 tasks)

| Metric | Budge | RAG (BM25) | Monolithic Agent |
| --- | --- | --- | --- |
| Avg quality score | 0.74 | 0.70 | 0.59 |
| Pass rate | 4/5 | 1/5 | 3/5 |
| Avg billed-equiv tokens | 148267 | 11115 | 16895 |
| Avg latency | 42.9s | 7.5s | 11.7s |
| P95 latency | 82.1s | 8.7s | 29.8s |
| Avg tool calls | 20.00 | n/a | 13.00 |

<details>
<summary>Cross-Source Synthesis details</summary>

| Task | Provider | Score | Pass | Tokens | Latency |
| --- | --- | --- | --- | --- | --- |
| Synthesis: How does Next.js's App Router handle the transition from a Server Com... | rag (bm25) | 0.66 | no | 10523 | 5.7s |
| Synthesis: Explain how Next.js middleware, edge runtime, and the router interact... | rag (bm25) | 0.68 | no | 11258 | 6.9s |
| Synthesis: How does Next.js implement partial prerendering? Trace from the build... | rag (bm25) | 0.62 | no | 10869 | 8.5s |
| Synthesis: Compare how errors propagate in the App Router (error.tsx, global-err... | rag (bm25) | 0.72 | yes | 11424 | 8.7s |
| Synthesis: How does the Next.js image optimization pipeline work end-to-end? Tra... | rag (bm25) | 0.82 | no | 11503 | 7.8s |
| Synthesis: How does Next.js's App Router handle the transition from a Server Com... | budge | 0.99 | yes | 119392 | 34.7s |
| Synthesis: Explain how Next.js middleware, edge runtime, and the router interact... | budge | 0.00 | no | 0 | 0.0s |
| Synthesis: How does Next.js implement partial prerendering? Trace from the build... | budge | 0.90 | yes | 266859 | 82.1s |
| Synthesis: Compare how errors propagate in the App Router (error.tsx, global-err... | budge | 0.82 | yes | 85708 | 29.9s |
| Synthesis: How does the Next.js image optimization pipeline work end-to-end? Tra... | budge | 1.00 | yes | 269377 | 68.1s |
| Synthesis: How does Next.js's App Router handle the transition from a Server Com... | monolithic agent | 1.00 | yes | 31857 | 13.9s |
| Synthesis: Explain how Next.js middleware, edge runtime, and the router interact... | monolithic agent | 0.00 | no | 0 | 0.0s |
| Synthesis: How does Next.js implement partial prerendering? Trace from the build... | monolithic agent | 0.98 | yes | 91841 | 29.8s |
| Synthesis: Compare how errors propagate in the App Router (error.tsx, global-err... | monolithic agent | 0.98 | yes | 40267 | 15.0s |
| Synthesis: How does the Next.js image optimization pipeline work end-to-end? Tra... | monolithic agent | 0.00 | no | 0 | 0.0s |

</details>

## Targeted Lookup (5 tasks)

| Metric | Budge | RAG (BM25) | Monolithic Agent |
| --- | --- | --- | --- |
| Avg quality score | 0.64 | 0.95 | 0.20 |
| Pass rate | 3/5 | 4/5 | 1/5 |
| Avg billed-equiv tokens | 40864 | 10334 | 40211 |
| Avg latency | 21.1s | 2.6s | 2.0s |
| P95 latency | 35.7s | 3.7s | 9.9s |
| Avg tool calls | 15.00 | n/a | 6.00 |

<details>
<summary>Targeted Lookup details</summary>

| Task | Provider | Score | Pass | Tokens | Latency |
| --- | --- | --- | --- | --- | --- |
| Lookup: What is the maximum number of dynamic route parameters Next.js suppor... | monolithic agent | 0.00 | no | 0 | 0.0s |
| Lookup: Find the default configuration for the Next.js image optimization loa... | monolithic agent | 1.00 | yes | 201055 | 9.9s |
| Lookup: Where in the Next.js source is the 'use server' directive parsed and ... | monolithic agent | 0.00 | no | 0 | 0.0s |
| Lookup: What HTTP headers does Next.js set by default on static assets served... | monolithic agent | 0.00 | no | 0 | 0.0s |
| Lookup: How does Next.js detect whether a page component is async (Server Com... | monolithic agent | 0.00 | no | 0 | 0.0s |
| Lookup: What is the maximum number of dynamic route parameters Next.js suppor... | budge | 1.00 | yes | 46385 | 32.1s |
| Lookup: Find the default configuration for the Next.js image optimization loa... | budge | 1.00 | yes | 12249 | 14.0s |
| Lookup: Where in the Next.js source is the 'use server' directive parsed and ... | budge | 1.00 | yes | 54976 | 24.0s |
| Lookup: What HTTP headers does Next.js set by default on static assets served... | budge | 0.22 | no | 90708 | 35.7s |
| Lookup: How does Next.js detect whether a page component is async (Server Com... | budge | 0.00 | no | 0 | 0.0s |
| Lookup: What is the maximum number of dynamic route parameters Next.js suppor... | rag (bm25) | 1.00 | yes | 10664 | 1.6s |
| Lookup: Find the default configuration for the Next.js image optimization loa... | rag (bm25) | 0.75 | no | 10077 | 3.7s |
| Lookup: Where in the Next.js source is the 'use server' directive parsed and ... | rag (bm25) | 1.00 | yes | 9837 | 2.4s |
| Lookup: What HTTP headers does Next.js set by default on static assets served... | rag (bm25) | 1.00 | yes | 10456 | 2.5s |
| Lookup: How does Next.js detect whether a page component is async (Server Com... | rag (bm25) | 1.00 | yes | 10636 | 2.7s |

</details>

## Chat Amortization (3 scenarios x 5 turns)

| Metric | Budge | RAG (BM25) | Monolithic Agent |
| --- | --- | --- | --- |
| Avg session cost (tokens) | 325617 | 97935 | 0 |
| Turn 1 avg cost | 305123 | 10708 | 0 |
| Turn 2-5 avg cost | 2928 | 12461 | NaN |
| Amortization ratio | 104.22x | 0.86x | n/a |
| Avg quality (across all turns) | 0.99 | 0.99 | 0.00 |

<details>
<summary>Chat details</summary>

| Scenario | Provider | Session Tokens | Turn 1 | Turn 2-5 Avg | Context Growth |
| --- | --- | --- | --- | --- | --- |
| Exploring the routing system | monolithic agent | 0 | 0 | 0 | +0 input tokens |

Per-turn breakdown for Exploring the routing system / monolithic agent

| Turn | Total Tokens | Input | Output | Prep | Latency |
| --- | --- | --- | --- | --- | --- |

| Understanding the build pipeline | monolithic agent | 0 | 0 | 0 | +0 input tokens |

Per-turn breakdown for Understanding the build pipeline / monolithic agent

| Turn | Total Tokens | Input | Output | Prep | Latency |
| --- | --- | --- | --- | --- | --- |

| Debugging data fetching | monolithic agent | 0 | 0 | 0 | +0 input tokens |

Per-turn breakdown for Debugging data fetching / monolithic agent

| Turn | Total Tokens | Input | Output | Prep | Latency |
| --- | --- | --- | --- | --- | --- |

| Exploring the routing system | budge | 70026 | 48608 | 3060 | +3612 input tokens |

Per-turn breakdown for Exploring the routing system / budge

| Turn | Total Tokens | Input | Output | Prep | Latency |
| --- | --- | --- | --- | --- | --- |
| 1 | 48608 | 530 | 494 | 47584 | 3.6s |
| 2 | 1668 | 1047 | 621 | 0 | 4.9s |
| 3 | 2073 | 1689 | 384 | 0 | 2.8s |
| 4 | 2498 | 2097 | 401 | 0 | 3.5s |
| 5 | 3031 | 2521 | 510 | 0 | 4.0s |
| 6 | 3525 | 3058 | 467 | 0 | 3.5s |
| 7 | 4114 | 3557 | 557 | 0 | 4.3s |
| 8 | 4509 | 4142 | 367 | 0 | 4.5s |

| Understanding the build pipeline | budge | 34551 | 20837 | 1959 | +2356 input tokens |

Per-turn breakdown for Understanding the build pipeline / budge

| Turn | Total Tokens | Input | Output | Prep | Latency |
| --- | --- | --- | --- | --- | --- |
| 1 | 20837 | 356 | 123 | 20358 | 1.2s |
| 2 | 807 | 499 | 308 | 0 | 2.7s |
| 3 | 1156 | 835 | 321 | 0 | 3.0s |
| 4 | 1549 | 1185 | 364 | 0 | 2.8s |
| 5 | 1892 | 1579 | 313 | 0 | 3.5s |
| 6 | 2367 | 1921 | 446 | 0 | 3.7s |
| 7 | 2684 | 2389 | 295 | 0 | 2.6s |
| 8 | 3259 | 2712 | 547 | 0 | 4.1s |

| Debugging data fetching | budge | 872275 | 845925 | 3764 | +4428 input tokens |

Per-turn breakdown for Debugging data fetching / budge

| Turn | Total Tokens | Input | Output | Prep | Latency |
| --- | --- | --- | --- | --- | --- |
| 1 | 845925 | 675 | 554 | 844696 | 4.5s |
| 2 | 1891 | 1250 | 641 | 0 | 4.8s |
| 3 | 2489 | 1930 | 559 | 0 | 4.1s |
| 4 | 3216 | 2521 | 695 | 0 | 5.0s |
| 5 | 3816 | 3245 | 571 | 0 | 4.9s |
| 6 | 4413 | 3848 | 565 | 0 | 4.7s |
| 7 | 5071 | 4444 | 627 | 0 | 4.8s |
| 8 | 5454 | 5103 | 351 | 0 | 3.8s |

| Exploring the routing system | rag (bm25) | 95418 | 11064 | 12051 | +1769 input tokens |

Per-turn breakdown for Exploring the routing system / rag (bm25)

| Turn | Total Tokens | Input | Output | Prep | Latency |
| --- | --- | --- | --- | --- | --- |
| 1 | 11064 | 10808 | 256 | 0 | 2.4s |
| 2 | 10634 | 10400 | 234 | 0 | 2.7s |
| 3 | 11477 | 11350 | 127 | 0 | 1.7s |
| 4 | 11966 | 11611 | 355 | 0 | 3.5s |
| 5 | 11980 | 11671 | 309 | 0 | 2.8s |
| 6 | 12455 | 12192 | 263 | 0 | 2.6s |
| 7 | 12845 | 12431 | 414 | 0 | 5.1s |
| 8 | 12997 | 12577 | 420 | 0 | 3.1s |

| Understanding the build pipeline | rag (bm25) | 90176 | 9987 | 11456 | +2263 input tokens |

Per-turn breakdown for Understanding the build pipeline / rag (bm25)

| Turn | Total Tokens | Input | Output | Prep | Latency |
| --- | --- | --- | --- | --- | --- |
| 1 | 9987 | 9784 | 203 | 0 | 2.0s |
| 2 | 10185 | 9882 | 303 | 0 | 3.2s |
| 3 | 11788 | 11555 | 233 | 0 | 2.5s |
| 4 | 11735 | 11564 | 171 | 0 | 2.0s |
| 5 | 10825 | 10525 | 300 | 0 | 2.9s |
| 6 | 10563 | 10222 | 341 | 0 | 3.1s |
| 7 | 12522 | 12221 | 301 | 0 | 2.8s |
| 8 | 12571 | 12047 | 524 | 0 | 4.8s |

| Debugging data fetching | rag (bm25) | 108212 | 11072 | 13877 | +2144 input tokens |

Per-turn breakdown for Debugging data fetching / rag (bm25)

| Turn | Total Tokens | Input | Output | Prep | Latency |
| --- | --- | --- | --- | --- | --- |
| 1 | 11072 | 10884 | 188 | 0 | 2.2s |
| 2 | 11256 | 10920 | 336 | 0 | 2.8s |
| 3 | 22895 | 22474 | 421 | 0 | 4.6s |
| 4 | 12276 | 11865 | 411 | 0 | 3.8s |
| 5 | 12490 | 12296 | 194 | 0 | 3.6s |
| 6 | 11758 | 11475 | 283 | 0 | 2.8s |
| 7 | 13225 | 12766 | 459 | 0 | 4.2s |
| 8 | 13240 | 13028 | 212 | 0 | 2.5s |


</details>

## Notes

- This benchmark is directional. The task count is intentionally small and not designed for statistical significance.
- The action model is held constant across baselines so the comparison isolates retrieval and orchestration strategy.
- Billed-equivalent token estimates discount cached tokens by 0.10 for Anthropic-style caching and 0.25 for OpenAI-style caching.
