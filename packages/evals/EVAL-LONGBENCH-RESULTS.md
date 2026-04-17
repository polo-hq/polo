# LongBench v2 Results

Subset: Budge eval - LongBench v2 hard short/medium subset (48 fit-cap cases)
Configured questions: 48
Observed questions: 48
Action model: openai/gpt-5.4-mini
Date: 2026-04-17

## Run Health

| Metric | Value |
| --- | --- |
| Configured questions | 48 |
| Observed unique questions | 48 |
| Per-question rows | 144 |
| Reportable duration | 590.5s |
| Export contains per-question rows | yes |

| Provider | Rows | Pass | Fail | Error | Avg tokens | Avg latency |
| --- | --- | --- | --- | --- | --- | --- |
| budge | 48 | 21 | 26 | 1 | 29958 | 9.0s |
| rag (bm25) | 48 | 20 | 27 | 1 | 10467 | 0.9s |
| full-dump | 48 | 19 | 28 | 1 | 119120 | 2.0s |

## Overall

| Metric | Budge | RAG (BM25) | Full-Dump |
| --- | --- | --- | --- |
| Accuracy | 21/48 (43.8%) | 20/48 (41.7%) | 19/48 (39.6%) |
| Errors | 1 | 1 | 1 |
| Avg tokens | 29958 | 10467 | 119120 |
| Avg latency | 9.0s | 0.9s | 2.0s |
| Avg prep | 8.4s | 0.0s | 0.0s |
| Avg action | 0.6s | 0.9s | 2.0s |

## Accuracy By Domain

| Slice | Budge | RAG (BM25) | Full-Dump |
| --- | --- | --- | --- |
| Code Repository Understanding | 1/3 (33.3%) | 1/3 (33.3%) | 2/3 (66.7%) |
| Long In-context Learning | 1/4 (25.0%) | 3/4 (75.0%) | 2/4 (50.0%) |
| Long Structured Data Understanding | 2/5 (40.0%) | 3/5 (60.0%) | 1/5 (20.0%) |
| Long-dialogue History Understanding | 2/6 (33.3%) | 3/6 (50.0%) | 1/6 (16.7%) |
| Multi-Document QA | 7/13 (53.8%) | 4/13 (30.8%) | 6/13 (46.2%) |
| Single-Document QA | 8/17 (47.1%) | 6/17 (35.3%) | 7/17 (41.2%) |

## Accuracy By Difficulty

| Slice | Budge | RAG (BM25) | Full-Dump |
| --- | --- | --- | --- |
| hard | 21/48 (43.8%) | 20/48 (41.7%) | 19/48 (39.6%) |

## Accuracy By Task Type

| Slice | Budge | RAG (BM25) | Full-Dump |
| --- | --- | --- | --- |
| icl-translation | 1/4 (25.0%) | 3/4 (75.0%) | 2/4 (50.0%) |
| multi-hop-qa | 9/14 (64.3%) | 6/14 (42.9%) | 10/14 (71.4%) |
| single-hop-qa | 2/9 (22.2%) | 3/9 (33.3%) | 2/9 (22.2%) |
| structured-code-reasoning | 3/8 (37.5%) | 4/8 (50.0%) | 3/8 (37.5%) |
| summarization-interpretive | 6/13 (46.2%) | 4/13 (30.8%) | 2/13 (15.4%) |

## Budge: Orchestrator vs Action Agent

| Metric | Orchestrator (direct) | Action Agent (handoff) |
| --- | --- | --- |
| Measured rows | 48/48 | 48/48 |
| Accuracy | 21/48 (43.8%) | 21/48 (43.8%) |
| Invalid / missing | 1/48 (2.1%) | 1/48 (2.1%) |
| Agreement | 47/48 (97.9%) | 47/48 (97.9%) |
| Net vs direct | - | +0 (+0.0 pp) |

| Diagnostic | Value |
| --- | --- |
| Rows | 48/48 |
| Both correct | 21/48 (43.8%) |
| Direct-only wins | 0/48 (0.0%) |
| Handoff-only wins | 0/48 (0.0%) |
| Both wrong, same answer | 26/48 (54.2%) |
| Both wrong, different answers | 0/48 (0.0%) |
| Missing direct or handoff | 1/48 (2.1%) |
| Library-risk signal | +0 |

## Budge: Orchestrator vs Action Agent By Task Type

| Task Type | Rows | Direct acc | Handoff acc | Agreement | Direct-only wins | Handoff-only wins | Invalid direct | Invalid handoff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| icl-translation | 4 | 1/4 (25.0%) | 1/4 (25.0%) | 4/4 (100.0%) | 0 | 0 | 0 | 0 |
| multi-hop-qa | 14 | 9/14 (64.3%) | 9/14 (64.3%) | 14/14 (100.0%) | 0 | 0 | 0 | 0 |
| single-hop-qa | 9 | 2/9 (22.2%) | 2/9 (22.2%) | 9/9 (100.0%) | 0 | 0 | 0 | 0 |
| structured-code-reasoning | 8 | 3/8 (37.5%) | 3/8 (37.5%) | 7/8 (87.5%) | 0 | 0 | 1 | 1 |
| summarization-interpretive | 13 | 6/13 (46.2%) | 6/13 (46.2%) | 13/13 (100.0%) | 0 | 0 | 0 | 0 |

## Budge: Orchestrator vs Action Agent By Finish Reason

| Finish Reason | Rows | Direct acc | Handoff acc | Agreement | Direct-only wins | Handoff-only wins | Invalid direct | Invalid handoff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| finish | 15 | 7/15 (46.7%) | 7/15 (46.7%) | 15/15 (100.0%) | 0 | 0 | 0 | 0 |
| no_finish | 32 | 14/32 (43.8%) | 14/32 (43.8%) | 32/32 (100.0%) | 0 | 0 | 0 | 0 |
| unknown | 1 | 0/1 (0.0%) | 0/1 (0.0%) | 0/1 (0.0%) | 0 | 0 | 1 | 1 |

## Budge: Disagreement Examples

### Direct-Only Wins

None.

### Handoff-Only Wins

None.

## Budge Finish Reasons By Task Type

| Task Type | Total | finish | no_finish | unknown |
| --- | --- | --- | --- | --- |
| icl-translation | 4 | 0/4 (0.0%) | 4/4 (100.0%) | 0/4 (0.0%) |
| multi-hop-qa | 14 | 6/14 (42.9%) | 8/14 (57.1%) | 0/14 (0.0%) |
| single-hop-qa | 9 | 4/9 (44.4%) | 5/9 (55.6%) | 0/9 (0.0%) |
| structured-code-reasoning | 8 | 2/8 (25.0%) | 5/8 (62.5%) | 1/8 (12.5%) |
| summarization-interpretive | 13 | 3/13 (23.1%) | 10/13 (76.9%) | 0/13 (0.0%) |

## Per-Question Details

| ID | Task Type | Provider | Direct | Predicted | Correct | Finish | Pass | Tokens | Latency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 66eb873c5a08c7b9b35dd849 | multi-hop-qa | budge | B | B | B | no_finish | yes | 36493 | 14.0s |
| 66eb873c5a08c7b9b35dd849 | multi-hop-qa | full-dump | ? | B | B | unknown | yes | 111785 | 1.5s |
| 66eb873c5a08c7b9b35dd849 | multi-hop-qa | rag (bm25) | ? | B | B | unknown | yes | 15976 | 0.8s |
| 66ebc3165a08c7b9b35deb38 | summarization-interpretive | budge | C | C | A | no_finish | no | 30039 | 10.1s |
| 66ebc3165a08c7b9b35deb38 | summarization-interpretive | full-dump | ? | C | A | unknown | no | 68149 | 2.4s |
| 66ebc3165a08c7b9b35deb38 | summarization-interpretive | rag (bm25) | ? | C | A | unknown | no | 10351 | 0.8s |
| 66ebd22e5a08c7b9b35e0126 | summarization-interpretive | budge | B | B | B | no_finish | yes | 14508 | 7.7s |
| 66ebd22e5a08c7b9b35e0126 | summarization-interpretive | full-dump | ? | B | B | unknown | yes | 17451 | 0.8s |
| 66ebd22e5a08c7b9b35e0126 | summarization-interpretive | rag (bm25) | ? | B | B | unknown | yes | 9312 | 0.8s |
| 66ebd2975a08c7b9b35e01e3 | summarization-interpretive | budge | C | C | C | finish | yes | 16861 | 8.5s |
| 66ebd2975a08c7b9b35e01e3 | summarization-interpretive | full-dump | ? | C | C | unknown | yes | 64078 | 1.2s |
| 66ebd2975a08c7b9b35e01e3 | summarization-interpretive | rag (bm25) | ? | C | C | unknown | yes | 10371 | 0.9s |
| 66ebd3ba5a08c7b9b35e0446 | structured-code-reasoning | budge | A | A | A | no_finish | yes | 19536 | 10.1s |
| 66ebd3ba5a08c7b9b35e0446 | structured-code-reasoning | full-dump | ? | A | A | unknown | yes | 114528 | 2.3s |
| 66ebd3ba5a08c7b9b35e0446 | structured-code-reasoning | rag (bm25) | ? | A | A | unknown | yes | 10961 | 1.8s |
| 66ebdfb65a08c7b9b35e140a | summarization-interpretive | budge | C | C | C | no_finish | yes | 38020 | 11.0s |
| 66ebdfb65a08c7b9b35e140a | summarization-interpretive | full-dump | ? | A | C | unknown | no | 96227 | 1.9s |
| 66ebdfb65a08c7b9b35e140a | summarization-interpretive | rag (bm25) | ? | C | C | unknown | yes | 10164 | 0.8s |
| 66ec1aef821e116aacb1aa1a | multi-hop-qa | budge | C | C | C | no_finish | yes | 38196 | 13.4s |
| 66ec1aef821e116aacb1aa1a | multi-hop-qa | full-dump | ? | C | C | unknown | yes | 59953 | 2.6s |
| 66ec1aef821e116aacb1aa1a | multi-hop-qa | rag (bm25) | ? | C | C | unknown | yes | 10551 | 0.8s |
| 66ec1eb9821e116aacb1af36 | summarization-interpretive | budge | B | B | C | no_finish | no | 14115 | 6.5s |
| 66ec1eb9821e116aacb1af36 | summarization-interpretive | full-dump | ? | B | C | unknown | no | 128808 | 1.9s |
| 66ec1eb9821e116aacb1af36 | summarization-interpretive | rag (bm25) | ? | B | C | unknown | no | 11099 | 0.7s |
| 66ec2374821e116aacb1b423 | summarization-interpretive | budge | B | B | B | no_finish | yes | 36244 | 8.7s |
| 66ec2374821e116aacb1b423 | summarization-interpretive | full-dump | ? | C | B | unknown | no | 138060 | 1.8s |
| 66ec2374821e116aacb1b423 | summarization-interpretive | rag (bm25) | ? | C | B | unknown | no | 10127 | 0.8s |
| 66ec2df6821e116aacb1bb7b | icl-translation | budge | A | A | C | no_finish | no | 25294 | 8.3s |
| 66ec2df6821e116aacb1bb7b | icl-translation | full-dump | ? | C | C | unknown | yes | 100416 | 1.7s |
| 66ec2df6821e116aacb1bb7b | icl-translation | rag (bm25) | ? | C | C | unknown | yes | 9611 | 0.8s |
| 66ecfe1e821e116aacb1e41c | multi-hop-qa | budge | A | A | C | finish | no | 16227 | 7.4s |
| 66ecfe1e821e116aacb1e41c | multi-hop-qa | full-dump | ? | C | C | unknown | yes | 67151 | 3.0s |
| 66ecfe1e821e116aacb1e41c | multi-hop-qa | rag (bm25) | ? | C | C | unknown | yes | 9730 | 0.8s |
| 66ed168b821e116aacb1ea8c | multi-hop-qa | budge | C | C | C | no_finish | yes | 30996 | 9.2s |
| 66ed168b821e116aacb1ea8c | multi-hop-qa | full-dump | ? | C | C | unknown | yes | 131680 | 2.2s |
| 66ed168b821e116aacb1ea8c | multi-hop-qa | rag (bm25) | ? | C | C | unknown | yes | 9555 | 0.7s |
| 66ed4274821e116aacb1f8f1 | multi-hop-qa | budge | C | C | D | no_finish | no | 21319 | 8.0s |
| 66ed4274821e116aacb1f8f1 | multi-hop-qa | full-dump | ? | B | D | unknown | no | 114129 | 1.7s |
| 66ed4274821e116aacb1f8f1 | multi-hop-qa | rag (bm25) | ? | D | D | unknown | yes | 10836 | 0.7s |
| 66ed875e821e116aacb2023e | multi-hop-qa | budge | A | A | A | finish | yes | 37028 | 10.2s |
| 66ed875e821e116aacb2023e | multi-hop-qa | full-dump | ? | C | A | unknown | no | 61148 | 2.6s |
| 66ed875e821e116aacb2023e | multi-hop-qa | rag (bm25) | ? | B | A | unknown | no | 10441 | 0.7s |
| 66efaf70821e116aacb234bd | summarization-interpretive | budge | C | C | D | finish | no | 34457 | 9.6s |
| 66efaf70821e116aacb234bd | summarization-interpretive | full-dump | ? | C | D | unknown | no | 73451 | 1.3s |
| 66efaf70821e116aacb234bd | summarization-interpretive | rag (bm25) | ? | C | D | unknown | no | 9645 | 0.8s |
| 66f016e6821e116aacb25497 | multi-hop-qa | budge | D | D | D | finish | yes | 30312 | 9.4s |
| 66f016e6821e116aacb25497 | multi-hop-qa | full-dump | ? | D | D | unknown | yes | 107117 | 1.9s |
| 66f016e6821e116aacb25497 | multi-hop-qa | rag (bm25) | ? | B | D | unknown | no | 9702 | 0.8s |
| 66f25a2f821e116aacb28b2f | summarization-interpretive | budge | B | B | D | no_finish | no | 17565 | 7.2s |
| 66f25a2f821e116aacb28b2f | summarization-interpretive | full-dump | ? | A | D | unknown | no | 198918 | 2.5s |
| 66f25a2f821e116aacb28b2f | summarization-interpretive | rag (bm25) | ? | A | D | unknown | no | 10561 | 0.8s |
| 66f26c5f821e116aacb2907c | multi-hop-qa | budge | C | C | A | finish | no | 23204 | 8.5s |
| 66f26c5f821e116aacb2907c | multi-hop-qa | full-dump | ? | C | A | unknown | no | 105619 | 2.0s |
| 66f26c5f821e116aacb2907c | multi-hop-qa | rag (bm25) | ? | C | A | unknown | no | 9883 | 0.7s |
| 66f2a414821e116aacb2a3af | structured-code-reasoning | budge | C | C | B | finish | no | 9614 | 6.2s |
| 66f2a414821e116aacb2a3af | structured-code-reasoning | full-dump | ? | ? | B | unknown | no | 222209 | 1.5s |
| 66f2a414821e116aacb2a3af | structured-code-reasoning | rag (bm25) | ? | C | B | unknown | no | 10484 | 1.1s |
| 66f2a80d821e116aacb2a760 | icl-translation | budge | A | A | A | no_finish | yes | 33676 | 10.7s |
| 66f2a80d821e116aacb2a760 | icl-translation | full-dump | ? | ? | A | unknown | no | 337816 | 2.3s |
| 66f2a80d821e116aacb2a760 | icl-translation | rag (bm25) | ? | A | A | unknown | yes | 12463 | 0.8s |
| 66f2abc5821e116aacb2aab7 | structured-code-reasoning | budge | B | B | C | no_finish | no | 29687 | 7.5s |
| 66f2abc5821e116aacb2aab7 | structured-code-reasoning | full-dump | ? | ? | C | unknown | no | 235814 | 1.9s |
| 66f2abc5821e116aacb2aab7 | structured-code-reasoning | rag (bm25) | ? | C | C | unknown | yes | 10270 | 0.6s |
| 66f2b11c821e116aacb2aeb6 | summarization-interpretive | budge | A | A | A | no_finish | yes | 21502 | 8.4s |
| 66f2b11c821e116aacb2aeb6 | summarization-interpretive | full-dump | ? | D | A | unknown | no | 93334 | 1.7s |
| 66f2b11c821e116aacb2aeb6 | summarization-interpretive | rag (bm25) | ? | A | A | unknown | yes | 10618 | 1.0s |
| 66f2e874821e116aacb2c0af | structured-code-reasoning | budge | B | B | C | no_finish | no | 16089 | 7.4s |
| 66f2e874821e116aacb2c0af | structured-code-reasoning | full-dump | ? | C | C | unknown | yes | 176432 | 2.2s |
| 66f2e874821e116aacb2c0af | structured-code-reasoning | rag (bm25) | ? | B | C | unknown | no | 9169 | 0.7s |
| 66f3c081821e116aacb2e9fa | multi-hop-qa | budge | D | D | D | no_finish | yes | 24734 | 7.3s |
| 66f3c081821e116aacb2e9fa | multi-hop-qa | full-dump | ? | D | D | unknown | yes | 222479 | 3.6s |
| 66f3c081821e116aacb2e9fa | multi-hop-qa | rag (bm25) | ? | B | D | unknown | no | 10001 | 0.8s |
| 66f3c219821e116aacb2eb4e | structured-code-reasoning | budge | ? | ? | C | unknown | no | 0 | 0.0s |
| 66f3c219821e116aacb2eb4e | structured-code-reasoning | full-dump | ? | ? | C | unknown | no | 0 | 0.0s |
| 66f3c219821e116aacb2eb4e | structured-code-reasoning | rag (bm25) | ? | ? | C | unknown | no | 0 | 0.0s |
| 66f3c806821e116aacb2ed77 | multi-hop-qa | budge | A | A | C | no_finish | no | 57112 | 10.1s |
| 66f3c806821e116aacb2ed77 | multi-hop-qa | full-dump | ? | C | C | unknown | yes | 66343 | 1.3s |
| 66f3c806821e116aacb2ed77 | multi-hop-qa | rag (bm25) | ? | A | C | unknown | no | 10292 | 0.9s |
| 66f3dd59821e116aacb2f6ba | multi-hop-qa | budge | C | C | C | finish | yes | 31527 | 10.7s |
| 66f3dd59821e116aacb2f6ba | multi-hop-qa | full-dump | ? | C | C | unknown | yes | 194808 | 2.4s |
| 66f3dd59821e116aacb2f6ba | multi-hop-qa | rag (bm25) | ? | C | C | unknown | yes | 10243 | 0.7s |
| 66f3e473821e116aacb2fa73 | summarization-interpretive | budge | B | B | B | no_finish | yes | 42217 | 10.1s |
| 66f3e473821e116aacb2fa73 | summarization-interpretive | full-dump | ? | C | B | unknown | no | 44622 | 2.4s |
| 66f3e473821e116aacb2fa73 | summarization-interpretive | rag (bm25) | ? | C | B | unknown | no | 9865 | 1.0s |
| 66f3fb15821e116aacb303dc | multi-hop-qa | budge | B | B | D | no_finish | no | 36377 | 10.5s |
| 66f3fb15821e116aacb303dc | multi-hop-qa | full-dump | ? | A | D | unknown | no | 79664 | 1.4s |
| 66f3fb15821e116aacb303dc | multi-hop-qa | rag (bm25) | ? | A | D | unknown | no | 9870 | 1.1s |
| 66f568dc821e116aacb33995 | summarization-interpretive | budge | D | D | B | no_finish | no | 16410 | 8.2s |
| 66f568dc821e116aacb33995 | summarization-interpretive | full-dump | ? | D | B | unknown | no | 121745 | 2.2s |
| 66f568dc821e116aacb33995 | summarization-interpretive | rag (bm25) | ? | A | B | unknown | no | 10003 | 0.6s |
| 66f6b623bb02136c067c2646 | summarization-interpretive | budge | C | C | A | no_finish | no | 18041 | 7.3s |
| 66f6b623bb02136c067c2646 | summarization-interpretive | full-dump | ? | C | A | unknown | no | 53032 | 2.7s |
| 66f6b623bb02136c067c2646 | summarization-interpretive | rag (bm25) | ? | C | A | unknown | no | 11466 | 1.1s |
| 66f957e2bb02136c067c51c8 | summarization-interpretive | budge | B | B | D | finish | no | 23770 | 9.3s |
| 66f957e2bb02136c067c51c8 | summarization-interpretive | full-dump | ? | B | D | unknown | no | 124048 | 1.9s |
| 66f957e2bb02136c067c51c8 | summarization-interpretive | rag (bm25) | ? | B | D | unknown | no | 10807 | 0.7s |
| 670aac92bb02136c067d218a | single-hop-qa | budge | B | B | D | finish | no | 34689 | 8.8s |
| 670aac92bb02136c067d218a | single-hop-qa | full-dump | ? | B | D | unknown | no | 138306 | 2.1s |
| 670aac92bb02136c067d218a | single-hop-qa | rag (bm25) | ? | C | D | unknown | no | 10188 | 0.7s |
| 670bf6ddbb02136c067d2379 | single-hop-qa | budge | A | A | C | no_finish | no | 21847 | 11.7s |
| 670bf6ddbb02136c067d2379 | single-hop-qa | full-dump | ? | B | C | unknown | no | 179690 | 2.6s |
| 670bf6ddbb02136c067d2379 | single-hop-qa | rag (bm25) | ? | A | C | unknown | no | 10752 | 0.7s |
| 670c090bbb02136c067d2404 | single-hop-qa | budge | A | A | C | no_finish | no | 120217 | 12.0s |
| 670c090bbb02136c067d2404 | single-hop-qa | full-dump | ? | C | C | unknown | yes | 105914 | 1.7s |
| 670c090bbb02136c067d2404 | single-hop-qa | rag (bm25) | ? | A | C | unknown | no | 9826 | 1.6s |
| 6713066fbb02136c067d3214 | single-hop-qa | budge | B | B | D | no_finish | no | 56018 | 15.8s |
| 6713066fbb02136c067d3214 | single-hop-qa | full-dump | ? | B | D | unknown | no | 23227 | 1.0s |
| 6713066fbb02136c067d3214 | single-hop-qa | rag (bm25) | ? | B | D | unknown | no | 13292 | 0.7s |
| 67189156bb02136c067d3b8d | single-hop-qa | budge | C | C | B | no_finish | no | 40530 | 10.5s |
| 67189156bb02136c067d3b8d | single-hop-qa | full-dump | ? | D | B | unknown | no | 116614 | 2.0s |
| 67189156bb02136c067d3b8d | single-hop-qa | rag (bm25) | ? | B | B | unknown | yes | 9293 | 0.8s |
| 6718a43fbb02136c067d3ca8 | single-hop-qa | budge | B | B | B | finish | yes | 8513 | 6.8s |
| 6718a43fbb02136c067d3ca8 | single-hop-qa | full-dump | ? | B | B | unknown | yes | 117162 | 1.6s |
| 6718a43fbb02136c067d3ca8 | single-hop-qa | rag (bm25) | ? | B | B | unknown | yes | 9532 | 1.3s |
| 6719185cbb02136c067d40ab | single-hop-qa | budge | A | A | B | no_finish | no | 14926 | 11.0s |
| 6719185cbb02136c067d40ab | single-hop-qa | full-dump | ? | A | B | unknown | no | 118019 | 3.1s |
| 6719185cbb02136c067d40ab | single-hop-qa | rag (bm25) | ? | A | B | unknown | no | 9408 | 0.8s |
| 6719b96abb02136c067d4358 | single-hop-qa | budge | B | B | B | finish | yes | 20552 | 6.6s |
| 6719b96abb02136c067d4358 | single-hop-qa | full-dump | ? | D | B | unknown | no | 34056 | 1.5s |
| 6719b96abb02136c067d4358 | single-hop-qa | rag (bm25) | ? | B | B | unknown | yes | 11946 | 0.8s |
| 6719b9f1bb02136c067d4389 | single-hop-qa | budge | C | C | A | finish | no | 38190 | 8.3s |
| 6719b9f1bb02136c067d4389 | single-hop-qa | full-dump | ? | D | A | unknown | no | 23418 | 1.2s |
| 6719b9f1bb02136c067d4389 | single-hop-qa | rag (bm25) | ? | D | A | unknown | no | 13344 | 1.3s |
| 6723a0a7bb02136c067d7040 | multi-hop-qa | budge | A | A | A | no_finish | yes | 55478 | 10.2s |
| 6723a0a7bb02136c067d7040 | multi-hop-qa | full-dump | ? | A | A | unknown | yes | 125757 | 1.9s |
| 6723a0a7bb02136c067d7040 | multi-hop-qa | rag (bm25) | ? | B | A | unknown | no | 10867 | 1.5s |
| 6723a63bbb02136c067d71a1 | multi-hop-qa | budge | D | D | D | finish | yes | 38451 | 11.4s |
| 6723a63bbb02136c067d71a1 | multi-hop-qa | full-dump | ? | D | D | unknown | yes | 168985 | 2.2s |
| 6723a63bbb02136c067d71a1 | multi-hop-qa | rag (bm25) | ? | B | D | unknown | no | 11162 | 0.6s |
| 6724c4aabb02136c067d78a6 | structured-code-reasoning | budge | B | B | B | no_finish | yes | 27862 | 8.5s |
| 6724c4aabb02136c067d78a6 | structured-code-reasoning | full-dump | ? | C | B | unknown | no | 130348 | 1.8s |
| 6724c4aabb02136c067d78a6 | structured-code-reasoning | rag (bm25) | ? | B | B | unknown | yes | 12417 | 1.1s |
| 6724c5febb02136c067d78e7 | structured-code-reasoning | budge | A | A | A | no_finish | yes | 69024 | 8.8s |
| 6724c5febb02136c067d78e7 | structured-code-reasoning | full-dump | ? | ? | A | unknown | no | 261504 | 1.9s |
| 6724c5febb02136c067d78e7 | structured-code-reasoning | rag (bm25) | ? | B | A | unknown | no | 12819 | 0.8s |
| 6725d7a9bb02136c067d822d | icl-translation | budge | B | B | A | no_finish | no | 9909 | 6.5s |
| 6725d7a9bb02136c067d822d | icl-translation | full-dump | ? | C | A | unknown | no | 146530 | 3.4s |
| 6725d7a9bb02136c067d822d | icl-translation | rag (bm25) | ? | A | A | unknown | yes | 10578 | 0.8s |
| 6725d8dbbb02136c067d8309 | icl-translation | budge | B | B | C | no_finish | no | 15756 | 7.9s |
| 6725d8dbbb02136c067d8309 | icl-translation | full-dump | ? | C | C | unknown | yes | 146568 | 2.3s |
| 6725d8dbbb02136c067d8309 | icl-translation | rag (bm25) | ? | B | C | unknown | no | 10354 | 0.9s |
| 67285f8ebb02136c067d905d | structured-code-reasoning | budge | B | B | C | finish | no | 24831 | 7.2s |
| 67285f8ebb02136c067d905d | structured-code-reasoning | full-dump | ? | C | C | unknown | yes | 150645 | 2.5s |
| 67285f8ebb02136c067d905d | structured-code-reasoning | rag (bm25) | ? | C | C | unknown | yes | 12189 | 0.8s |

## Notes

- Accuracy is exact-match on the predicted answer letter.
- Budge comparison uses `directAnswer` from the orchestrator and `handoffAnswer` from the action agent output.
- If direct accuracy materially exceeds handoff accuracy, the library handoff is likely dropping signal; if both are similarly low, exploration or model choice is the more likely bottleneck.
- Run Health falls back to provider aggregates when a promptfoo export omits per-question rows.
