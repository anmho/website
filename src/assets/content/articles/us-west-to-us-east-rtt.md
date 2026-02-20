# US West to US East RTT: The Number, The Floor, and The Lie

“What is RTT from US West to US East?” sounds like a simple question.

It is simple if you want one number.
It is useful if you want the distribution.

The practical answer for production systems is:
1. **Good cloud backbone path:** usually around **60-85 ms RTT**.
2. **Very clean, lucky path:** can dip into low 60s.
3. **Noisy public internet path:** often **70-110+ ms**.

If you budget one value, use **~70 ms RTT baseline** and design for **~90-120 ms tail**.

## Start With Physics, Not Benchmarks

There is a hard lower bound from propagation delay in fiber.

Signal in fiber is roughly two-thirds the speed of light, and real routes are not straight lines. Packets follow conduit and peering topology, not a map ruler.

That means:
1. There is a best-case floor.
2. Real paths are always above that floor.
3. Network policy (BGP), not geography alone, picks your actual route.

So the “coast-to-coast RTT” is not a constant. It is an outcome.

## Why Your RTT Changes Hour to Hour

Same source region, same destination region, different latency:
1. Different egress PoP at provider edge.
2. Different peering path on transit networks.
3. Queueing under bursty traffic.
4. Path asymmetry (A->B route differs from B->A).

This is why p95 and p99 matter more than p50 for user-perceived responsiveness.

## RTT Is Not Request Latency (But It Multiplies It)

Many people measure RTT once and assume request overhead is roughly that number. It is not.

Connection startup cost is often multiples of RTT:
1. TCP handshake: ~1 RTT.
2. TLS handshake: ~1 RTT (TLS 1.3 full handshake).
3. Request/first-byte path: another RTT-scale component.

If you miss keep-alive or connection reuse, coast-to-coast startup tax gets expensive quickly.

## What This Means for LLM UX

Cross-country RTT leaks into first-token experience:
1. Prompt upload path.
2. Scheduler/queue response path.
3. First token delivery path.

That is why TTFT decomposition matters:
1. Queue.
2. Prefill.
3. Network overhead.

Model-side wins can be hidden by transport and placement decisions.

## Architecture Moves That Actually Help

If you care about interactive latency across US coasts:

1. **Region affinity**: keep users near inference when possible.
2. **Connection reuse**: avoid repeated handshakes.
3. **Stream responses**: surface progress before full completion.
4. **Hedge tail latency**: race/fallback when p99 matters.
5. **Measure by percentile and geography**: global median hides pain.

## A Better Mental Model

Treat RTT as a **budget input**, not a KPI.

Use it to reason about:
1. Handshake overhead.
2. Retry penalties.
3. Streaming smoothness.
4. Tail latency amplification under load.

Asking “what is West-to-East RTT?” is useful.
Building systems as if the answer is a single fixed number is not.

## Practical Budget

For US West <-> US East planning:
1. **Baseline:** 70 ms RTT.
2. **Healthy range:** 60-85 ms.
3. **Tail allowance:** up to 120 ms under real internet variability.

That budget is conservative enough to prevent surprise and tight enough to be actionable.
