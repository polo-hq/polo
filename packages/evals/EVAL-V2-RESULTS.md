# Budge Benchmark Results

Corpus: Next.js (vercel/next.js @ commit 92b0789be78183faba91c0e6f054cce26010cd4b), filtered to packages/next/src
Models: openai/gpt-5.4-mini for all baselines (action agent identical across comparisons)
Date: 2026-04-15

## Cross-Source Synthesis (5 tasks)

| Metric                  | Budge  | RAG (BM25) | Monolithic Agent |
| ----------------------- | ------ | ---------- | ---------------- |
| Avg quality score       | 0.83   | 0.82       | 0.59             |
| Pass rate               | 3/5    | 3/5        | 3/5              |
| Avg billed-equiv tokens | 174806 | 8313       | 19126            |
| Avg latency             | 53.8s  | 8.3s       | 18.9s            |
| P95 latency             | 71.9s  | 9.8s       | 51.3s            |
| Avg tool calls          | 16.20  | n/a        | 18.33            |

<details>
<summary>Cross-Source Synthesis details</summary>

| Task                                                                                | Provider         | Score | Pass | Tokens | Latency |
| ----------------------------------------------------------------------------------- | ---------------- | ----- | ---- | ------ | ------- |
| Synthesis: How does Next.js's App Router handle the transition from a Server Com... | budge            | 1.00  | yes  | 91297  | 71.9s   |
| Synthesis: Explain how Next.js middleware, edge runtime, and the router interact... | budge            | 0.55  | no   | 25999  | 40.9s   |
| Synthesis: How does Next.js implement partial prerendering? Trace from the build... | budge            | 0.68  | no   | 620567 | 71.6s   |
| Synthesis: Compare how errors propagate in the App Router (error.tsx, global-err... | budge            | 0.92  | yes  | 26138  | 30.2s   |
| Synthesis: How does the Next.js image optimization pipeline work end-to-end? Tra... | budge            | 1.00  | yes  | 110030 | 54.4s   |
| Synthesis: How does Next.js's App Router handle the transition from a Server Com... | rag (bm25)       | 0.98  | yes  | 10845  | 8.8s    |
| Synthesis: Explain how Next.js middleware, edge runtime, and the router interact... | rag (bm25)       | 0.55  | no   | 11322  | 8.8s    |
| Synthesis: How does Next.js implement partial prerendering? Trace from the build... | rag (bm25)       | 0.92  | yes  | 11046  | 9.8s    |
| Synthesis: Compare how errors propagate in the App Router (error.tsx, global-err... | rag (bm25)       | 0.86  | yes  | 11345  | 5.1s    |
| Synthesis: How does the Next.js image optimization pipeline work end-to-end? Tra... | rag (bm25)       | 0.78  | no   | 11601  | 8.8s    |
| Synthesis: How does Next.js's App Router handle the transition from a Server Com... | monolithic agent | 1.00  | yes  | 59720  | 23.7s   |
| Synthesis: Explain how Next.js middleware, edge runtime, and the router interact... | monolithic agent | 0.00  | no   | 0      | 0.0s    |
| Synthesis: How does Next.js implement partial prerendering? Trace from the build... | monolithic agent | 0.99  | yes  | 141817 | 51.3s   |
| Synthesis: Compare how errors propagate in the App Router (error.tsx, global-err... | monolithic agent | 0.97  | yes  | 42317  | 19.6s   |
| Synthesis: How does the Next.js image optimization pipeline work end-to-end? Tra... | monolithic agent | 0.00  | no   | 0      | 0.0s    |

</details>

## Targeted Lookup (5 tasks)

| Metric                  | Budge  | RAG (BM25) | Monolithic Agent |
| ----------------------- | ------ | ---------- | ---------------- |
| Avg quality score       | 0.74   | 1.00       | 0.20             |
| Pass rate               | 3/5    | 5/5        | 1/5              |
| Avg billed-equiv tokens | 104466 | 10388      | 839              |
| Avg latency             | 40.6s  | 3.1s       | 2.4s             |
| P95 latency             | 87.9s  | 4.2s       | 11.8s            |
| Avg tool calls          | 22.75  | n/a        | 9.00             |

<details>
<summary>Targeted Lookup details</summary>

| Task                                                                             | Provider         | Score | Pass | Tokens | Latency |
| -------------------------------------------------------------------------------- | ---------------- | ----- | ---- | ------ | ------- |
| Lookup: What is the maximum number of dynamic route parameters Next.js suppor... | monolithic agent | 0.00  | no   | 0      | 0.0s    |
| Lookup: Find the default configuration for the Next.js image optimization loa... | monolithic agent | 0.00  | no   | 0      | 0.0s    |
| Lookup: Where in the Next.js source is the 'use server' directive parsed and ... | monolithic agent | 1.00  | yes  | 13409  | 11.8s   |
| Lookup: What HTTP headers does Next.js set by default on static assets served... | monolithic agent | 0.00  | no   | 0      | 0.0s    |
| Lookup: How does Next.js detect whether a page component is async (Server Com... | monolithic agent | 0.00  | no   | 0      | 0.0s    |
| Lookup: What is the maximum number of dynamic route parameters Next.js suppor... | budge            | 1.00  | yes  | 98208  | 56.3s   |
| Lookup: Find the default configuration for the Next.js image optimization loa... | budge            | 1.00  | yes  | 18280  | 17.6s   |
| Lookup: Where in the Next.js source is the 'use server' directive parsed and ... | budge            | 0.72  | no   | 343471 | 87.9s   |
| Lookup: What HTTP headers does Next.js set by default on static assets served... | budge            | 1.00  | yes  | 62369  | 41.0s   |
| Lookup: How does Next.js detect whether a page component is async (Server Com... | budge            | 0.00  | no   | 0      | 0.0s    |
| Lookup: What is the maximum number of dynamic route parameters Next.js suppor... | rag (bm25)       | 1.00  | yes  | 10725  | 2.1s    |
| Lookup: Find the default configuration for the Next.js image optimization loa... | rag (bm25)       | 1.00  | yes  | 10117  | 2.9s    |
| Lookup: Where in the Next.js source is the 'use server' directive parsed and ... | rag (bm25)       | 1.00  | yes  | 9877   | 3.1s    |
| Lookup: What HTTP headers does Next.js set by default on static assets served... | rag (bm25)       | 1.00  | yes  | 10490  | 3.1s    |
| Lookup: How does Next.js detect whether a page component is async (Server Com... | rag (bm25)       | 1.00  | yes  | 10732  | 4.2s    |

</details>

## Chat Amortization (3 scenarios x 5 turns)

| Metric                         | Budge  | RAG (BM25) | Monolithic Agent |
| ------------------------------ | ------ | ---------- | ---------------- |
| Avg session cost (tokens)      | 78723  | 98424      | 0                |
| Turn 1 avg cost                | 58665  | 10733      | 0                |
| Turn 2-5 avg cost              | 2866   | 12527      | NaN              |
| Amortization ratio             | 20.47x | 0.86x      | n/a              |
| Avg quality (across all turns) | 0.93   | 0.98       | 0.00             |

<details>
<summary>Chat details</summary>

| Scenario                     | Provider         | Session Tokens | Turn 1 | Turn 2-5 Avg | Context Growth  |
| ---------------------------- | ---------------- | -------------- | ------ | ------------ | --------------- |
| Exploring the routing system | monolithic agent | 0              | 0      | 0            | +0 input tokens |

Per-turn breakdown for Exploring the routing system / monolithic agent

| Turn | Total Tokens | Input | Output | Prep | Latency |
| ---- | ------------ | ----- | ------ | ---- | ------- |

| Understanding the build pipeline | monolithic agent | 0 | 0 | 0 | +0 input tokens |

Per-turn breakdown for Understanding the build pipeline / monolithic agent

| Turn | Total Tokens | Input | Output | Prep | Latency |
| ---- | ------------ | ----- | ------ | ---- | ------- |

| Debugging data fetching | monolithic agent | 0 | 0 | 0 | +0 input tokens |

Per-turn breakdown for Debugging data fetching / monolithic agent

| Turn | Total Tokens | Input | Output | Prep | Latency |
| ---- | ------------ | ----- | ------ | ---- | ------- |

| Exploring the routing system | budge | 110468 | 90492 | 2854 | +3300 input tokens |

Per-turn breakdown for Exploring the routing system / budge

| Turn | Total Tokens | Input | Output | Prep  | Latency |
| ---- | ------------ | ----- | ------ | ----- | ------- |
| 1    | 90492        | 588   | 377    | 89527 | 3.3s    |
| 2    | 1491         | 988   | 503    | 0     | 4.3s    |
| 3    | 1899         | 1512  | 387    | 0     | 3.1s    |
| 4    | 2370         | 1923  | 447    | 0     | 6.1s    |
| 5    | 2790         | 2393  | 397    | 0     | 3.7s    |
| 6    | 3233         | 2817  | 416    | 0     | 3.4s    |
| 7    | 3860         | 3265  | 595    | 0     | 5.2s    |
| 8    | 4333         | 3888  | 445    | 0     | 3.9s    |

| Understanding the build pipeline | budge | 78489 | 62019 | 2353 | +2755 input tokens |

Per-turn breakdown for Understanding the build pipeline / budge

| Turn | Total Tokens | Input | Output | Prep  | Latency |
| ---- | ------------ | ----- | ------ | ----- | ------- |
| 1    | 62019        | 412   | 250    | 61357 | 2.2s    |
| 2    | 1062         | 682   | 380    | 0     | 3.7s    |
| 3    | 1466         | 1090  | 376    | 0     | 3.8s    |
| 4    | 1943         | 1495  | 448    | 0     | 4.1s    |
| 5    | 2364         | 1973  | 391    | 0     | 4.2s    |
| 6    | 2837         | 2393  | 444    | 0     | 5.4s    |
| 7    | 3139         | 2859  | 280    | 0     | 3.3s    |
| 8    | 3659         | 3167  | 492    | 0     | 5.3s    |

| Debugging data fetching | budge | 47213 | 23483 | 3390 | +4117 input tokens |

Per-turn breakdown for Debugging data fetching / budge

| Turn | Total Tokens | Input | Output | Prep  | Latency |
| ---- | ------------ | ----- | ------ | ----- | ------- |
| 1    | 23483        | 530   | 462    | 22491 | 6.1s    |
| 2    | 1632         | 1013  | 619    | 0     | 12.2s   |
| 3    | 2161         | 1671  | 490    | 0     | 10.5s   |
| 4    | 2869         | 2193  | 676    | 0     | 6.2s    |
| 5    | 3457         | 2898  | 559    | 0     | 8.5s    |
| 6    | 4069         | 3489  | 580    | 0     | 9.9s    |
| 7    | 4615         | 4100  | 515    | 0     | 12.7s   |
| 8    | 4927         | 4647  | 280    | 0     | 2.7s    |

| Exploring the routing system | rag (bm25) | 94199 | 11059 | 11877 | +1517 input tokens |

Per-turn breakdown for Exploring the routing system / rag (bm25)

| Turn | Total Tokens | Input | Output | Prep | Latency |
| ---- | ------------ | ----- | ------ | ---- | ------- |
| 1    | 11059        | 10808 | 251    | 0    | 2.9s    |
| 2    | 10581        | 10395 | 186    | 0    | 3.8s    |
| 3    | 11421        | 11297 | 124    | 0    | 2.1s    |
| 4    | 11834        | 11555 | 279    | 0    | 2.9s    |
| 5    | 11751        | 11539 | 212    | 0    | 2.5s    |
| 6    | 12204        | 11963 | 241    | 0    | 2.7s    |
| 7    | 12593        | 12180 | 413    | 0    | 4.5s    |
| 8    | 12756        | 12325 | 431    | 0    | 7.0s    |

| Understanding the build pipeline | rag (bm25) | 90519 | 9969 | 11507 | +2495 input tokens |

Per-turn breakdown for Understanding the build pipeline / rag (bm25)

| Turn | Total Tokens | Input | Output | Prep | Latency |
| ---- | ------------ | ----- | ------ | ---- | ------- |
| 1    | 9969         | 9784  | 185    | 0    | 2.9s    |
| 2    | 10074        | 9864  | 210    | 0    | 2.8s    |
| 3    | 11656        | 11444 | 212    | 0    | 8.3s    |
| 4    | 11698        | 11432 | 266    | 0    | 16.0s   |
| 5    | 10946        | 10488 | 458    | 0    | 5.3s    |
| 6    | 10695        | 10343 | 352    | 0    | 3.4s    |
| 7    | 12754        | 12353 | 401    | 0    | 3.5s    |
| 8    | 12727        | 12279 | 448    | 0    | 5.1s    |

| Debugging data fetching | rag (bm25) | 110553 | 11172 | 14197 | +2566 input tokens |

Per-turn breakdown for Debugging data fetching / rag (bm25)

| Turn | Total Tokens | Input | Output | Prep | Latency |
| ---- | ------------ | ----- | ------ | ---- | ------- |
| 1    | 11172        | 10884 | 288    | 0    | 7.0s    |
| 2    | 11372        | 11014 | 358    | 0    | 3.2s    |
| 3    | 23058        | 22590 | 468    | 0    | 3.9s    |
| 4    | 12594        | 12028 | 566    | 0    | 4.4s    |
| 5    | 12848        | 12614 | 234    | 0    | 2.2s    |
| 6    | 12154        | 11833 | 321    | 0    | 3.3s    |
| 7    | 13647        | 13162 | 485    | 0    | 4.2s    |
| 8    | 13708        | 13450 | 258    | 0    | 2.7s    |

</details>

## Notes

- This benchmark is directional. The task count is intentionally small and not designed for statistical significance.
- The action model is held constant across baselines so the comparison isolates retrieval and orchestration strategy.
- Billed-equivalent token estimates discount cached tokens by 0.10 for Anthropic-style caching and 0.25 for OpenAI-style caching.
