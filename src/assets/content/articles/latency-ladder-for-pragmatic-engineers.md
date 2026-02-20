# Latency Ladder for Pragmatic Engineers

Latency work gets easier when you carry a few back-of-the-envelope budgets in your head.

This is a practical cheat sheet spanning:
1. Local compute
2. Network RTT
3. Handshake overhead
4. LLM first-token latency

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

Ranges vary by corpus and hardware. Use this for planning, not benchmarking claims.

## L1, L2, L3: Why Cache Misses Matter

Rough order-of-magnitude latency:
1. L1 cache hit: sub-nanosecond to ~1ns class.
2. L2 cache hit: few ns.
3. L3 cache hit: ~10ns class.
4. DRAM: tens of ns to ~100ns+.

The point is not exact numbers. The point is scale: a miss that falls out of cache is often an order-of-magnitude jump.

## RTT Budgets You Should Memorize

Useful mental defaults:
1. Same AZ / same region service call: single-digit ms.
2. US West <-> US East: ~60-85ms healthy, budget ~70ms baseline.
3. Tail reality for public internet: 90-120ms+ is common.

That tail is what users feel.

## TCP/TLS Handshake Tax

Startup is often RTT-multiplied:
1. TCP 3-way handshake: ~1 RTT.
2. TLS 1.3 full handshake: ~1 RTT.
3. First request/first-byte: additional RTT-scale component.

If you do not reuse connections, coast-to-coast startup can easily cost hundreds of milliseconds before application logic runs.

## LLM TTFT: Separate Queue, Prefill, and Network

A practical TTFT decomposition:

```text
TTFT ~= queue_wait + prefill_compute + network_overhead
```

Why this matters:
1. Queue is infra/scheduling.
2. Prefill is model/prompt/hardware.
3. Network is placement/transport.

A model can have strong decode speed and still feel slow if queue+prefill+network dominates first token.

Example shape (illustrative):
1. GPT-4o-style fast path: lower queue + efficient prefill -> lower TTFT band.
2. Slower path under load: queue spikes dominate and TTFT jumps even with same model.

## End-to-End Rule of Thumb

When debugging latency:
1. Start with percentile budgets (p50/p95/p99), not averages.
2. Split compute from transport.
3. Count handshake RTTs explicitly.
4. Measure queue and prefill separately for LLMs.

Most production wins come from reducing variance and tails, not shaving microseconds off the median.
