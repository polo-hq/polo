# LongBench v2 Results

Subset: Budge eval - LongBench v2 hard short/medium subset (48 fit-cap cases)
Configured questions: 48
Observed questions: 48
Action model: openai/gpt-5.4-mini
Date: 2026-04-16

## Run Health

| Metric | Value |
| --- | --- |
| Configured questions | 48 |
| Observed unique questions | 48 |
| Per-question rows | 144 |
| Reportable duration | 2040.5s |
| Export contains per-question rows | yes |

| Provider | Rows | Pass | Fail | Error | Avg tokens | Avg latency |
| --- | --- | --- | --- | --- | --- | --- |
| budge | 48 | 20 | 27 | 1 | 38873 | 35.2s |
| rag (bm25) | 48 | 17 | 30 | 1 | 10467 | 1.1s |
| full-dump | 48 | 17 | 30 | 1 | 119120 | 5.7s |

## Overall

| Metric | Budge | RAG (BM25) | Full-Dump |
| --- | --- | --- | --- |
| Accuracy | 20/48 (41.7%) | 17/48 (35.4%) | 17/48 (35.4%) |
| Errors | 1 | 1 | 1 |
| Avg tokens | 38873 | 10467 | 119120 |
| Avg latency | 35.2s | 1.1s | 5.7s |
| Avg prep | 34.4s | 0.0s | 0.0s |
| Avg action | 0.8s | 1.1s | 5.7s |

## Accuracy By Domain

| Slice | Budge | RAG (BM25) | Full-Dump |
| --- | --- | --- | --- |
| Code Repository Understanding | 0/3 (0.0%) | 1/3 (33.3%) | 2/3 (66.7%) |
| Long In-context Learning | 3/4 (75.0%) | 4/4 (100.0%) | 0/4 (0.0%) |
| Long Structured Data Understanding | 2/5 (40.0%) | 2/5 (40.0%) | 1/5 (20.0%) |
| Long-dialogue History Understanding | 3/6 (50.0%) | 2/6 (33.3%) | 2/6 (33.3%) |
| Multi-Document QA | 3/13 (23.1%) | 3/13 (23.1%) | 6/13 (46.2%) |
| Single-Document QA | 9/17 (52.9%) | 5/17 (29.4%) | 6/17 (35.3%) |

## Accuracy By Difficulty

| Slice | Budge | RAG (BM25) | Full-Dump |
| --- | --- | --- | --- |
| hard | 20/48 (41.7%) | 17/48 (35.4%) | 17/48 (35.4%) |

## Accuracy By Task Type

| Slice | Budge | RAG (BM25) | Full-Dump |
| --- | --- | --- | --- |
| icl-translation | 3/4 (75.0%) | 4/4 (100.0%) | 0/4 (0.0%) |
| multi-hop-qa | 6/14 (42.9%) | 5/14 (35.7%) | 9/14 (64.3%) |
| single-hop-qa | 4/9 (44.4%) | 2/9 (22.2%) | 3/9 (33.3%) |
| structured-code-reasoning | 2/8 (25.0%) | 3/8 (37.5%) | 3/8 (37.5%) |
| summarization-interpretive | 5/13 (38.5%) | 3/13 (23.1%) | 2/13 (15.4%) |

## Budge: Orchestrator vs Action Agent

| Metric | Orchestrator (direct) | Action Agent (handoff) |
| --- | --- | --- |
| Measured rows | 48/48 | 48/48 |
| Accuracy | 11/48 (22.9%) | 20/48 (41.7%) |
| Invalid / missing | 15/48 (31.3%) | 1/48 (2.1%) |
| Agreement | 30/48 (62.5%) | 30/48 (62.5%) |
| Net vs direct | - | +9 (+18.8 pp) |

| Diagnostic | Value |
| --- | --- |
| Rows | 48/48 |
| Both correct | 10/48 (20.8%) |
| Direct-only wins | 1/48 (2.1%) |
| Handoff-only wins | 10/48 (20.8%) |
| Both wrong, same answer | 20/48 (41.7%) |
| Both wrong, different answers | 1/48 (2.1%) |
| Missing direct or handoff | 15/48 (31.3%) |
| Library-risk signal | +9 |

## Budge: Orchestrator vs Action Agent By Task Type

| Task Type | Rows | Direct acc | Handoff acc | Agreement | Direct-only wins | Handoff-only wins | Invalid direct | Invalid handoff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| icl-translation | 4 | 2/4 (50.0%) | 3/4 (75.0%) | 3/4 (75.0%) | 0 | 1 | 1 | 0 |
| multi-hop-qa | 14 | 4/14 (28.6%) | 6/14 (42.9%) | 10/14 (71.4%) | 0 | 2 | 3 | 0 |
| single-hop-qa | 9 | 2/9 (22.2%) | 4/9 (44.4%) | 6/9 (66.7%) | 0 | 2 | 3 | 0 |
| structured-code-reasoning | 8 | 0/8 (0.0%) | 2/8 (25.0%) | 4/8 (50.0%) | 0 | 2 | 3 | 1 |
| summarization-interpretive | 13 | 3/13 (23.1%) | 5/13 (38.5%) | 7/13 (53.8%) | 1 | 3 | 5 | 0 |

## Budge: Orchestrator vs Action Agent By Finish Reason

| Finish Reason | Rows | Direct acc | Handoff acc | Agreement | Direct-only wins | Handoff-only wins | Invalid direct | Invalid handoff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| finish | 28 | 9/28 (32.1%) | 13/28 (46.4%) | 22/28 (78.6%) | 0 | 4 | 6 | 0 |
| no_finish | 19 | 2/19 (10.5%) | 7/19 (36.8%) | 8/19 (42.1%) | 1 | 6 | 8 | 0 |
| unknown | 1 | 0/1 (0.0%) | 0/1 (0.0%) | 0/1 (0.0%) | 0 | 0 | 1 | 1 |

## Budge: Disagreement Examples

### Direct-Only Wins

| ID | Task Type | Finish | Direct | Handoff | Correct | Domain |
| --- | --- | --- | --- | --- | --- | --- |
| 66ebc3165a08c7b9b35deb38 | summarization-interpretive | no_finish | A | C | A | Single-Document QA |

### Handoff-Only Wins

| ID | Task Type | Finish | Direct | Handoff | Correct | Domain |
| --- | --- | --- | --- | --- | --- | --- |
| 66f2a80d821e116aacb2a760 | icl-translation | finish | ? | A | A | Long In-context Learning |
| 66f3c081821e116aacb2e9fa | multi-hop-qa | no_finish | ? | D | D | Multi-Document QA |
| 6723a0a7bb02136c067d7040 | multi-hop-qa | finish | ? | A | A | Single-Document QA |
| 6719185cbb02136c067d40ab | single-hop-qa | no_finish | ? | B | B | Long-dialogue History Understanding |
| 6719b96abb02136c067d4358 | single-hop-qa | no_finish | ? | B | B | Long-dialogue History Understanding |
| 6724c4aabb02136c067d78a6 | structured-code-reasoning | finish | ? | B | B | Long Structured Data Understanding |
| 6724c5febb02136c067d78e7 | structured-code-reasoning | no_finish | D | A | A | Long Structured Data Understanding |
| 66ebd22e5a08c7b9b35e0126 | summarization-interpretive | finish | ? | B | B | Single-Document QA |
| 66ebd2975a08c7b9b35e01e3 | summarization-interpretive | no_finish | ? | C | C | Single-Document QA |
| 66ec2374821e116aacb1b423 | summarization-interpretive | no_finish | ? | B | B | Single-Document QA |

## Budge Finish Reasons By Task Type

| Task Type | Total | finish | no_finish | unknown |
| --- | --- | --- | --- | --- |
| icl-translation | 4 | 3/4 (75.0%) | 1/4 (25.0%) | 0/4 (0.0%) |
| multi-hop-qa | 14 | 7/14 (50.0%) | 7/14 (50.0%) | 0/14 (0.0%) |
| single-hop-qa | 9 | 4/9 (44.4%) | 5/9 (55.6%) | 0/9 (0.0%) |
| structured-code-reasoning | 8 | 5/8 (62.5%) | 2/8 (25.0%) | 1/8 (12.5%) |
| summarization-interpretive | 13 | 9/13 (69.2%) | 4/13 (30.8%) | 0/13 (0.0%) |

## Per-Question Details

| ID | Task Type | Provider | Direct | Predicted | Correct | Finish | Pass | Tokens | Latency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 66eb873c5a08c7b9b35dd849 | multi-hop-qa | budge | D | D | B | finish | no | 50033 | 13.2s |
| 66eb873c5a08c7b9b35dd849 | multi-hop-qa | full-dump | ? | B | B | unknown | yes | 111785 | 3.4s |
| 66eb873c5a08c7b9b35dd849 | multi-hop-qa | rag (bm25) | ? | B | B | unknown | yes | 15976 | 1.2s |
| 66ebc3165a08c7b9b35deb38 | summarization-interpretive | budge | A | C | A | no_finish | no | 25146 | 1138.9s |
| 66ebc3165a08c7b9b35deb38 | summarization-interpretive | full-dump | ? | C | A | unknown | no | 68149 | 2.2s |
| 66ebc3165a08c7b9b35deb38 | summarization-interpretive | rag (bm25) | ? | C | A | unknown | no | 10351 | 1.1s |
| 66ebd22e5a08c7b9b35e0126 | summarization-interpretive | budge | ? | B | B | finish | yes | 12546 | 10.7s |
| 66ebd22e5a08c7b9b35e0126 | summarization-interpretive | full-dump | ? | B | B | unknown | yes | 17451 | 1.4s |
| 66ebd22e5a08c7b9b35e0126 | summarization-interpretive | rag (bm25) | ? | B | B | unknown | yes | 9312 | 0.9s |
| 66ebd2975a08c7b9b35e01e3 | summarization-interpretive | budge | ? | C | C | no_finish | yes | 25382 | 15.8s |
| 66ebd2975a08c7b9b35e01e3 | summarization-interpretive | full-dump | ? | C | C | unknown | yes | 64078 | 2.5s |
| 66ebd2975a08c7b9b35e01e3 | summarization-interpretive | rag (bm25) | ? | C | C | unknown | yes | 10371 | 0.9s |
| 66ebd3ba5a08c7b9b35e0446 | structured-code-reasoning | budge | ? | C | A | no_finish | no | 55446 | 17.4s |
| 66ebd3ba5a08c7b9b35e0446 | structured-code-reasoning | full-dump | ? | A | A | unknown | yes | 114528 | 3.1s |
| 66ebd3ba5a08c7b9b35e0446 | structured-code-reasoning | rag (bm25) | ? | C | A | unknown | no | 10961 | 1.2s |
| 66ebdfb65a08c7b9b35e140a | summarization-interpretive | budge | C | C | C | finish | yes | 28844 | 10.5s |
| 66ebdfb65a08c7b9b35e140a | summarization-interpretive | full-dump | ? | A | C | unknown | no | 96227 | 1.8s |
| 66ebdfb65a08c7b9b35e140a | summarization-interpretive | rag (bm25) | ? | C | C | unknown | yes | 10164 | 1.2s |
| 66ec1aef821e116aacb1aa1a | multi-hop-qa | budge | A | A | C | no_finish | no | 44218 | 14.0s |
| 66ec1aef821e116aacb1aa1a | multi-hop-qa | full-dump | ? | C | C | unknown | yes | 59953 | 1.7s |
| 66ec1aef821e116aacb1aa1a | multi-hop-qa | rag (bm25) | ? | A | C | unknown | no | 10551 | 1.2s |
| 66ec1eb9821e116aacb1af36 | summarization-interpretive | budge | B | B | C | finish | no | 17633 | 10.0s |
| 66ec1eb9821e116aacb1af36 | summarization-interpretive | full-dump | ? | B | C | unknown | no | 128808 | 2.9s |
| 66ec1eb9821e116aacb1af36 | summarization-interpretive | rag (bm25) | ? | B | C | unknown | no | 11099 | 0.9s |
| 66ec2374821e116aacb1b423 | summarization-interpretive | budge | ? | B | B | no_finish | yes | 16314 | 9.4s |
| 66ec2374821e116aacb1b423 | summarization-interpretive | full-dump | ? | C | B | unknown | no | 138060 | 2.5s |
| 66ec2374821e116aacb1b423 | summarization-interpretive | rag (bm25) | ? | C | B | unknown | no | 10127 | 1.0s |
| 66ec2df6821e116aacb1bb7b | icl-translation | budge | C | C | C | finish | yes | 39506 | 11.5s |
| 66ec2df6821e116aacb1bb7b | icl-translation | full-dump | ? | B | C | unknown | no | 100416 | 3.6s |
| 66ec2df6821e116aacb1bb7b | icl-translation | rag (bm25) | ? | C | C | unknown | yes | 9611 | 2.6s |
| 66ecfe1e821e116aacb1e41c | multi-hop-qa | budge | C | C | C | finish | yes | 28224 | 12.9s |
| 66ecfe1e821e116aacb1e41c | multi-hop-qa | full-dump | ? | C | C | unknown | yes | 67151 | 1.6s |
| 66ecfe1e821e116aacb1e41c | multi-hop-qa | rag (bm25) | ? | C | C | unknown | yes | 9730 | 0.9s |
| 66ed168b821e116aacb1ea8c | multi-hop-qa | budge | C | C | C | finish | yes | 16961 | 9.7s |
| 66ed168b821e116aacb1ea8c | multi-hop-qa | full-dump | ? | C | C | unknown | yes | 131680 | 2.3s |
| 66ed168b821e116aacb1ea8c | multi-hop-qa | rag (bm25) | ? | C | C | unknown | yes | 9555 | 0.9s |
| 66ed4274821e116aacb1f8f1 | multi-hop-qa | budge | D | D | D | no_finish | yes | 16499 | 10.9s |
| 66ed4274821e116aacb1f8f1 | multi-hop-qa | full-dump | ? | C | D | unknown | no | 114129 | 2.3s |
| 66ed4274821e116aacb1f8f1 | multi-hop-qa | rag (bm25) | ? | D | D | unknown | yes | 10836 | 0.9s |
| 66ed875e821e116aacb2023e | multi-hop-qa | budge | A | A | A | finish | yes | 31738 | 10.6s |
| 66ed875e821e116aacb2023e | multi-hop-qa | full-dump | ? | C | A | unknown | no | 61148 | 2.0s |
| 66ed875e821e116aacb2023e | multi-hop-qa | rag (bm25) | ? | B | A | unknown | no | 10441 | 0.9s |
| 66efaf70821e116aacb234bd | summarization-interpretive | budge | C | C | D | finish | no | 34667 | 12.1s |
| 66efaf70821e116aacb234bd | summarization-interpretive | full-dump | ? | C | D | unknown | no | 73451 | 2.7s |
| 66efaf70821e116aacb234bd | summarization-interpretive | rag (bm25) | ? | C | D | unknown | no | 9645 | 1.8s |
| 66f016e6821e116aacb25497 | multi-hop-qa | budge | A | C | D | no_finish | no | 40940 | 14.8s |
| 66f016e6821e116aacb25497 | multi-hop-qa | full-dump | ? | D | D | unknown | yes | 107117 | 2.4s |
| 66f016e6821e116aacb25497 | multi-hop-qa | rag (bm25) | ? | B | D | unknown | no | 9702 | 1.1s |
| 66f25a2f821e116aacb28b2f | summarization-interpretive | budge | D | D | D | finish | yes | 17649 | 9.5s |
| 66f25a2f821e116aacb28b2f | summarization-interpretive | full-dump | ? | A | D | unknown | no | 198918 | 3.3s |
| 66f25a2f821e116aacb28b2f | summarization-interpretive | rag (bm25) | ? | A | D | unknown | no | 10561 | 1.0s |
| 66f26c5f821e116aacb2907c | multi-hop-qa | budge | C | C | A | no_finish | no | 35039 | 11.4s |
| 66f26c5f821e116aacb2907c | multi-hop-qa | full-dump | ? | C | A | unknown | no | 105619 | 155.7s |
| 66f26c5f821e116aacb2907c | multi-hop-qa | rag (bm25) | ? | C | A | unknown | no | 9883 | 0.8s |
| 66f2a414821e116aacb2a3af | structured-code-reasoning | budge | C | C | B | finish | no | 16333 | 8.7s |
| 66f2a414821e116aacb2a3af | structured-code-reasoning | full-dump | ? | ? | B | unknown | no | 222209 | 2.0s |
| 66f2a414821e116aacb2a3af | structured-code-reasoning | rag (bm25) | ? | C | B | unknown | no | 10484 | 0.9s |
| 66f2a80d821e116aacb2a760 | icl-translation | budge | ? | A | A | finish | yes | 19353 | 9.7s |
| 66f2a80d821e116aacb2a760 | icl-translation | full-dump | ? | ? | A | unknown | no | 337816 | 2.5s |
| 66f2a80d821e116aacb2a760 | icl-translation | rag (bm25) | ? | A | A | unknown | yes | 12463 | 0.9s |
| 66f2abc5821e116aacb2aab7 | structured-code-reasoning | budge | A | A | C | finish | no | 16559 | 11.5s |
| 66f2abc5821e116aacb2aab7 | structured-code-reasoning | full-dump | ? | ? | C | unknown | no | 235814 | 1.4s |
| 66f2abc5821e116aacb2aab7 | structured-code-reasoning | rag (bm25) | ? | C | C | unknown | yes | 10270 | 1.1s |
| 66f2b11c821e116aacb2aeb6 | summarization-interpretive | budge | ? | B | A | finish | no | 40838 | 12.9s |
| 66f2b11c821e116aacb2aeb6 | summarization-interpretive | full-dump | ? | C | A | unknown | no | 93334 | 2.2s |
| 66f2b11c821e116aacb2aeb6 | summarization-interpretive | rag (bm25) | ? | B | A | unknown | no | 10618 | 1.0s |
| 66f2e874821e116aacb2c0af | structured-code-reasoning | budge | B | B | C | finish | no | 21943 | 9.4s |
| 66f2e874821e116aacb2c0af | structured-code-reasoning | full-dump | ? | C | C | unknown | yes | 176432 | 2.9s |
| 66f2e874821e116aacb2c0af | structured-code-reasoning | rag (bm25) | ? | C | C | unknown | yes | 9169 | 0.8s |
| 66f3c081821e116aacb2e9fa | multi-hop-qa | budge | ? | D | D | no_finish | yes | 41147 | 11.1s |
| 66f3c081821e116aacb2e9fa | multi-hop-qa | full-dump | ? | D | D | unknown | yes | 222479 | 4.9s |
| 66f3c081821e116aacb2e9fa | multi-hop-qa | rag (bm25) | ? | D | D | unknown | yes | 10001 | 1.3s |
| 66f3c219821e116aacb2eb4e | structured-code-reasoning | budge | ? | ? | C | unknown | no | 0 | 0.0s |
| 66f3c219821e116aacb2eb4e | structured-code-reasoning | full-dump | ? | ? | C | unknown | no | 0 | 0.0s |
| 66f3c219821e116aacb2eb4e | structured-code-reasoning | rag (bm25) | ? | ? | C | unknown | no | 0 | 0.0s |
| 66f3c806821e116aacb2ed77 | multi-hop-qa | budge | A | A | C | finish | no | 23690 | 14.4s |
| 66f3c806821e116aacb2ed77 | multi-hop-qa | full-dump | ? | C | C | unknown | yes | 66343 | 1.5s |
| 66f3c806821e116aacb2ed77 | multi-hop-qa | rag (bm25) | ? | A | C | unknown | no | 10292 | 1.3s |
| 66f3dd59821e116aacb2f6ba | multi-hop-qa | budge | D | D | C | no_finish | no | 29755 | 12.9s |
| 66f3dd59821e116aacb2f6ba | multi-hop-qa | full-dump | ? | C | C | unknown | yes | 194808 | 3.5s |
| 66f3dd59821e116aacb2f6ba | multi-hop-qa | rag (bm25) | ? | D | C | unknown | no | 10243 | 0.9s |
| 66f3e473821e116aacb2fa73 | summarization-interpretive | budge | C | C | B | finish | no | 35214 | 12.2s |
| 66f3e473821e116aacb2fa73 | summarization-interpretive | full-dump | ? | C | B | unknown | no | 44622 | 1.3s |
| 66f3e473821e116aacb2fa73 | summarization-interpretive | rag (bm25) | ? | C | B | unknown | no | 9865 | 0.8s |
| 66f3fb15821e116aacb303dc | multi-hop-qa | budge | ? | C | D | no_finish | no | 37065 | 12.7s |
| 66f3fb15821e116aacb303dc | multi-hop-qa | full-dump | ? | A | D | unknown | no | 79664 | 1.5s |
| 66f3fb15821e116aacb303dc | multi-hop-qa | rag (bm25) | ? | A | D | unknown | no | 9870 | 0.9s |
| 66f568dc821e116aacb33995 | summarization-interpretive | budge | D | D | B | no_finish | no | 16904 | 11.0s |
| 66f568dc821e116aacb33995 | summarization-interpretive | full-dump | ? | D | B | unknown | no | 121745 | 2.0s |
| 66f568dc821e116aacb33995 | summarization-interpretive | rag (bm25) | ? | D | B | unknown | no | 10003 | 0.9s |
| 66f6b623bb02136c067c2646 | summarization-interpretive | budge | C | C | A | finish | no | 15094 | 8.0s |
| 66f6b623bb02136c067c2646 | summarization-interpretive | full-dump | ? | C | A | unknown | no | 53032 | 1.4s |
| 66f6b623bb02136c067c2646 | summarization-interpretive | rag (bm25) | ? | C | A | unknown | no | 11466 | 0.8s |
| 66f957e2bb02136c067c51c8 | summarization-interpretive | budge | ? | B | D | finish | no | 18620 | 10.3s |
| 66f957e2bb02136c067c51c8 | summarization-interpretive | full-dump | ? | B | D | unknown | no | 124048 | 4.0s |
| 66f957e2bb02136c067c51c8 | summarization-interpretive | rag (bm25) | ? | B | D | unknown | no | 10807 | 0.8s |
| 670aac92bb02136c067d218a | single-hop-qa | budge | B | B | D | finish | no | 15638 | 8.9s |
| 670aac92bb02136c067d218a | single-hop-qa | full-dump | ? | B | D | unknown | no | 138306 | 4.3s |
| 670aac92bb02136c067d218a | single-hop-qa | rag (bm25) | ? | C | D | unknown | no | 10188 | 2.7s |
| 670bf6ddbb02136c067d2379 | single-hop-qa | budge | A | A | C | no_finish | no | 28127 | 15.1s |
| 670bf6ddbb02136c067d2379 | single-hop-qa | full-dump | ? | A | C | unknown | no | 179690 | 4.2s |
| 670bf6ddbb02136c067d2379 | single-hop-qa | rag (bm25) | ? | A | C | unknown | no | 10752 | 1.5s |
| 670c090bbb02136c067d2404 | single-hop-qa | budge | C | C | C | finish | yes | 48339 | 11.9s |
| 670c090bbb02136c067d2404 | single-hop-qa | full-dump | ? | C | C | unknown | yes | 105914 | 2.6s |
| 670c090bbb02136c067d2404 | single-hop-qa | rag (bm25) | ? | A | C | unknown | no | 9826 | 0.9s |
| 6713066fbb02136c067d3214 | single-hop-qa | budge | C | C | D | finish | no | 77618 | 16.3s |
| 6713066fbb02136c067d3214 | single-hop-qa | full-dump | ? | B | D | unknown | no | 23227 | 1.4s |
| 6713066fbb02136c067d3214 | single-hop-qa | rag (bm25) | ? | B | D | unknown | no | 13292 | 0.9s |
| 67189156bb02136c067d3b8d | single-hop-qa | budge | ? | C | B | no_finish | no | 50354 | 11.1s |
| 67189156bb02136c067d3b8d | single-hop-qa | full-dump | ? | B | B | unknown | yes | 116614 | 4.6s |
| 67189156bb02136c067d3b8d | single-hop-qa | rag (bm25) | ? | B | B | unknown | yes | 9293 | 1.0s |
| 6718a43fbb02136c067d3ca8 | single-hop-qa | budge | B | B | B | finish | yes | 15465 | 11.6s |
| 6718a43fbb02136c067d3ca8 | single-hop-qa | full-dump | ? | B | B | unknown | yes | 117162 | 1.9s |
| 6718a43fbb02136c067d3ca8 | single-hop-qa | rag (bm25) | ? | B | B | unknown | yes | 9532 | 1.7s |
| 6719185cbb02136c067d40ab | single-hop-qa | budge | ? | B | B | no_finish | yes | 33656 | 10.3s |
| 6719185cbb02136c067d40ab | single-hop-qa | full-dump | ? | A | B | unknown | no | 118019 | 2.4s |
| 6719185cbb02136c067d40ab | single-hop-qa | rag (bm25) | ? | A | B | unknown | no | 9408 | 0.9s |
| 6719b96abb02136c067d4358 | single-hop-qa | budge | ? | B | B | no_finish | yes | 37077 | 8.4s |
| 6719b96abb02136c067d4358 | single-hop-qa | full-dump | ? | D | B | unknown | no | 34056 | 1.0s |
| 6719b96abb02136c067d4358 | single-hop-qa | rag (bm25) | ? | D | B | unknown | no | 11946 | 0.8s |
| 6719b9f1bb02136c067d4389 | single-hop-qa | budge | C | C | A | no_finish | no | 74188 | 12.2s |
| 6719b9f1bb02136c067d4389 | single-hop-qa | full-dump | ? | B | A | unknown | no | 23418 | 1.2s |
| 6719b9f1bb02136c067d4389 | single-hop-qa | rag (bm25) | ? | D | A | unknown | no | 13344 | 1.1s |
| 6723a0a7bb02136c067d7040 | multi-hop-qa | budge | ? | A | A | finish | yes | 47309 | 13.1s |
| 6723a0a7bb02136c067d7040 | multi-hop-qa | full-dump | ? | A | A | unknown | yes | 125757 | 3.4s |
| 6723a0a7bb02136c067d7040 | multi-hop-qa | rag (bm25) | ? | B | A | unknown | no | 10867 | 0.8s |
| 6723a63bbb02136c067d71a1 | multi-hop-qa | budge | B | B | D | finish | no | 77135 | 14.3s |
| 6723a63bbb02136c067d71a1 | multi-hop-qa | full-dump | ? | B | D | unknown | no | 168985 | 2.8s |
| 6723a63bbb02136c067d71a1 | multi-hop-qa | rag (bm25) | ? | B | D | unknown | no | 11162 | 0.9s |
| 6724c4aabb02136c067d78a6 | structured-code-reasoning | budge | ? | B | B | finish | yes | 55990 | 14.9s |
| 6724c4aabb02136c067d78a6 | structured-code-reasoning | full-dump | ? | C | B | unknown | no | 130348 | 2.3s |
| 6724c4aabb02136c067d78a6 | structured-code-reasoning | rag (bm25) | ? | C | B | unknown | no | 12417 | 1.4s |
| 6724c5febb02136c067d78e7 | structured-code-reasoning | budge | D | A | A | no_finish | yes | 309462 | 26.9s |
| 6724c5febb02136c067d78e7 | structured-code-reasoning | full-dump | ? | ? | A | unknown | no | 261504 | 2.1s |
| 6724c5febb02136c067d78e7 | structured-code-reasoning | rag (bm25) | ? | B | A | unknown | no | 12819 | 0.9s |
| 6725d7a9bb02136c067d822d | icl-translation | budge | A | A | A | finish | yes | 62674 | 11.1s |
| 6725d7a9bb02136c067d822d | icl-translation | full-dump | ? | C | A | unknown | no | 146530 | 2.3s |
| 6725d7a9bb02136c067d822d | icl-translation | rag (bm25) | ? | A | A | unknown | yes | 10578 | 0.9s |
| 6725d8dbbb02136c067d8309 | icl-translation | budge | A | A | C | no_finish | no | 38629 | 9.4s |
| 6725d8dbbb02136c067d8309 | icl-translation | full-dump | ? | A | C | unknown | no | 146568 | 3.1s |
| 6725d8dbbb02136c067d8309 | icl-translation | rag (bm25) | ? | C | C | unknown | yes | 10354 | 1.0s |
| 67285f8ebb02136c067d905d | structured-code-reasoning | budge | B | B | C | finish | no | 24919 | 7.9s |
| 67285f8ebb02136c067d905d | structured-code-reasoning | full-dump | ? | C | C | unknown | yes | 150645 | 4.7s |
| 67285f8ebb02136c067d905d | structured-code-reasoning | rag (bm25) | ? | C | C | unknown | yes | 12189 | 1.7s |

## Notes

- Accuracy is exact-match on the predicted answer letter.
- Budge comparison uses `directAnswer` from the orchestrator and `handoffAnswer` from the action agent output.
- If direct accuracy materially exceeds handoff accuracy, the library handoff is likely dropping signal; if both are similarly low, exploration or model choice is the more likely bottleneck.
- Run Health falls back to provider aggregates when a promptfoo export omits per-question rows.
