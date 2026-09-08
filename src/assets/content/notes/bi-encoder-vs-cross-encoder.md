# Bi-Encoder vs Cross-Encoder

### Bi-encoder: two separate forward passes

```text
JD         → Transformer → job vector ───┐
                                          ├── cosine(job, candidate)
CANDIDATE  → Transformer → cand vector ───┘
```

The two texts never see each other. Each gets compressed into one vector independently, then compared.

Because the passes are independent, candidate vectors can be computed **offline, once**, and reused for every future query:

```text
OFFLINE:  10M résumés → 10M vectors, computed once
ONLINE:   1 query → 1 vector → ANN search over the 10M stored vectors
```

Concrete models: `all-MiniLM-L6-v2`, `all-mpnet-base-v2` (Sentence Transformers), or retrieval-tuned families like **E5** and **BGE**.

### Cross-encoder: one joint forward pass

```text
JD + CANDIDATE → Transformer (together) → relevance score
```

Both texts go through self-attention *together*, so `"must have C++"` on the job side can directly affect how `"6 years C++"` on the candidate side gets represented, mid-computation. That's the "cross."

```text
("need Kafka infrastructure engineer", "built Kafka infrastructure at Snap")
                    ↓
            cross-encoder model
                    ↓
                  8.41
```

No cosine similarity — the score comes straight out of the model. Concrete models: `cross-encoder/ms-marco-*`, or the BGE reranker family.

### Why the cost difference is so large

It's not that a cross-encoder is a bigger network — it's that its work can't be reused:

```text
Bi-encoder,  1,000 candidates:  1 Transformer call (query) + 1,000 cheap dot products
Cross-encoder, 1,000 candidates: 1,000 Transformer calls (query+candidate, every time)
```

It's worse than that count alone suggests, too. A bi-encoder runs the Transformer over the query once (say 500 tokens); a cross-encoder reprocesses the query *inside every one of those 1,000 calls*, each over `query_tokens + candidate_tokens` (500 + 800 = 1,300). Self-attention cost is roughly $O(L^2)$ in sequence length, so those longer, repeated passes aren't just more calls — each call is also more expensive.

$$
\text{bi-encoder: } \text{Transformer(query)} + \sum \text{cheap dot products}
\qquad
\text{cross-encoder: } \sum_{\text{candidate}} \text{Transformer(query + candidate)}
$$

$$
\boxed{\text{bi-encoder trades interaction for reuse} \quad\text{vs}\quad \text{cross-encoder trades reuse for interaction}}
$$

### As three L1/L2 scorers

| Scorer | What it does | Cost | Typical stage |
|---|---|---:|---|
| Bi-encoder | two vectors → cosine/dot | cheap | retrieval, sometimes L1 |
| XGBoost/LightGBM | structured features → learned score | cheap | L1 |
| Cross-encoder | query+candidate jointly → score | expensive | L2 |

At L1, a second embedding pass is usually redundant — the retrieval bi-encoder's similarity score is already a feature. XGBoost's edge is combining *everything* cheaply (embedding similarity, BM25/RRF score, skills overlap, title match, years of experience, location, salary compatibility, recency) into one learned score, which a lone cosine comparison can't do.

### When corpus size matters more than QPS

Even at 1 query/sec, cross-encoding a 10M-candidate corpus per query is 10M Transformer calls — impractical regardless of traffic. Bi-encoder + ANN retrieval isn't valuable because of high QPS; it's valuable because it avoids running a neural network on every (query, candidate) pair at all. For a smaller corpus — a 50k-candidate ATS, say — the funnel can be much shallower: retrieve broadly, cross-encode straight from there, skip L1 entirely if latency allows.

$$
\text{cost} \approx \text{QPS} \times \text{corpus size} \times \text{cost per candidate}
$$

Low QPS alone doesn't save you if the per-query corpus is enormous — see [Designing a Job Candidate Retrieval System](/articles/designing-a-job-candidate-retrieval-system) for where this funnel structure comes from.
