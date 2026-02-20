# Similarity Systems in Production: A Latency Playbook

This topic gets confusing because people mix three different layers:
1. **Metric**: what "similar" means.
2. **Sketch/Fingerprint**: how to compress data for speed.
3. **Index/Retrieval**: how to find candidates fast.

If you separate those layers, SimHash vs Jaccard becomes straightforward.

Jaccard comes up early because teams usually start with a metric they trust, then optimize it.  
So we start there, then move outward to sketches and indexes that make that metric practical at scale.

## The Three Layers

### 1) Metric Layer

Examples:
1. **Jaccard**: set overlap (`|A∩B| / |A∪B|`).
2. **Edit distance**: character-level typo distance.
3. **Cosine**: vector angle (TF-IDF or embeddings).

This is the semantic definition of similarity.

What Jaccard is for:
1. Comparing overlap-heavy text represented as sets (usually token or character shingles).
2. Short-text near-dup and title/product-name matching.
3. Candidate verification after fast approximate retrieval.

Shingles (quick definition):
1. A shingle is an overlapping chunk of text.
2. Word shingles use consecutive words (e.g., 2-word windows).
3. Character shingles use consecutive characters (e.g., 3-char windows).

Example:
1. Text: `the quick brown fox`
2. Word 2-shingles: `the quick`, `quick brown`, `brown fox`

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

## Method Chooser

1. `Exact copies` -> `Hash set / Bloom filter`
Reason: cheapest exact seen-check.

2. `Copies with formatting noise` -> `Normalized hash`
Reason: collapses casing/whitespace variants.

3. `Typos / OCR-like character errors` -> `Edit distance + BK-tree/SymSpell`
Reason: best for character-level misspellings.

4. `Similar-sounding names` -> `Phonetic hash`
Reason: handles pronunciation variants.

5. `Similar short text (titles/tweets)` -> `Jaccard on shingles`
Reason: interpretable overlap score.

6. `Similar documents (fast path)` -> `SimHash`
Reason: very fast near-dup candidate retrieval.

7. `Similar documents (higher fidelity)` -> `MinHash + LSH`
Reason: better Jaccard-style near-dup quality.

8. `Shared substrings / boilerplate reuse` -> `Rolling hash / Rabin`
Reason: detects partial chunk overlap.

9. `Same meaning, different words` -> `TF-IDF cosine or embeddings`
Reason: lexical or semantic retrieval.

10. `Mixed workloads` -> `Layered pipeline`
Reason: exact -> near-dup -> semantic.

## Black-Box API Examples

A useful way to reason about these methods is with two interfaces:
1. `seen_before(item) -> bool`
2. `find_similar(item, k) -> list[Match]`

Below are concrete examples for each method.

### 1) Exact hash set / Bloom filter (URL frontier dedup)

```python
def seen_before_url(url: str) -> bool:
    key = canonicalize(url)
    return bloom_contains(key)  # or hash_set_contains(key)

# Example:
# input: "https://example.com/page?utm_source=x"
# checks canonical form "https://example.com/page"
```

### 2) Normalized hash (noise-tolerant exactness)

```python
def seen_before_normalized(text: str) -> bool:
    normalized = normalize_whitespace_case_punctuation(text)
    return hash_set_contains(sha256(normalized))

# Example:
# "  Hello, WORLD!! " and "hello world" map to same fingerprint
```

### 3) SimHash (fast near-dup filter for documents)

```python
def find_similar_simhash(doc: str, max_hamming: int = 3) -> list[str]:
    fp = simhash64(shingles(doc))
    candidates = simhash_index_lookup(fp, max_hamming)
    return candidates

# Example:
# input: crawled article with ad boilerplate changes
# output: likely near-duplicate page ids
```

### 4) Jaccard on shingles (short text overlap)

```python
def find_similar_jaccard(title: str, threshold: float = 0.8) -> list[str]:
    q = char_3gram_set(title)
    return [id for id, s in title_store if jaccard(q, s) >= threshold]

# Example:
# "Apple iPhone 15 Pro Max 256GB"
# vs "iPhone 15 Pro Max by Apple 256 GB"
```

### 5) MinHash + LSH (Jaccard at scale)

```python
def find_similar_minhash(doc: str) -> list[str]:
    sig = minhash_signature(shingles(doc))
    candidates = lsh_lookup(sig)
    return rerank_by_jaccard(doc, candidates)

# Example:
# millions of product descriptions; return near-dup candidates without full scan
```

### 6) Edit distance (+ BK-tree/SymSpell) for typos

```python
def find_similar_spelling(term: str, max_edits: int = 2) -> list[str]:
    return bktree_search(term, max_edits)  # or symspell_lookup(term)

# Example:
# "tehcnical" -> ["technical"]
```

### 7) TF-IDF cosine (fast lexical semantic-ish retrieval)

```python
def find_similar_tfidf(query: str, k: int = 10) -> list[str]:
    qv = tfidf_vectorize(query)
    return tfidf_index_topk_cosine(qv, k)

# Example:
# "refund policy annual subscription"
# returns docs with overlapping terminology
```

### 8) Rolling hash / Rabin (shared substrings)

```python
def find_shared_chunks(doc: str) -> list[str]:
    chunks = content_defined_chunks(doc)
    return lookup_docs_by_chunk_hashes(chunks)

# Example:
# detect pages sharing same template/footer blocks
```

### 9) Embeddings + ANN (semantic near-dup)

```python
def find_similar_semantic(text: str, k: int = 10) -> list[str]:
    vec = embed(text)
    return ann_index_topk(vec, k)

# Example:
# "how to cancel my plan"
# matches "terminate subscription" articles even with different wording
```

### 10) Phonetic hash (name/entity normalization)

```python
def find_similar_name(name: str) -> list[str]:
    code = double_metaphone(name)
    return phonetic_index_lookup(code)

# Example:
# "Schmidt" -> candidates including "Smith", "Smyth" (then re-rank downstream)
```

### Composite pipeline (recommended in production)

```python
def lookup_similar(item: str) -> list[str]:
    if seen_before_url_or_hash(item):
        return ["exact_match"]

    # cheap near-dup filter
    near = find_similar_simhash(item, max_hamming=3)
    if near:
        return verify_with_jaccard(item, near)

    # expensive semantic fallback
    return find_similar_semantic(item, k=5)
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
