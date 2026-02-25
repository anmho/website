# Probability in a Stream: Exact vs Approximate Design

This article walks through the “Probability in Stream” problem as a systems‑minded interview question. It covers the exact solution, the memory‑bounded variant, and why sampling 3 items tells you almost nothing about uniformity.

## The Problem

You get a stream of integers and must implement:

- `update(x)`
- `get_distribution()` → exact empirical `P(x)=count(x)/N`
- `sample_three()` → 3 **uniform** samples from all observed items
- `test_uniformity(alpha)` → chi‑square goodness‑of‑fit

You must handle empty streams, <3 items, single unique value, and skewed data.

## Exact Design (What the spec asks for)

Data structures:
- `counts: dict[int, int]`
- `total: int`
- `values: list[int]` (all items for exact sampling)

### Update (O(1))

```python
counts[x] += 1
total += 1
values.append(x)
```

### Exact distribution

```python
return {k: v / total for k, v in counts.items()}
```

### Exact sampling of 3

```python
if total < 3:
    return random.sample(values, k=total)
return random.sample(values, k=3)
```

## Why sampling 3 points is weak evidence

Three samples are weak evidence of **uniformity** because:
1. Sample size is tiny → high variance, low power.
2. Skewed distributions can still produce “uniform‑looking” triples.
3. It’s not a hypothesis test. You need counts + chi‑square to make a claim.

## Uniformity Test (Chi‑square)

Null hypothesis: values are uniform over the **observed unique** values.

- Expected count per value: `E = N / K`
- Test statistic: `χ² = Σ((O − E)² / E)`
- Decision: reject if `p‑value < alpha`

Rule of thumb: chi‑square is unreliable for small samples; you want expected counts per bin ≥ 5 (often ≥ 10), so roughly `N ≳ 5 × K` (or `10 × K`).

## Memory‑Bounded Variant (Approximate)

If you can’t store everything:

- **Bloom filter** for approximate membership (seen before?).
- **HLL** for approximate number of uniques `|U|`.
- **Count‑Min Sketch** for approximate per‑value counts.
- **Reservoir sampling** for uniform samples without storing the full stream.

This version is **approximate** and no longer satisfies “exact distribution.”

### Before vs After (Exact vs Approximate)

**Before (ExactProbabilityStream):**
- `counts: dict[int, int]`
- `values: list[int]`
- `uniques: set[int]`

**After (ApproximateProbabilityStream):**
- `counts: CountMinSketch`
- `values: reservoir sample`
- `uniques: HyperLogLog`
- `seen: BloomFilter`

### Recommended Python Libraries (Approximate Stack)

- **Count‑Min Sketch**: Apache DataSketches `count_min_sketch`. citeturn0search2turn0search6
- **HyperLogLog**: Apache DataSketches HLL wrappers (production‑grade). citeturn0search2  
  Alternative: `datasketch` provides HLL/HLL++ in a lighter pure‑Python package. citeturn0search3
- **Bloom filter**: `bloom-filter2` (pure Python). citeturn0search0

### Approximate counting

Count‑Min Sketch gives overestimates with bounded error, so any uniformity test becomes **heuristic**, not statistically valid.

## Edge Cases

- **Empty stream**: distribution `{}`, samples `[]`, uniformity “not enough data.”
- **< 3 items**: return available items without replacement.
- **Single unique value**: distribution is `{x: 1.0}` and uniformity is trivially true.
- **Skewed data**: chi‑square should reject when sample size is sufficient.

## Verbal Walkthrough Notes (Interview)

- Start with the **exact** solution: hash map counts + total + values list.
- Mention reservoir sampling for unbounded streams.
- Explain chi‑square: null hypothesis, expected counts, p‑value decision.
- Call out the **small‑sample limitation**.
- Offer the **approximate variant**: Bloom + HLL + CMS.

## Related Concept: Singleflight / Request Coalescing

When many identical requests arrive at once, **singleflight** (request coalescing) ensures only one does the expensive work while the rest wait and reuse the result. This is a temporary “in‑flight cache,” and you can still store the completed result in a normal cache afterward.

## Summary

- Exact spec: counts + total + stored values.
- Sampling 3 is not evidence of uniformity.
- Chi‑square gives a real test, but needs enough samples.
- Memory‑bounded design uses Bloom/HLL/CMS + reservoir sampling.
