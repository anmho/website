# Hybrid Fusion (RRF)

### The problem

You have two (or more) independent candidate lists for the same query — say, a full-text search list (BM25 / Elasticsearch / Postgres FTS) and an embedding search list (pgvector / ANN). Each ranks documents differently, on different scales, and you need one combined ranking.

You can't just average the raw scores — BM25 scores and cosine similarities aren't on comparable scales, and their distributions shift per query.

### Reciprocal Rank Fusion (RRF)

RRF sidesteps the scale problem entirely by using **rank position**, not raw score.

$$
\text{RRF}(d) = \sum_{\text{list } l} \frac{1}{k + \text{rank}_l(d)}
$$

where $\text{rank}_l(d)$ is the position of document $d$ in list $l$ (1-indexed), and $k$ is a constant (commonly 60) that dampens the influence of very high ranks.

```text
Document   BM25 rank   Embedding rank   RRF score
doc_A      1           4                1/(60+1) + 1/(60+4)  = 0.0327
doc_B      2           1                1/(60+2) + 1/(60+1)  = 0.0327
doc_C      —           2                0         + 1/(60+2) = 0.0161
doc_D      3           —                1/(60+3) + 0         = 0.0159
```

A document that ranks decently in *every* list beats a document that ranks #1 in one list but is absent from the rest — which is usually what you want: agreement across independent signals is evidence of true relevance, not an artifact of one retriever's quirks.

### Why not just weight and sum scores?

You could normalize each list's scores (min-max, z-score) and take a weighted sum, and that works too — but it's brittle: score distributions vary per query (a query with one exact BM25 match vs. ten near-matches produces very different score shapes), so a fixed normalization scheme silently misbehaves on some queries. RRF is scale-free by construction, which is why it's the default choice for combining lexical + semantic search.

### Implementation notes

- If a candidate appears in only one list, it still gets a (smaller) score — being retrieved by *any* method still counts as a signal, it's just weaker than appearing in every list.
- Computing RRF over the union of the candidate lists is naturally a top-k merge: a min-heap over list heads gives you the fused top-k without fully sorting either input list.
- $k=60$ is the value from the original RRF paper (Cormack et al.) and works reasonably well as a default without per-query tuning.

### Where it shows up

RRF (or a learned equivalent) is the fusion step between hard-filtered candidate lists and the reranking stage in a [a candidate retrieval system](/articles/designing-a-job-candidate-retrieval-system) pipeline: it's what turns "one list from full-text, one list from embeddings" into a single top-k list that L1/L2 rerankers then refine.
