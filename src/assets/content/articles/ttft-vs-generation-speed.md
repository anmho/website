# TTFT vs Generation Speed: Why Fast Models Can Feel Slow

Most teams track one number for LLM speed and then wonder why user experience still feels inconsistent.

The issue is that two different latency systems are involved:
1. **Time To First Token (TTFT)**: how long until the first visible output.
2. **Generation speed** (tokens/sec): how fast output continues after the first token.

They are related, but they are not the same bottleneck.

## The Request Timeline

```text
Request arrives
  |
  |-- Queue wait -------- waiting for an available worker/GPU slot
  |
  |-- Prefill ----------- process full prompt through the model
  |                       (parallel over prompt tokens, compute-heavy)
  |
  |-- First token ------- TTFT ends here
  |
  |-- Decode loop ------- token 2..N, autoregressive generation
                          tokens/sec is measured here
```

A model can be:
1. Fast TTFT, slower decode (quick start, slower stream).
2. Slow TTFT, faster decode (slow start, quick stream).

Both feel different to users.

## TTFT = Queue + Prefill

TTFT is dominated by two terms:

```text
TTFT = queue_wait + prefill_compute
```

Queue wait depends on serving conditions:
1. Current load.
2. Fleet headroom.
3. Scheduler quality.

Prefill depends on model and prompt:
1. Prompt length.
2. Model size/architecture.
3. Hardware class and kernel efficiency.

Rule of thumb:
1. Short prompts: queue often dominates.
2. Long prompts: prefill dominates.

## Why “Fastest Model” Is Not One Number

Provider A can have better average TTFT while Provider B has better decode rate. In production, the winner for user-perceived speed depends on request shape:
1. Short answer + short prompt: TTFT dominates.
2. Long answer + short prompt: decode rate matters more.
3. Long prompt + long answer: both matter, but prefill can dwarf everything else.

This is why two products can both truthfully claim “faster” while optimizing different phases.

## Typical Infra Levers

The useful optimizations map to specific phases:

1. **Continuous batching**: reduces queueing inefficiency.
2. **Chunked prefill**: prevents giant prompts from stalling everyone else.
3. **KV reuse/prefix caching**: cuts repeated prefill work.
4. **Speculative decoding**: improves effective decode throughput.
5. **MoE-style serving**: reduces per-token active compute in some architectures.

If TTFT is your pain, prioritize queue and prefill.
If long outputs feel slow, prioritize decode path.

## Racing Providers: Why It Works

When teams race multiple providers, the main gain is not “average winner speed.” It is **tail-latency hedging**:
1. One provider has a transient queue spike.
2. Another has a cold path.
3. A region is degraded.

Racing wins by avoiding bad moments, not just picking the best benchmark.

Cost tradeoff is usually:
1. One full winner generation.
2. One or more canceled loser attempts after first token.

For many interactive products, the p95/p99 latency gain is worth that overhead. If not, use priority fallback instead of parallel racing.

## What To Measure In Practice

Track these separately:

1. **TTFT** (p50/p95/p99).
2. **Inter-token latency** (or tokens/sec during decode).
3. **Queue wait** (explicit server-side metric).
4. **Prompt length buckets** (e.g. 0-2k, 2k-8k, 8k+ tokens).

Without prompt-length segmentation, TTFT charts are noisy and hard to act on.

## A Simple Decision Framework

If users say “it takes too long to start”:
1. Instrument queue vs prefill split.
2. Reduce queue spikes (capacity, batching policy).
3. Reduce prefill cost (prompt size, cache reuse).

If users say “it starts fast but drags”:
1. Focus on decode throughput and streaming path.
2. Revisit model choice and speculative decode.

The practical lesson: treat first-token latency and generation speed as separate SLOs. One number hides too much.
