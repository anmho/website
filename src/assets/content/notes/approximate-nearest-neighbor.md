# Approximate Nearest Neighbor (ANN)

Given a query vector, find the vectors in a large collection that are closest to it (cosine similarity, dot product, or L2 distance).

Exact nearest neighbor search is a brute-force scan:

```text
for each vector v in collection:
    compute distance(query, v)
sort by distance
return top k
```

This is $O(n \cdot d)$ per query — fine for thousands of vectors, too slow for millions or billions.

**Approximate** nearest neighbor search trades a small amount of recall for a large amount of speed by building an index that prunes most of the search space up front:

$$
\boxed{\text{exact, slow}} \rightarrow \boxed{\text{approximate, fast, "good enough" recall}}
$$

### Index strategies

**HNSW (Hierarchical Navigable Small World)**

Builds a multi-layer graph where each vector is a node connected to its nearest neighbors. Search starts at a sparse top layer and greedily descends to denser layers, narrowing in on the query.

```text
Layer 2 (sparse):     A ─────── D
                        \       /
Layer 1:               A─B   D─E
                       /  \ /  \
Layer 0 (dense):      A-B-C-D-E-F
```

Most vector databases (pgvector, Weaviate, Qdrant) default to HNSW because it gives strong recall/latency tradeoffs without a separate training step.

**IVF (Inverted File Index)**

Cluster vectors into buckets (via k-means). At query time, only search the closest few buckets instead of the whole collection.

```text
centroids: C1, C2, C3, ... C_nlist

query → find nearest centroids (e.g. top 8)
      → only scan vectors assigned to those buckets
```

Often paired with **product quantization (PQ)** to compress vectors and shrink memory footprint (IVF-PQ).

**LSH (Locality-Sensitive Hashing)**

Hash vectors such that similar vectors land in the same bucket with high probability. Less common now — generally dominated by HNSW/IVF in recall-per-latency.

### Tuning the tradeoff

Every ANN index exposes knobs that trade recall for speed:

| Index | Knob | Effect |
|---|---|---|
| HNSW | `ef_search` | higher = more candidates explored = better recall, slower |
| HNSW | `M` | more graph connections per node = better recall, more memory |
| IVF | `nprobe` | more buckets searched = better recall, slower |

Backbone of embedding search in RAG pipelines, semantic search, and [candidate retrieval systems](/articles/designing-a-job-candidate-retrieval-system) — matching a query embedding against millions of candidate embeddings before any reranking happens.
