# Similarity Systems in Production: A Latency Playbook

Imagine you are crawling the web and ingesting millions of pages per day.

You need to answer one operational question for every incoming page:
1. Is this page new?
2. Or is it a near-duplicate of something we have already seen?

A naive approach compares the incoming page with every stored page.
That works, but latency and compute explode as the corpus grows.

This article walks from that naive baseline to production retrieval:
1. Define what "similar" means.
2. Compress documents into fast fingerprints.
3. Retrieve only likely candidates instead of scanning everything.

Teams get stuck because these three layers are often mixed together:
1. **Similarity Objective**: what "similar" means.
2. **Sketch/Fingerprint**: how to compress data for speed.
3. **Index/Retrieval**: how to find candidates fast.

If you separate those layers, MinHash vs SimHash becomes straightforward.

## Why not just use a hash map?

Because a normal hash map answers exact equality, not similarity.

1. If two documents are exactly the same, exact hashes match and lookup is `O(1)`.
2. If two documents are only near-duplicates, their exact hashes are usually unrelated.
3. So for "have we seen something like this before?", a plain hash map forces a scan across many/all documents.

That is why we need similarity-aware fingerprints and indexes (MinHash/SimHash + LSH/Hamming indexing), not only exact hashes.

## The Three Layers

### 1) Similarity Objective Layer

Examples:
1. **Jaccard**: set overlap (`|A∩B| / |A∪B|`).
2. **Edit distance**: character-level typo distance.
3. **Cosine**: vector angle (TF-IDF or embeddings).

This is the semantic definition of "similar enough" for your use case.

What each metric is for:
1. **Jaccard**:
Use when overlap of discrete features matters (tokens/shingles/tags).
Strong for near-duplicate text, title matching, and set-style similarity.
2. **Edit distance**:
Use when small string edits matter (typos, insert/delete/substitute).
Strong for usernames, SKUs, short fields, and fuzzy exact-string matching.
3. **Cosine**:
Use when directional similarity in weighted vectors matters (TF-IDF/embeddings).
Strong for topical/semantic similarity and ranking related content.

Shingles (quick definition):
1. A shingle is an overlapping chunk of text.
2. Word shingles use consecutive words (e.g., 2-word windows).
3. Character shingles use consecutive characters (e.g., 3-char windows).
4. In modern terminology, this is just `n`-grams (contiguous token windows); "shingling" is older IR/web-search wording.

Example:
1. Text: `the quick brown fox`
2. Word 2-shingles: `the quick`, `quick brown`, `brown fox`

### 2) Sketch Layer

Examples:
1. **SimHash**: compact bit fingerprint for near-dup; preserves cosine locality of weighted feature vectors via random-hyperplane sign bits.
2. **MinHash**: sketch that approximates Jaccard.
3. **Content hash (SHA/MD5)**: exact identity fingerprint.

Sketches trade precision for speed and memory efficiency.

What sketches add (beyond the raw similarity objective):
1. **Compression**: map large text/vector representations to tiny fixed-size signatures.
2. **Fast candidate generation**: enable sublinear retrieval with LSH/Hamming-style indexes.
3. **Cost control**: reduce memory, network, and CPU spent on full pairwise comparisons.
4. **Two-stage ranking**: cheap approximate filter first, exact/strong scoring only on shortlisted candidates.

### 3) Index Layer

Examples:
1. **Hash set / Bloom filter** for exact seen checks.
2. **BK-tree / Trie** for edit-distance search.
3. **LSH / ANN / permutation buckets** for approximate retrieval.

Indexes make lookup cheap at scale.

## MinHash vs SimHash (Not Interchangeable)

They live at different layers.

1. **MinHash** is a sketch for **set overlap** and approximates **Jaccard**.
2. **SimHash** is a sketch for **vector-style similarity** (cosine locality via random hyperplane hashing), queried with **Hamming distance**.

In practice:
1. Use SimHash to retrieve/filter quickly.
2. Optionally verify with Jaccard (or cosine/embedding score) on shortlisted candidates.

So the real question is usually "which pipeline?" not "which single algorithm?"

## MinHash vs SimHash (Pragmatic Deep Dive)

The fast intuition:
1. **MinHash** asks: "How much set overlap do these texts have?" (Jaccard view)
2. **SimHash** asks: "Do these texts have similar weighted feature signatures?" (vector/cosine-locality view)

### Important semantic caveat

MinHash is only as order-aware as your features:
1. If features are unigrams, order is mostly lost.
2. If features are k-shingles (word/char n-grams), local order is encoded.

Example:
1. `"the dog bit the man"` vs `"the man bit the dog"`
2. Unigram sets are nearly the same.
3. 2-word shingles differ much more.

### When to pick which

1. **MinHash (+ LSH)**:
Use when you care about Jaccard-like overlap, especially for shingles/sets.
2. **SimHash**:
Use when you want compact, very fast near-dup filtering with Hamming distance.

In many pipelines:
1. SimHash for fast candidate retrieval.
2. Jaccard/MinHash-style verification on candidates.

## Python: Practical Usage

### MinHash with `datasketch`

```python
from datasketch import MinHash, MinHashLSH

def shingles(text: str, k: int = 3) -> set[str]:
    words = text.lower().split()
    return {" ".join(words[i:i+k]) for i in range(len(words) - k + 1)}

def build_minhash(text: str, num_perm: int = 128) -> MinHash:
    m = MinHash(num_perm=num_perm)
    for s in shingles(text, k=3):
        m.update(s.encode("utf-8"))
    return m

docs = [
    ("a", "the quick brown fox jumps over the lazy dog"),
    ("b", "the quick brown fox jumped over a lazy dog"),
    ("c", "postgres index tuning for large tables"),
]

# 1) Build corpus index once
lsh = MinHashLSH(threshold=0.5, num_perm=128)
minhash_by_id = {}
for doc_id, text in docs:
    mh = build_minhash(text, num_perm=128)
    minhash_by_id[doc_id] = mh
    lsh.insert(doc_id, mh)

# 2) Query without scanning all docs
q = build_minhash("the quick brown fox jumps over lazy dog", num_perm=128)
candidates = lsh.query(q)  # candidate doc IDs only
print("candidates", candidates)

# 3) Optional exact/estimated re-rank on candidates
for doc_id in candidates:
    print(doc_id, "estimated_jaccard", q.jaccard(minhash_by_id[doc_id]))
```

How MinHash corpus lookup works:
1. Store one MinHash signature per article.
2. LSH splits each signature into bands and buckets similar signatures together.
3. Query signature probes those buckets to get candidate IDs.
4. Only candidates are scored; you avoid full-corpus comparison.

### SimHash with `simhash`

```python
from simhash import Simhash, SimhashIndex

docs = [
    ("a", "the quick brown fox jumps over the lazy dog"),
    ("b", "the quick brown fox jumped over a lazy dog"),
    ("c", "postgres index tuning for large tables"),
]

# 1) Build corpus index once
objs = [(doc_id, Simhash(text)) for doc_id, text in docs]
index = SimhashIndex(objs, k=3)
# What this does:
# - stores each document's 64-bit SimHash fingerprint
# - builds block-based lookup tables over fingerprint bits
# - uses k as the max allowed Hamming distance for near-dup matches
# Practical meaning of k:
# - lower k -> stricter matching, fewer candidates
# - higher k -> looser matching, more candidates

# 2) Incoming document check without scanning all docs
incoming_fp = Simhash("the quick brown fox jumps over lazy dog")
candidates = index.get_near_dups(incoming_fp)  # candidate doc IDs only
print("near_dups", candidates)

# 3) Optional exact Hamming check using stored corpus SimHashes
simhash_by_id = dict(objs)
for doc_id in candidates:
    print(doc_id, "hamming", incoming_fp.distance(simhash_by_id[doc_id]))
```

Implementation note (`simhash` package):
1. `Simhash(text)` does built-in preprocessing for string input.
2. In the common Python implementation, it lowercases, tokenizes with regex-cleaning, and builds sliding character windows (default width 4).
3. If you need explicit word shingles (for example, word 3-grams), build features yourself and pass them as an iterable.

How SimHash corpus lookup works:
1. Store one SimHash fingerprint per article.
2. The index partitions fingerprint bits into blocks across tables.
3. Query fingerprint probes matching blocks to collect candidates.
4. Candidates are verified by full Hamming distance (`distance <= k`).

Hamming distance (why it matters for SimHash):
1. SimHash outputs a fixed-width bit fingerprint (commonly 64 bits).
2. Hamming distance is the number of bit positions that differ between two equal-length fingerprints.
3. For 64-bit SimHash, Hamming distance ranges from `0..64` (smaller means more similar).
4. It is not cosine similarity itself; in SimHash it acts as a fast proxy because SimHash preserves cosine locality.
5. In the Python library, use `a.distance(b)` between two `Simhash` objects.
6. `SimhashIndex(..., k=3)` means only candidates within distance `<= 3` are returned.
7. Raw decimal hash values can look far apart numerically but still be similar in Hamming space.

Quick check:

```python
from simhash import Simhash

a = Simhash("the quick brown fox jumps over the lazy dog")
b = Simhash("the quick brown fox jumped over a lazy dog")

print(a.distance(b))  # smaller = more similar, range 0..64
```

## Why SimHash is not a word-level typo detector

Document similarity sketches (SimHash/MinHash) are not the right tool for word-level typo detection. A single-word edit can flip many bits in a SimHash fingerprint, so a typo can end up with a larger Hamming distance than a different valid word. SimHash has no concept of “correct” vs “typo”; it only measures surface-level feature overlap.

This is fine for document dedup. The goal is to suppress near-duplicates, not to decide whether a specific token is a typo. At document scale, thousands of features average out, and Hamming distance correlates with overall overlap. At single-word scale, it is too noisy to be useful.

If you need the distinction:
1. Spell correction: use a dictionary-backed approach (word list + SymSpell or a BK-tree).
2. Semantic similarity: use embeddings and compare vector similarity, not sketch fingerprints.

Key insight: similarity is not correctness. SimHash answers “are these texts structurally similar?” It does not answer “is this a typo?” or “do these mean the same thing?”

## When to use document sketches vs word-level distance

Documents and words have different constraints:
1. **Feature count**: documents have thousands of features; a single word has very few.
2. **Noise tolerance**: SimHash relies on many features to average out hashing noise; words are too short for that to be stable.
3. **Signal type**: word-level typos are edit operations; document similarity is aggregate overlap.

Why not just use SimHash for words?
1. A one-character typo can flip many SimHash bits, so distance is noisy.
2. Two different valid words can end up closer than a typo variant.
3. You lose interpretability: “distance 3” is not “one edit away.”

Conclusion:
1. Use SimHash/MinHash for document or chunk-level dedup where feature counts are large.
2. Use edit distance (BK-tree/SymSpell) for word-level near-dup or typo detection.

Performance constraints (why edit distance is practical for words):
1. Word lengths are short: the 99th percentile is around ~12–15 characters, so the DP table is tiny in practice.
2. A 2D edit-distance DP is cache-friendly when filled bottom-up.
3. With small `k` and short words, absolute runtime is typically low even at scale.

## BK-tree vs brute-force edit distance vs trie + DP

Quick comparison for word-level near-duplicate lookup:

1. Brute-force edit distance
Use when the vocabulary is tiny or you only run occasional queries.
Cost per query is `O(n * L^2)` (n words, L word length).
Simple, but does not scale.

2. BK-tree + edit distance
Use when you need “within edit distance <= k” queries with dynamic inserts.
Search cost is roughly `O(v * L^2)` where `v` is the number of visited nodes (often a small fraction for small `k`).
Simple to implement and a strong default for `k=1..2`.

3. Trie + edit distance
Use when you already need prefix/autocomplete or want prefix + fuzzy match in one structure.
Search cost is roughly `O(visited_nodes * L)` per query because you update an edit-distance DP row per trie node.
More complex to implement, but can be fast with pruning for small `k`.

Rule of thumb:
1. Only near-dup lookup → BK-tree.
2. Prefix + near-dup lookup → trie + edit distance.
3. Tiny vocab → brute force is fine.

## Why edit distance + BK-tree fits word-level near-dup

For single words, edit distance matches the problem directly: one typo is usually 1 edit away. A BK-tree (Burkhard-Keller tree) is built for fast “find all items within distance `k`” queries when the distance is a proper metric (edit distance is).

## Edit Distance (Levenshtein) and the DP Intuition

Edit distance is the minimum number of single-character edits (insert, delete, substitute) to transform one word into another.

Dynamic programming intuition:
1. Build a grid where rows are prefixes of `a` and columns are prefixes of `b`.
2. `dp[i][j]` is the edit distance between `a[:i]` and `b[:j]`.
3. The value comes from the cheapest of:
   - delete a char (`dp[i-1][j] + 1`)
   - insert a char (`dp[i][j-1] + 1`)
   - substitute or match (`dp[i-1][j-1] + cost`)
4. This yields the optimal distance in `dp[len(a)][len(b)]`.

Minimal implementation (O(n*m) time, O(m) space):

```python
def edit_distance(a: str, b: str) -> int:
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)

    dp = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        prev = dp[0]
        dp[0] = i
        for j in range(1, len(b) + 1):
            old = dp[j]
            cost = 0 if a[i - 1] == b[j - 1] else 1
            dp[j] = min(
                dp[j] + 1,      # delete
                dp[j - 1] + 1,  # insert
                prev + cost     # substitute/match
            )
            prev = old
    return dp[-1]
```

Why this is often a better fit than sketches:
1. **Direct signal**: edit distance counts insert/delete/substitute operations, which is exactly what typos are.
2. **Deterministic**: distance 1 really means “one edit away.” No hashing noise.
3. **Scale-appropriate**: a single word has too few features for SimHash to be stable; edit distance does not need feature aggregation.
4. **Tunable**: `k=1` or `k=2` gives a clear, interpretable threshold.

When this is a good decision:
1. You care about **word-level** near-duplicates (typos, variants) rather than document-level similarity.
2. You can keep a dictionary or stream history in memory.
3. You need **precision** and interpretability more than massive-scale throughput.

When this is a bad decision:
1. You are deduplicating **documents**, not single words.
2. The vocabulary is enormous and you cannot keep the BK-tree in memory.
3. You need semantic equivalence (synonyms) rather than edit-distance proximity.

Decision summary:
1. Use edit distance + BK-tree for word-typo dedup. It is precise and matches the error model.
2. Use SimHash/MinHash for document/chunk dedup. They scale and tolerate noise at scale.
3. Use embeddings if you care about semantic similarity, not spelling proximity.

How a BK-tree works:
1. Pick any word as the root.
2. For each new word, compute its edit distance to the current node.
3. Insert it into the child edge labeled with that distance.
4. Repeat recursively down the tree.

Why it is fast:
1. For a query word, compute distance `d` to the node.
2. Only explore child edges in the range `[d - k, d + k]`.
3. Everything else is pruned by the triangle inequality.

For near-duplicate words in a stream, good options are:
1. Edit distance + BK-tree. Natural typo handling; fast for small `k` (typically 1–2).
2. Set with normalization (lowercase, strip punctuation). Fast but only exact/normalized matches.
3. Phonetic hashing (Soundex/Metaphone). Useful for names, limited beyond that.
4. SymSpell. Precomputes deletion variants for O(1) lookups, higher memory cost.

BK-tree is not the only option. It is just a good fit when the query is “within edit distance <= k,” especially for small `k` (1–2) with dynamic inserts, which is why it is common in autocomplete and spell-check systems.

Practical guidance:
1. Start with exact/normalized set.
2. If you need typos, add edit distance with a BK-tree.
3. Keep SimHash for document/chunk-level dedup, not single words.

Why the BK-tree helps:
1. Brute-force edit distance scanning is `O(n)` per query.
2. The BK-tree uses the triangle inequality to prune most branches.
3. For a query word with distance `d` to a node, you only explore child edges in `[d-k, d+k]`.
4. For small `k` (1–2), you often check a small fraction of nodes, so lookups scale much better.

Triangle inequality (why pruning is safe):
For any three words `a`, `b`, `c`, a metric distance satisfies:
`dist(a, c) <= dist(a, b) + dist(b, c)`.
That means if `dist(query, node) = d`, any child at edge distance `x` can only be a match if
`x` is in `[d-k, d+k]`. Outside that range, the child cannot be within distance `k` of the query.

Practical complexity note:
1. Edit distance per comparison is `O(n*m)` for word lengths `n` and `m`.
2. Words are short, so per-comparison cost is usually tiny.
3. BK-tree search only computes distance for visited nodes, and pruning keeps that set small for small `k`.
4. Worst-case behavior exists (skewed tree or large `k`), but typical spell-check workloads are fast.
5. Empirically, word lengths are short: the 99th percentile is around ~12 letters for tokens and ~15 for distinct word types (Norvig/Google Books analysis), which keeps DP costs bounded.

Edit distance base case intuition:
1. `dp[i][j]` means the cost to transform `word1[i:]` into `word2[j:]`.
2. If `i == len(word1)`, `word1[i:]` is empty, so the only valid operations are inserting the remaining `word2[j:]` characters.
3. If `j == len(word2)`, `word2[j:]` is empty, so the only valid operations are deleting the remaining `word1[i:]` characters.
4. That is why the base-case cost is exactly the remaining length of the non-empty suffix.

## How can we check if a document is similar to what we've seen so far?

Do we have to calculate SimHash distance against each and every document we have seen so far?
Yes, that baseline works, but it is very slow.

Full-scan baseline (correct but slow):

```python
from simhash import Simhash

corpus = [
    ("a", "the quick brown fox jumps over the lazy dog"),
    ("b", "the quick brown fox jumped over a lazy dog"),
    ("c", "postgres index tuning for large tables"),
]

incoming_doc = "the quick brown fox jumps over lazy dog"
incoming_fp = Simhash(incoming_doc)

for doc_id, text in corpus:
    d = incoming_fp.distance(Simhash(text))
    if d <= 3:
        print("near duplicate:", doc_id, "distance:", d)
```

Better: use `SimhashIndex` from the same package:

```python
from simhash import Simhash, SimhashIndex

corpus = [
    ("a", "the quick brown fox jumps over the lazy dog"),
    ("b", "the quick brown fox jumped over a lazy dog"),
    ("c", "postgres index tuning for large tables"),
]

# Build once
objs = [(doc_id, Simhash(text)) for doc_id, text in corpus]
index = SimhashIndex(objs, k=3)

# Ingestion-time check
incoming_doc = "the quick brown fox jumps over lazy dog"
incoming_fp = Simhash(incoming_doc)
near = index.get_near_dups(incoming_fp)
print("near duplicates:", near)
```

How `SimhashIndex` works:
1. Store one SimHash fingerprint per document.
2. Partition fingerprint bits into blocks and index those blocks.
3. For an incoming document, probe matching blocks to get candidates.
4. Verify candidates with full Hamming distance and keep `distance <= k`.

### SimHash Q&A: shingling, corpus lookup, and API differences

Q: Does the `simhash` library handle shingling for you?  
A: For string input in the common Python `simhash` package, yes, partially. It lowercases text, extracts alphanumeric runs, concatenates them, then applies a sliding window of width 4 (character shingles). If you want word shingles or custom features, pass an iterable of your own features.

Q: What is shingling?  
A: N-grams: a sliding window of size `k` over words or characters. The term comes from overlapping roof shingles.

Q: Why shingle?  
A: SimHash aggregates a bag of features. If features ignore order too much, reordered text can look too similar. Shingling (especially word/char n-grams) encodes local order and usually improves near-dup quality.

Q: Do I need to shingle?  
A: You can use the default string path first. In production, many teams choose explicit features (often word 3-grams) so behavior is predictable and tunable.

Q: What shingle size?  
A: Smaller `k` is more lenient. Larger `k` is stricter. Word 3-grams are a common baseline for text dedup.

Q: Does `Simhash` override `__eq__`?  
A: Yes. It compares by `.value`.

Q: How do you look up against a corpus?  
A: Build `SimhashIndex([(id, Simhash), ...], k=N)`, then call `index.get_near_dups(incoming_hash)`. `k` is the maximum Hamming distance.

Q: Is the doc ID required?  
A: Yes. `SimhashIndex` stores `(id, Simhash)` tuples and returns IDs from `get_near_dups`.

Q: Why `get_near_dups` and not `.query()`?  
A: Different library APIs. `simhash` uses `get_near_dups`; `datasketch` MinHash LSH uses `.query()`.

Deep dive: how `SimhashIndex` works internally

1. Data structure:
Bucketed hash tables backed by `defaultdict(set)`, with entries serialized like `<simhash_hex>,<obj_id>`.
2. Core trick (band partitioning + pigeonhole principle):
A fingerprint is split into `k+1` bands. Example with `f=64` and `k=2`: 3 bands of about 21 bits each. One bucket key is produced per band (`<band_value_hex>:<band_index_hex>`).
3. Why this guarantees recall for true near-dups:
If two fingerprints differ by at most `k` bits, then across `k+1` bands at least one band must match exactly, so true near-duplicates collide in at least one bucket.
4. Lookup flow (`get_near_dups`):
Compute band keys for incoming hash -> fetch bucket candidates -> compute exact Hamming distance -> keep only `distance <= k`.
5. Incremental updates:
`index.add(id, simhash)` can be called anytime; `index.delete(id, simhash)` is also available. This supports streaming dedup: check first, then add if not duplicate.

## Under The Hood: Hash + Query Lookup

### Why normal hash maps are not enough

A standard hash map optimizes exact key equality:
1. `hash("cat")` and `hash("car")` are unrelated.
2. Similarity lookup would require scanning everything.

So we need locality-sensitive indexing, not plain dictionaries.

## How do we avoid full-corpus comparison in production?

1. Define your target objective (Jaccard overlap or cosine-style similarity).
2. Build a sketch + index (MinHash+LSH or SimHash+Hamming index).
3. For each incoming document, compute its sketch and ask the index for candidates.
4. Re-score only those candidates with your stronger/exact metric.
5. Mark as near-duplicate if score/distance crosses your threshold.

Production pattern is a funnel:
1. **Filter** (cheap): LSH/Hamming-block lookup narrows search space.
2. **Candidate pull**: fetch signatures/vectors for only those IDs.
3. **Rank** (expensive): compute exact/stronger score for each candidate against the incoming document.

Example shape:
1. Corpus size `N = 100,000,000`
2. Candidate set `C = 300`
3. Expensive math runs `300` times, not `100,000,000` times.

This is the entire scaling trick.

Practical example with real packages:

```python
from datasketch import MinHash, MinHashLSH
from simhash import Simhash, SimhashIndex

# MinHash + LSH path
lsh = MinHashLSH(threshold=0.5, num_perm=128)
for doc_id, text in corpus:
    mh = MinHash(num_perm=128)
    for token in shingles(text, k=3):
        mh.update(token.encode("utf-8"))
    lsh.insert(doc_id, mh)

# SimHash path
sim_objs = [(doc_id, Simhash(text)) for doc_id, text in corpus]
sim_index = SimhashIndex(sim_objs, k=3)

# Incoming document checks
incoming = "the quick brown fox jumps over lazy dog"
incoming_sim = Simhash(incoming)
near_simhash = sim_index.get_near_dups(incoming_sim)
```

Why this avoids full-corpus iteration (theory):
1. Naive retrieval compares query against `N` docs: `O(N)`.
2. LSH/Hamming indexing probes a small set of buckets: near `O(K)` bucket probes.
3. Exact scoring runs on `C` candidates, where `C << N`: `O(C)`.
4. Total latency is dominated by candidate count, not corpus size.

### MinHash lookup: LSH banding

MinHash signature: a fixed-length list of integers (one per hash function) that approximates Jaccard overlap between two sets. You can think of it as a compact fingerprint where each row is the minimum hash value seen for that hash function.

How a MinHash signature is built (step-by-step):
1. Choose `k` hash functions (signature length = `k` rows).
2. For each feature in the document (e.g., shingles), compute its hash under each hash function.
3. For each hash function, keep the **minimum** value seen across all features.
4. The `k` minima become the signature rows.

Because each row is a minimum over the same feature set, two documents with higher Jaccard overlap tend to share more equal rows in their MinHash signatures.

LSH partitioning: take that signature and split it into bands (contiguous groups of rows). Hash each band into its own bucket table. Two documents become candidates if they collide in at least one band bucket.

Bands are contiguous groups of rows from a MinHash signature. More bands (with fewer rows each) increases recall but can raise false positives; fewer bands increases precision but risks missing near-dups.

How this compares to a SimHash index:
1. **Signature type**: MinHash uses a list of integer hash minima; SimHash uses a fixed-width bit fingerprint (often 64-bit).
2. **Partitioning**: LSH bands split rows of the MinHash signature; SimHashIndex splits the bitstring into blocks.
3. **Collision rule**: MinHash LSH treats any matching band bucket as a candidate; SimHashIndex treats any matching block as a candidate, then filters by full Hamming distance.
4. **Similarity target**: MinHash approximates Jaccard set overlap; SimHash preserves cosine locality on weighted features.
5. **Tuning knobs**: MinHash LSH tunes `(bands, rows per band)`; SimHashIndex tunes `k` (max Hamming distance).

What is `k` in `SimhashIndex(objs, k=0)`?
`k` is the maximum allowed Hamming distance between two fingerprints to be considered a near-duplicate candidate. If `k=0`, only exact fingerprint matches are returned (all 64 bits must match).

How to tune `k` (intuition + back-of-the-envelope):
1. **Interpretation**: each increment of `k` allows one more differing bit in the 64-bit SimHash. Larger `k` = looser matching.
2. **Candidate growth**: for a 64-bit fingerprint, the number of bitstrings within distance `k` is roughly `sum_{i=0..k} C(64, i)`. This grows quickly:
   - `k=0`: `C(64,0)=1` (exact match only)
   - `k=3`: `1 + 64 + 2016 + 41664 ≈ 43,745` neighbors
   - `k=5`: adds `C(64,4)+C(64,5) ≈ 635,376 + 7,624,512` → ~8.3M neighbors
3. **Practical effect**: higher `k` improves recall but can explode candidate counts and false positives; lower `k` is fast but misses softer near-dups.
4. **Rule of thumb**: start with `k=2..4` for short text or strict near-dup, and `k=3..6` for longer text, then measure candidate counts and accuracy.
5. **Measure, don’t guess**: log `near_dups` counts for real traffic, then adjust `k` to hit your target latency/precision.

Diagram (12-row signature split into 3 bands of 4 rows each):

```
MinHash signature (12 rows)
r1   r2   r3   r4   r5   r6   r7   r8   r9   r10  r11  r12
|---- Band 1 ----|---- Band 2 ----|---- Band 3 ----|

Band 1 rows: r1  r2  r3  r4  -> hash -> bucket table 1
Band 2 rows: r5  r6  r7  r8  -> hash -> bucket table 2
Band 3 rows: r9  r10 r11 r12 -> hash -> bucket table 3

Candidate rule: if any band hashes to the same bucket, pull as candidate.
```

Further reading (Wikipedia):
1. [MinHash](https://en.wikipedia.org/wiki/MinHash)
2. [Locality-sensitive hashing](https://en.wikipedia.org/wiki/Locality-sensitive_hashing)
3. [SimHash](https://en.wikipedia.org/wiki/SimHash)
4. [Hamming distance](https://en.wikipedia.org/wiki/Hamming_distance)
5. [Jaccard index](https://en.wikipedia.org/wiki/Jaccard_index)

For a MinHash signature:
1. Split signature into bands.
2. Hash each band into a bucket table.
3. At query time, gather all docs sharing any bucket.
4. Re-score candidates (estimated or exact Jaccard).

This turns "compare against all documents" into "compare against collided candidates."

### SimHash lookup: Hamming-space indexing

For 64-bit SimHash:
1. Choose a distance threshold `k` (e.g., 3).
2. Partition bits into blocks.
3. Index each block in separate tables.
4. Query matching blocks to get candidates.
5. Verify with full Hamming distance (`popcount(a ^ b)`).

Pigeonhole principle gives the guarantee: if two hashes differ by only a few bits, at least one block must match exactly.

### Complexity intuition

1. Brute force similarity search: `O(N)`
2. LSH/Hamming index lookup: near `O(K)` bucket probes (`K` bands/blocks)
3. Exact rank stage: `O(C)` where `C << N`

You still run exact Jaccard/Cosine, but only on `C` candidates against the query.

### Two-tier pseudocode

```python
def query_similar(query):
    candidate_ids = lsh_or_hamming_lookup(query)  # cheap filter
    scored = []
    for doc_id in candidate_ids:
        score = exact_similarity(query, doc_store[doc_id])  # query vs candidate only
        scored.append((doc_id, score))
    return topk(scored)
```

## Corpus Prep: Jaccard vs Cosine

Use different data shapes for different metrics:

1. **Jaccard/MinHash path**:
Normalize -> tokenize -> shingle -> set/hash set.
2. **Cosine path (TF-IDF/embeddings)**:
Normalize -> tokenize -> weighted vectorization.

Practical rule:
1. If you care about overlap of phrasing/chunks, go shingle-set first.
2. If you care about topical similarity, go vector first.

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

## Similarity Learnings Recap

1. Hamming distance is bit-difference count, not cosine itself.
2. SimHash uses Hamming distance as a fast proxy because it preserves cosine locality.
3. MinHash approximates Jaccard overlap on feature sets.
4. For crawl dedup, full-scan distance checks are correct but slow; index first, then verify.
5. In Python `simhash`, `get_near_dups` is the index query API; in `datasketch` MinHash LSH, it is `.query()`.
6. Shingling is n-grams; choose explicit features when you need tighter control over quality.
