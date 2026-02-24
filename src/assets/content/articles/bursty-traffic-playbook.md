# Bursty Traffic: Queue Growth, Tail Latency, and the Control Patterns That Work

Bursty traffic turns small spikes into long queues, high tail latency, and cascading retries. This article is a practical playbook for **why queues blow up** and **how to keep systems stable** with rate limiting, load shedding, backpressure, and retry control.

## Why Bursts Hurt So Much

Queues don’t grow linearly. Once arrival rate exceeds service capacity, queue length and latency can explode. In practice this creates:
- **Excessive queue lengths** and memory pressure.
- **Missed deadlines** that waste work and trigger retries, amplifying overload.
- **Cascading failures** across downstream dependencies.

The Google SRE book highlights how overload leads to long queues and missed RPC deadlines, which in turn cause retry storms and more overload. ([Google SRE: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/))

## The Core Control Patterns

### 1) Load Shedding (Drop Work on Purpose)

When overloaded, reject some requests to keep the system from falling over.

- **Why it works**: It caps queue growth and protects latency for accepted requests.
- **How to implement**: Shed based on in-flight requests, queue length, or CPU load.

The SRE book recommends returning HTTP 503 when in-flight requests exceed a threshold, which is a simple and effective load‑shedding strategy. ([Google SRE](https://sre.google/sre-book/addressing-cascading-failures/))

### 2) Rate Limiting / Traffic Shaping

**Token bucket** allows bursts but enforces a long‑term rate. **Leaky bucket** smooths bursts by leaking at a fixed rate. These are classic network traffic‑shaping primitives. ([Leaky bucket](https://en.wikipedia.org/wiki/Leaky_bucket))

- **Token bucket**: good for user‑facing APIs that allow brief bursts.
- **Leaky bucket**: good for protecting sensitive backends that can’t handle spikes.

### 3) Backpressure

When downstream is overloaded, propagate a “slow down” signal upstream:
- 429/503 with `Retry-After`
- gRPC deadlines and cancellations
- circuit breakers

This prevents unbounded queues and spreads the pain to callers early.

### 4) Retry Control (Prevent Retry Storms)

Retries are necessary but dangerous under overload. The AWS Well‑Architected Framework recommends **exponential backoff with jitter** and limiting retries to avoid retry storms. ([AWS Well‑Architected REL05-BP03](https://docs.aws.amazon.com/wellarchitected/2022-03-31/framework/rel_mitigate_interaction_failure_limit_retries.html))

### 5) Case Study: Dynamo‑style Spikes & Retries

Amazon’s Dynamo paper notes that for workloads with a super‑position of many independent request streams, **aggregate traffic can be bursty**, not smooth. That variability can temporarily overload partitions if retry policies are too aggressive. The Dynamo system design emphasizes **sloppy quorum** and **hinted handoff** to keep writes available under transient overload or partition imbalance. ([Dynamo paper](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf))

## How These Patterns Fit Together

A stable system uses layers:
1. **Rate limiting** at the edge (token bucket).
2. **Backpressure** as load approaches capacity.
3. **Load shedding** when saturation is imminent.
4. **Retry control** to avoid amplification.
5. **Storage-aware safeguards** (e.g., hinted handoff, quorum tuning) for bursty storage workloads.

This is defense‑in‑depth for queues.

## Practical Rules of Thumb

1. **Bound queues**. Unbounded queues = unbounded latency.
2. **Prefer rejection over slow death**. Fail fast keeps the system healthy.
3. **Protect your hottest dependencies**. Shape traffic before it hits databases.
4. **Always cap retries**. A retry storm can turn a blip into an outage.
5. **Assume bursty arrivals**. Dynamo’s observations show that aggregate traffic is not always smooth; design for variance, not just averages. ([Dynamo paper](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf))

## Summary

Bursty traffic is not rare; it is normal. The fix is not “handle all bursts,” but to **shape, shed, and control retries** so your system stays stable under load.

## References

- [Google SRE: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [AWS Well‑Architected: Control and limit retry calls](https://docs.aws.amazon.com/wellarchitected/2022-03-31/framework/rel_mitigate_interaction_failure_limit_retries.html)
- [Leaky bucket algorithm (Wikipedia)](https://en.wikipedia.org/wiki/Leaky_bucket)
- [Amazon Dynamo: Highly Available Key‑value Store](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)
