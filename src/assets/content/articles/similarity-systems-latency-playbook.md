# Similarity Systems in Production: A Latency Playbook

Most discussions of similarity algorithms start with elegance and end with disappointment in production.

In real systems, the first question is usually not "which metric is most principled?"  
It is "what can we afford at p95?"

This article walks through three practical workloads:
1. Autocorrect
2. Typeahead
3. Web crawl deduplication

And frames each by latency, memory, and implementation complexity.

## A Quick Baseline: Jaccard

Jaccard similarity between sets `A` and `B`:

```text
J(A, B) = |A ∩ B| / |A ∪ B|
```

Interpretation:
1. `1.0` means identical sets.
2. `0.0` means no overlap.

Jaccard is foundational for near-duplicate detection, especially with shingle sets.  
But at scale, you rarely compute exact Jaccard against every candidate. You use approximations and indexing to avoid quadratic work.

## Use Case 1: Autocorrect / Spell Correction

Goal: map misspelled input to likely dictionary terms with low tail latency.

### Option A: BK-Tree

Distance-aware tree for edit-distance search with threshold pruning.

Good fit:
1. Exact edit-distance constraints (`<= 2`).
2. Medium dictionaries.

Typical profile:
1. Low memory overhead.
2. Strong practical pruning for small distance thresholds.
3. Latency often sub-millisecond on ~100K dictionaries.

### Option B: SymSpell

Precompute delete variants for each term, then query with hash lookups.

Good fit:
1. Extremely low query latency target.
2. Static or infrequently updated dictionary.

Typical profile:
1. Fastest lookup path.
2. High memory footprint from deletion maps.
3. Implementation is straightforward.

### Option C: Trie + Levenshtein Automaton

Intersect query automaton with trie to prune invalid branches.

Good fit:
1. High-performance typo tolerance.
2. Team can absorb higher implementation complexity.

Typical profile:
1. Excellent latency.
2. More complex automaton logic.
3. Strong control over exact edit-distance behavior.

### Option D: Norvig-Style Candidate Generation

Generate edits at distance 1-2, filter by dictionary, rank by frequency.

Good fit:
1. Interview settings.
2. Fast MVP.
3. Smaller dictionaries.

Typical profile:
1. Easy to reason about.
2. Slower than preindexed structures.
3. Good quality when frequency model is decent.

## Use Case 2: Typeahead / Autocomplete

Target user experience is usually <50 ms end-to-end. That leaves single-digit milliseconds for server compute, often much less.

### Option A: Trie with Precomputed Top-K

At each prefix node, store top completions.

Why teams use it:
1. Predictable O(prefix length) behavior.
2. Consistent low latency.
3. Easy to combine with ranking signals.

### Option B: Sorted Array + Binary Search

Find prefix range lexicographically and return ranked slice.

Why it is underrated:
1. Simple persistence format.
2. Cache-friendly scans.
3. Easy sharding and reload behavior.

### Option C: FST (Finite State Transducer)

Lucene-style compressed dictionary structure.

Why it matters:
1. Extremely memory efficient.
2. Excellent lookup latency.
3. Great for read-heavy static dictionaries.

### Option D: Fuzzy Typeahead (Trie + Edit Automata or N-Gram Index)

Needed when typo tolerance matters in incremental search.

Tradeoff:
1. Better recall.
2. More compute and index complexity.
3. Tighter ranking and cutoff requirements.

## Use Case 3: Web Crawl Deduplication

At crawl scale, duplicate handling is a layered pipeline, not one algorithm.

### Layer 1: Exact URL-Level Dedup

Hash canonicalized URL and drop repeats.

Strength:
1. Trivial and very fast.

Weakness:
1. Misses identical content at different URLs.

### Layer 2: Exact Content Hash Dedup

Hash full body and remove byte-identical pages.

Strength:
1. Cheap and precise for exact dupes.

Weakness:
1. Tiny content changes defeat matches.

### Layer 3: Near-Duplicate Detection (SimHash)

SimHash is often the practical default at web scale.

Why:
1. Compact fingerprints (e.g., 64-bit).
2. Fast comparison via XOR + popcount.
3. Effective for template-heavy near-duplicates.

Operational note:
1. Candidate retrieval must be indexed (bucket/permutation strategy), not brute-force scans.

### Layer 4: Jaccard Approximation (MinHash + LSH)

MinHash approximates Jaccard; LSH avoids all-pairs comparison.

Why teams choose it:
1. Better set-overlap fidelity than single SimHash bits.
2. Tunable recall/precision via bands/rows.

Cost:
1. Larger signatures.
2. Heavier indexing and tuning.

### Layer 5: Semantic Dedup (Embeddings + ANN)

Catch paraphrases and semantic overlap.

Strength:
1. Highest semantic recall.

Cost:
1. Embedding generation dominates latency/cost.
2. More infra complexity (model serving + ANN index ops).

## Latency Hierarchy (Mental Model)

```text
Fast + shallow ----------------------------------------------> Slow + deep

URL hash
  -> content hash
  -> Bloom-style seen checks
  -> SimHash near-dup
  -> MinHash + LSH
  -> Embeddings + ANN
```

As you move right:
1. You catch richer similarity.
2. You pay more compute and ops tax.

## Practical Architecture Pattern

Production systems usually layer these methods:
1. Frontier: exact dedup (`URL hash`, `Bloom`).
2. Ingestion: exact body hash.
3. Indexing: near-dup (`SimHash` or `MinHash+LSH`).
4. Optional premium stage: semantic dedup with embeddings.

This keeps the hot path cheap while preserving quality where it matters.

## Interview Strategy (40-Minute Version)

If asked to build a streaming dedup/autocomplete system quickly:
1. Start with exact set dedup and bounded memory window.
2. Add one strong near-dup primitive (SimHash is usually best ROI).
3. Explain latency tiers and when each method is justified.
4. Show clean fallback path from exact to approximate to semantic.

The signal interviewers want is not just algorithm knowledge.  
It is whether you can choose the right point on the latency-accuracy-cost frontier.
