# Similarity Systems in Production: A Latency Playbook

This topic gets confusing because people mix three different layers:
1. **Metric**: what "similar" means.
2. **Sketch/Fingerprint**: how to compress data for speed.
3. **Index/Retrieval**: how to find candidates fast.

If you separate those layers, SimHash vs Jaccard becomes straightforward.

## The Three Layers

### 1) Metric Layer

Examples:
1. **Jaccard**: set overlap (`|A∩B| / |A∪B|`).
2. **Edit distance**: character-level typo distance.
3. **Cosine**: vector angle (TF-IDF or embeddings).

This is the semantic definition of similarity.

### 2) Sketch Layer

Examples:
1. **SimHash**: compact bit fingerprint for near-dup.
2. **MinHash**: sketch that approximates Jaccard.
3. **Content hash (SHA/MD5)**: exact identity fingerprint.

Sketches trade precision for speed and memory efficiency.

### 3) Index Layer

Examples:
1. **Hash set / Bloom filter** for exact seen checks.
2. **BK-tree / Trie** for edit-distance search.
3. **LSH / ANN / permutation buckets** for approximate retrieval.

Indexes make lookup cheap at scale.

## SimHash vs Jaccard (Not Interchangeable)

They live at different layers.

1. **Jaccard** is a metric (exact overlap score for sets/shingles).
2. **SimHash** is a sketch (compact signature; compare with Hamming distance).

In practice:
1. Use SimHash to retrieve/filter quickly.
2. Optionally verify with Jaccard on shortlisted candidates.

So the real question is usually "which pipeline?" not "which single algorithm?"

## Decision Tree

```text
What are you deduping?
|
|-- Exact copies -----------------> Hash set (or Bloom filter at scale)
|
|-- Copies with noise ------------> Normalized hash
|   (casing, whitespace)
|
|-- Typos / OCR errors -----------> Edit distance (+ BK-tree/SymSpell)
|   (character-level)
|
|-- Similar names ----------------> Phonetic hash
|
|-- Similar short text -----------> Jaccard on shingles
|   (product titles, tweets)
|
|-- Similar documents ------------> SimHash or MinHash+LSH
|   (web pages, articles)           (SimHash if speed matters,
|                                    MinHash if Jaccard fidelity matters)
|
|-- Shared substrings ------------> Rolling hash / Rabin
|   (boilerplate, copy-paste)
|
|-- Same topic, different words --> TF-IDF cosine or Embeddings
|   (paraphrases, translations)      (TF-IDF if fast, Embeddings if precise)
|
`-- All of the above -------------> Layer them: exact -> near-dup -> semantic
```

## Latency Ladder (Back-of-Envelope)

```text
        0.001ms   0.01ms   0.1ms    1ms     10ms     100ms
           |        |        |       |        |         |
Hash ------*
Norm+Hash ---------*
Phonetic ----------*
Jaccard ---------------------*-------*
SimHash ---------------------*-------*
Edit dist -------------------*-------*
Rolling hash ----------------*-------*
MinHash+LSH -------------------------*-------*
TF-IDF cos --------------------------*-------*
Embeddings -----------------------------------*--------*
                                                (CPU)
```

These ranges vary by corpus, indexing strategy, and hardware. Use them as planning budgets, not guarantees.

## Practical Production Pattern

Most systems should layer methods in this order:
1. **Hot path exact**: URL/content hash, Bloom filter.
2. **Near-dup pass**: SimHash or MinHash+LSH.
3. **Semantic pass (optional)**: embeddings + ANN.

This keeps p95 low while preserving quality where it matters.

## Use-Case Mapping

1. **Autocorrect**: edit-distance metric + BK-tree/SymSpell index.
2. **Typeahead**: prefix structures (trie/FST); add fuzzy layer only if needed.
3. **Web crawl dedup**: exact hash at frontier, SimHash/MinHash at indexing, embeddings only for high-value semantic collapse.

The core engineering move is to choose the cheapest layer that solves the problem, then add depth only where misses are costly.
