# LLM Inference: From Zero to Modern

Most people meet LLMs through chat UIs. Underneath, inference is a systems problem: memory pressure, queueing, scheduling, and latency tradeoffs.

This guide goes bottom-up from naive generation to modern production serving.

## Level 0: The Core Loop

Inference is simple in definition:
1. Given tokens, predict the next token.
2. Append it.
3. Repeat.

```text
f(sequence) -> logits over vocabulary
f(token, cache) -> (logits, updated_cache)   # decode step
```

Naive autoregressive generation:

```python
def generate(prompt_ids, model, max_tokens=100):
    sequence = list(prompt_ids)
    for _ in range(max_tokens):
        logits = model(sequence)       # full forward pass
        next_logits = logits[-1]
        next_token = sample(next_logits)
        if next_token == EOS:
            break
        sequence.append(next_token)
    return sequence
```

The problem is obvious at scale: you keep reprocessing the same prefix.

## Level 1: KV Cache

The first real optimization is KV cache.

Attention for token `t` needs:
1. `Q` from current token.
2. Historical `K, V` from prior tokens.

Cache historical `K, V` once; append new entries as decode advances.

### Prefill vs Decode

```text
Prefill phase:
  Input: full prompt [t1..tP]
  Output: first next-token logits + KV cache for positions 1..P

Decode phase:
  Input: one token + existing KV cache
  Output: next-token logits + cache appended by 1 token
```

```python
def generate(prompt_ids, model, max_tokens=100):
    logits, cache = model.prefill(prompt_ids)
    next_token = sample(logits[-1])
    sequence = list(prompt_ids) + [next_token]

    for _ in range(max_tokens - 1):
        logits, cache = model.decode(next_token, cache)
        next_token = sample(logits)
        if next_token == EOS:
            break
        sequence.append(next_token)
    return sequence
```

KV cache shape (per layer/head):

```text
K: [batch, num_heads, seq_len, head_dim]
V: [batch, num_heads, seq_len, head_dim]
```

## Level 2: Batching

Single-request inference underutilizes GPU hardware.

Static batching improves utilization, but has a tail-latency issue:
1. Short requests wait behind long requests.
2. Batch turnover is gated by slowest item.

## Level 3: Continuous Batching

Continuous batching fixes that by replacing finished requests immediately.

```text
T0: [A prefill] [B prefill] [C prefill] [D prefill]
T1: [A decode ] [B decode ] [C decode ] [D decode ]
T2: [A EOS    ] [B decode ] [C decode ] [D decode ]
T3: [E prefill] [B decode ] [C decode ] [D decode ]   # A replaced by E
```

Outcome:
1. Higher occupancy.
2. Better throughput under mixed request lengths.

## Level 4: The Real Bottleneck Is Memory

KV cache dominates serving economics.

It scales with:
1. batch size
2. context length
3. layer/head dimensions

Naive per-request contiguous allocation causes fragmentation and over-reservation.

## Level 5: PagedAttention (vLLM)

PagedAttention treats KV cache like virtual memory.

Instead of contiguous blocks per request:
1. Split cache into fixed-size blocks (pages).
2. Allocate blocks on demand.
3. Track logical-to-physical mapping via block tables.

```text
Request A logical blocks: [0] [1] [2] -> physical [P3] [P7] [P1]
Request B logical blocks: [0] [1]     -> physical [P3] [P9]      (shared prefix)
```

Benefits:
1. lower fragmentation
2. tighter memory-to-work ratio
3. prefix sharing becomes practical

## Level 6: Speculative Decoding

Decode is memory-bound and token-serial. Speculative decoding adds parallel verification.

Pattern:
1. Small draft model proposes `k` tokens.
2. Target model verifies candidates in one pass.
3. Accept longest correct prefix.

```text
Draft proposes:  "The" "quick" "brown"
Target verifies:  ✓      ✓      ✗
Accept: "The quick"
Resample from rejection point
```

When draft quality is strong, this reduces expensive target passes.

## Level 7: Prefill-Decode Disaggregation

Prefill and decode have different hardware profiles:

```text
Prefill: compute-heavy, parallel-friendly
Decode : memory-bandwidth-heavy, token-serial
```

Running both on one pool causes interference. Disaggregation separates them:

```text
[Prefill cluster] -- KV/state handoff --> [Decode cluster]
```

This is the serving analogue of separating ingestion and query paths in data systems.

## Level 8: Prefix Caching

Many workloads repeat long prefixes (system prompts, policy blocks, shared context).

Without prefix caching:
1. Every request repays full prefill cost.

With prefix caching:
1. Reuse cached prefix KV.
2. Prefill only the suffix delta.

This is one of the highest leverage optimizations in enterprise chat workloads.

## Level 9: The Modern Inference Stack

```text
KV cache
  + continuous batching
  + paged KV memory management
  + speculative decoding
  + prefill/decode separation
  + prefix reuse
= production-grade serving
```

## Metrics That Actually Matter

1. `TTFT` (time to first token)
   - mostly prefill and queueing.
2. `ITL` (inter-token latency)
   - decode path quality.
3. Throughput (tokens/s)
   - aggregate system capacity.
4. Goodput
   - useful output per unit compute (penalizes wasted work).

## Practical Engineering Takeaways

1. Early wins come from KV cache and batching.
2. Real scale usually fails on memory layout, not math kernels.
3. Tail behavior dominates user experience more than median throughput.
4. Prefix reuse and queue policy often beat model-level micro-optimizations.
5. Treat inference serving as a systems architecture problem, not a single-model benchmark.

## Further Reading

1. vLLM / PagedAttention paper.
2. DistServe (prefill/decode disaggregation).
3. SGLang (prefix/radix-style caching approaches).
4. Speculative decoding work (Leviathan et al.).
