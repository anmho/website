# Hybrid Fusion (RRF)

### Combining two ranked lists

Two independent candidate lists for the same query — a full-text list (BM25 / Elasticsearch / Postgres FTS) and an embedding list (pgvector / ANN) — need to become one ranking. You can't just average the raw scores: BM25 scores and cosine similarities aren't on comparable scales, and the scale shifts per query.

**Reciprocal Rank Fusion** sidesteps that by using rank position instead of raw score:

$$
\text{RRF}(d) = \sum_{\text{list } l} \frac{1}{k + \text{rank}_l(d)}
$$

$\text{rank}_l(d)$ is $d$'s 1-indexed position in list $l$; $k$ is a constant (commonly 60) that dampens the pull of very high ranks.

```text
Document   BM25 rank   Embedding rank   RRF score
doc_B      2           1                1/62 + 1/61 = 0.0325
doc_A      1           4                1/61 + 1/64 = 0.0320
doc_C      —           2                0    + 1/62 = 0.0161
doc_D      3           —                1/63 + 0    = 0.0159
```

doc_B edges out doc_A even though doc_A was #1 on BM25 — ranking well on *both* lists beats ranking #1 on one and mediocre on the other.

### Why not normalize and sum scores instead

Min-max or z-score normalization plus a weighted sum works too, but score distributions shift per query (one exact BM25 match vs. ten near-matches produces very different shapes), so a fixed normalization silently misbehaves on some queries. RRF is scale-free by construction — the default for lexical + semantic fusion.

### Notes

- A candidate in only one list still scores, just lower — appearing in every list is the strongest signal, not the only one that counts.
- The union merge is a top-k merge: a min-heap over list heads gives the fused top-k without fully sorting either input.
- $k=60$ is from the original RRF paper (Cormack et al.) and works fine as a default without per-query tuning.

Fusion step in a [candidate retrieval system](/articles/designing-a-job-candidate-retrieval-system): turns "one list from full-text, one from embeddings" into a single top-k list for L1/L2 rerankers to refine.
