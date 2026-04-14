# Admission Control: Client, Service, and Proxy Layers

When a system is overloaded, the first instinct is to scale up. But scaling takes time, and traffic spikes can be instantaneous. **Admission control** is the discipline of deciding upfront whether to accept a unit of work at all — before you pay the cost of doing it. Done well, it protects SLOs under overload. Done poorly, it drops healthy traffic or lets the system spiral.

This article covers the three canonical layers where admission control lives, compares them with the adjacent patterns of load shedding, backpressure, throttling, and rate limiting, and shows idiomatic Go implementations at each layer.

---

## The Vocabulary Problem First

These terms are often used interchangeably, but they mean different things:

| Pattern | Where the decision lives | What it controls | Mechanism |
|---|---|---|---|
| **Rate limiting** | Edge / gateway | Request *rate* over a time window | Token bucket, fixed window, sliding window |
| **Throttling** | Client or service | Request *rate*, enforced by the caller | Retry delays, leaky-bucket client |
| **Admission control** | Any layer | Whether to *admit* a new unit of work now | In-flight count, queue depth, CPU, latency gradient |
| **Load shedding** | Service | Which admitted requests to *drop* when at capacity | Random/priority shedding after admission |
| **Backpressure** | Service → caller | Signal to the caller to *slow down* | 429/503 + Retry-After, blocked channel, gRPC flow control |

The key distinction: **rate limiting controls the rate of arriving requests**, while **admission control controls the number of concurrently in-flight requests** (or queue depth). Load shedding drops work already accepted. Backpressure propagates the overload signal upstream. Throttling is rate limiting enforced by the client rather than the server.

A complete system uses all of them, at different layers.

---

## Layer 1: Client-Side Admission Control

The client decides whether to even attempt a call. This prevents the server from ever seeing requests it cannot handle, and it makes retries safe — because a well-behaved client will back off before retrying.

### When to use it

- Batch jobs, crawlers, or background workers that can afford to slow down.
- Any client that issues retries — you want the retry logic to be congestion-aware.
- Mobile / edge clients that must stay within quotas.

### The classic approach: concurrency limiting

Instead of rate-limiting (N requests per second), limit the number of **in-flight** requests. This adapts automatically to service latency: if the server slows down, fewer new requests are sent because the in-flight slots are still occupied.

```go
// ConcurrencyLimiter limits concurrent outbound calls.
type ConcurrencyLimiter struct {
    sem chan struct{}
}

func NewConcurrencyLimiter(max int) *ConcurrencyLimiter {
    return &ConcurrencyLimiter{sem: make(chan struct{}, max)}
}

// Acquire blocks until a slot is available or ctx is cancelled.
func (c *ConcurrencyLimiter) Acquire(ctx context.Context) error {
    select {
    case c.sem <- struct{}{}:
        return nil
    case <-ctx.Done():
        return ctx.Err()
    }
}

func (c *ConcurrencyLimiter) Release() {
    <-c.sem
}

// Usage in a worker pool:
func callWithLimit(ctx context.Context, lim *ConcurrencyLimiter, url string) error {
    if err := lim.Acquire(ctx); err != nil {
        return fmt.Errorf("admission rejected: %w", err)
    }
    defer lim.Release()
    // ... make the actual HTTP call
    return nil
}
```

### Adaptive client-side control: AIMD

TCP's congestion control uses **Additive Increase, Multiplicative Decrease (AIMD)**. You can apply the same idea to client concurrency:

```go
// AdaptiveLimiter adjusts its concurrency limit based on error feedback.
type AdaptiveLimiter struct {
    mu    sync.Mutex
    limit float64
    min   float64
    max   float64
    inflight int
}

func NewAdaptiveLimiter(initial, min, max float64) *AdaptiveLimiter {
    return &AdaptiveLimiter{limit: initial, min: min, max: max}
}

// OnSuccess increases limit additively.
func (a *AdaptiveLimiter) OnSuccess() {
    a.mu.Lock()
    defer a.mu.Unlock()
    a.limit = math.Min(a.limit+1, a.max)
}

// OnOverload decreases limit multiplicatively.
func (a *AdaptiveLimiter) OnOverload() {
    a.mu.Lock()
    defer a.mu.Unlock()
    a.limit = math.Max(a.limit*0.5, a.min)
}

func (a *AdaptiveLimiter) TryAdmit() bool {
    a.mu.Lock()
    defer a.mu.Unlock()
    if float64(a.inflight) >= a.limit {
        return false
    }
    a.inflight++
    return true
}

func (a *AdaptiveLimiter) Release() {
    a.mu.Lock()
    defer a.mu.Unlock()
    a.inflight--
}
```

Netflix's **concurrency limiter** library (used inside Hystrix and later Resilience4j) is built on this idea. On a 503 or timeout, multiply the limit down; on success, add one back.

### Real-world example: Google gRPC client-side flow control

gRPC clients have a built-in `MaxConcurrentStreams` per HTTP/2 connection. When you exceed it, the call blocks (or returns RESOURCE_EXHAUSTED immediately with the right option). This is client-side admission control baked into the protocol.

```go
// gRPC with client-side concurrency limit
conn, err := grpc.Dial(addr,
    grpc.WithTransportCredentials(insecure.NewCredentials()),
    // Block when at capacity instead of erroring immediately.
    grpc.WithBlock(),
)
```

### Pros and cons

**Pros:**
- Prevents useless work from even leaving the client.
- Makes retry storms impossible — a congestion-aware client stops retrying when overloaded.
- No round-trip cost; the decision is local.

**Cons:**
- Each client must implement it; a misbehaving client bypasses it entirely.
- Hard to coordinate across a large fleet of heterogeneous clients.
- May be too conservative: one slow server penalises all clients of that pool.

---

## Layer 2: Service-Side Admission Control

The service itself decides whether to accept and process an incoming request before allocating significant resources to it. This is the most common form of admission control in Go services.

### Concurrency-based: counting in-flight requests

The simplest form. Reject with 503 when in-flight count exceeds a threshold.

```go
type Server struct {
    maxInflight int64
    inflight    atomic.Int64
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    cur := s.inflight.Add(1)
    defer s.inflight.Add(-1)

    if cur > int64(s.maxInflight) {
        http.Error(w, "overloaded", http.StatusServiceUnavailable)
        return
    }
    s.handle(w, r)
}
```

The Google SRE book recommends exactly this pattern as a primary overload defence: reject when in-flight exceeds a threshold, and return 503 rather than queuing indefinitely. ([Google SRE: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/))

### Queue-depth-based: bounded work queues

Instead of rejecting immediately, enqueue the request but cap the queue length.

```go
type WorkQueue struct {
    jobs chan func()
}

func NewWorkQueue(workers, queueSize int) *WorkQueue {
    wq := &WorkQueue{jobs: make(chan func(), queueSize)}
    for i := 0; i < workers; i++ {
        go func() {
            for job := range wq.jobs {
                job()
            }
        }()
    }
    return wq
}

// Submit returns false (admission rejected) when the queue is full.
func (wq *WorkQueue) Submit(job func()) bool {
    select {
    case wq.jobs <- job:
        return true
    default:
        return false // shed this request
    }
}
```

If `Submit` returns false, respond with 503. The `default` case makes the channel non-blocking — critical for not blocking the accept loop.

### CPU / latency gradient: adaptive admission

Static thresholds are fragile. A better approach measures the *gradient* of latency: if p99 is rising steeply, reduce admission before you hit the wall.

```go
// LatencyAdmissionController uses a sliding-window average to adapt.
type LatencyAdmissionController struct {
    mu          sync.Mutex
    window      []time.Duration
    windowSize  int
    threshold   time.Duration // above this, start shedding
    shedFraction float64       // fraction to shed when over threshold
    rng         *rand.Rand
}

func (c *LatencyAdmissionController) Admit() bool {
    c.mu.Lock()
    defer c.mu.Unlock()
    if len(c.window) < c.windowSize {
        return true // not enough data yet
    }
    var sum time.Duration
    for _, d := range c.window {
        sum += d
    }
    avg := sum / time.Duration(len(c.window))
    if avg < c.threshold {
        return true
    }
    // Probabilistic shedding proportional to how far over threshold we are.
    overage := float64(avg-c.threshold) / float64(c.threshold)
    shed := math.Min(overage*c.shedFraction, 0.9)
    return c.rng.Float64() >= shed
}

func (c *LatencyAdmissionController) Record(d time.Duration) {
    c.mu.Lock()
    defer c.mu.Unlock()
    if len(c.window) >= c.windowSize {
        c.window = c.window[1:]
    }
    c.window = append(c.window, d)
}
```

This is the idea behind **Netflix's server-side concurrency limiter** and Uber's **QALM** (Quality-Adaptive Load Management). Instead of a fixed limit, the controller infers overload from latency signals.

### Priority-based admission

Not all requests are equal. A login request is more important than a background analytics ping. Priority-aware admission admits critical traffic first:

```go
type Priority int

const (
    PriorityHigh   Priority = 0
    PriorityNormal Priority = 1
    PriorityLow    Priority = 2
)

type PriorityAdmitter struct {
    inflight   atomic.Int64
    hardLimit  int64  // always reject above this
    softLimit  int64  // shed low priority above this
    lowerLimit int64  // shed normal priority above this
}

func (p *PriorityAdmitter) Admit(pri Priority) bool {
    cur := p.inflight.Load()
    switch pri {
    case PriorityHigh:
        return cur < p.hardLimit
    case PriorityNormal:
        return cur < p.lowerLimit
    case PriorityLow:
        return cur < p.softLimit
    }
    return false
}
```

Google's production systems use priority levels extensively. The SRE book describes how Google's backends accept critical traffic even when shedding bulk background jobs. ([Google SRE Book](https://sre.google/sre-book/addressing-cascading-failures/))

### Real-world example: Go's `golang.org/x/net/netutil`

Go's standard library includes `netutil.LimitListener`, which caps the number of open connections at the TCP accept level — before any HTTP parsing happens. This is admission control at the OS boundary.

```go
import "golang.org/x/net/netutil"

ln, _ := net.Listen("tcp", ":8080")
ln = netutil.LimitListener(ln, 1000) // at most 1000 concurrent connections
http.Serve(ln, handler)
```

### Pros and cons

**Pros:**
- Centralised: every client is subject to it, regardless of how it behaves.
- Can incorporate server-side signals (CPU, memory, queue depth, latency).
- Can enforce priorities across different request classes.

**Cons:**
- Adds latency to the hot path (atomic operations, mutex).
- Wrong thresholds cause spurious rejections in normal load.
- Does not prevent the request from traversing the network; the client still paid the RTT.

---

## Layer 3: Proxy-Side Admission Control (Envoy)

A sidecar proxy like Envoy sits between caller and callee. It sees all traffic and can enforce admission control before the request ever reaches application code. This is especially powerful in a service mesh (Istio, Linkerd) where the proxy is deployed universally.

### Envoy's built-in mechanisms

**1. Circuit breaking (upstream cluster config)**

```yaml
# envoy.yaml — upstream cluster with circuit breaker thresholds
clusters:
  - name: my_service
    connect_timeout: 0.25s
    type: STRICT_DNS
    circuit_breakers:
      thresholds:
        - priority: DEFAULT
          max_connections: 100        # TCP connections to upstream
          max_pending_requests: 50    # requests waiting for a connection
          max_requests: 200           # concurrent active requests
          max_retries: 3
          # Once exceeded, Envoy returns 503 without forwarding
    load_assignment:
      cluster_name: my_service
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: my-service.default.svc.cluster.local
                    port_value: 8080
```

When `max_requests` is exceeded, Envoy immediately returns 503 (with `x-envoy-overloaded: true`) without forwarding. This is **proxy-side admission control** — the upstream never sees the request.

**2. Global rate limiting via rate limit service**

```yaml
# HTTP filter: call an external rate limit service (e.g., Envoy's reference implementation)
http_filters:
  - name: envoy.filters.http.ratelimit
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
      domain: my_api
      request_type: external
      failure_mode_deny: false   # fail open if rate limit service is down
      rate_limit_service:
        grpc_service:
          envoy_grpc:
            cluster_name: rate_limit_cluster
        transport_api_version: V3
```

This calls a central rate limit service (like [envoyproxy/ratelimit](https://github.com/envoyproxy/ratelimit)) before forwarding. The service can enforce per-user, per-IP, or per-endpoint limits across the entire fleet.

**3. Envoy's overload manager**

Envoy has a built-in overload manager that monitors heap size and CPU and sheds load when resource usage exceeds thresholds:

```yaml
overload_manager:
  refresh_interval: 0.25s
  resource_monitors:
    - name: "envoy.resource_monitors.fixed_heap"
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.resource_monitors.fixed_heap.v3.FixedHeapConfig
        max_heap_size_bytes: 2147483648  # 2 GiB
  actions:
    - name: "envoy.overload_actions.shrink_heap"
      triggers:
        - name: "envoy.resource_monitors.fixed_heap"
          threshold:
            value: 0.85   # start shrinking at 85% heap
    - name: "envoy.overload_actions.stop_accepting_requests"
      triggers:
        - name: "envoy.resource_monitors.fixed_heap"
          threshold:
            value: 0.95   # hard stop at 95% heap
```

**4. Adaptive concurrency filter (experimental)**

Envoy has an adaptive concurrency filter that auto-tunes the upstream concurrency limit using gradient-based control (similar to TCP BBR's approach):

```yaml
http_filters:
  - name: envoy.filters.http.adaptive_concurrency
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.adaptive_concurrency.v3.AdaptiveConcurrency
      gradient_controller_config:
        sample_aggregate_percentile:
          value: 90       # use p90 latency as the signal
        concurrency_limit_params:
          concurrency_update_interval: 0.1s
          max_concurrency_limit: 1000
        min_rtt_calc_params:
          interval: 60s   # recalculate minimum RTT every 60s
          request_count: 50
      enabled:
        default_value: true
        runtime_key: "adaptive_concurrency.enabled"
```

The gradient controller continuously estimates the ideal concurrency window. When latency climbs above the baseline (min RTT), it reduces admission; when latency is low, it expands it.

### Real-world example: Istio + Envoy at scale

In Istio deployments, Envoy sidecars enforce circuit breakers at the destination level. A service with a `DestinationRule` like this:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: UPGRADE
        http1MaxPendingRequests: 50
        http2MaxRequests: 200
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

…will automatically eject unhealthy instances and cap concurrent requests per upstream pod. No application code change is required. This is transparent proxy-side admission control.

### Pros and cons

**Pros:**
- Language-agnostic: works with any backend, including legacy services.
- Centralises policy without touching application code.
- Can enforce global fleet-wide limits via an external rate limit service.
- Envoy's metrics (active requests, pending requests, circuit state) are available out of the box in Prometheus.

**Cons:**
- Adds a network hop and serialisation overhead to every call.
- Misconfigured circuit breakers cause cascading false-positive 503s.
- Adaptive concurrency filter is experimental and can behave unexpectedly under mixed workloads.
- Debugging requires understanding both Envoy config and the application behaviour simultaneously.

---

## Comparing All Five Patterns Side by Side

```
Request arrives
       │
       ▼
┌─────────────────────────────────────────┐
│  RATE LIMITING (edge)                   │
│  Is the request rate within the quota?  │
│  No → 429 Too Many Requests             │
└──────────────────┬──────────────────────┘
                   │ Yes
                   ▼
┌─────────────────────────────────────────┐
│  PROXY ADMISSION (Envoy circuit breaker)│
│  Is upstream concurrency below limit?  │
│  No → 503 (x-envoy-overloaded)         │
└──────────────────┬──────────────────────┘
                   │ Yes (forwarded)
                   ▼
┌─────────────────────────────────────────┐
│  SERVICE ADMISSION CONTROL              │
│  Is in-flight count below threshold?   │
│  No → 503 Service Unavailable          │
└──────────────────┬──────────────────────┘
                   │ Yes (admitted)
                   ▼
┌─────────────────────────────────────────┐
│  LOAD SHEDDING (inside the service)     │
│  Is this request within SLO time budget?│
│  No (queue too deep) → drop with 503   │
└──────────────────┬──────────────────────┘
                   │ Yes (processing)
                   ▼
              Handle request
                   │
                   ▼
        ┌──────────────────┐
        │  BACKPRESSURE     │
        │  If slow: emit   │
        │  Retry-After or  │
        │  block upstream  │
        └──────────────────┘
```

### When each is the right tool

**Rate limiting** — when you want to enforce a budget per caller identity (user ID, API key, IP). Best at the edge/gateway. Does not adapt to server health.

**Throttling** — when you want the *client* to self-police. Add jitter and exponential backoff. Critical for retry safety. Most effective as a client-library concern.

**Admission control (service-side)** — when you want to protect a specific server from being overwhelmed regardless of who is calling. Use in-flight count + latency gradient for adaptive behaviour.

**Admission control (proxy-side)** — when you have a heterogeneous fleet and want consistent policy without touching application code. Best combined with service mesh observability.

**Load shedding** — when you have already accepted a request but the queue is so deep that it will miss its deadline anyway. Drop it early to reclaim resources. Effective for background work deprioritisation.

**Backpressure** — when you want to slow callers rather than drop requests. Natural fit for streaming or pipeline architectures where the caller *can* slow down. Less useful when callers are external (you can't force them to slow down).

---

## Putting It Together: A Go Service with Layered Control

Here is a single HTTP handler that combines service-side admission control, priority-based shedding, and deadline propagation:

```go
type OverloadHandler struct {
    inner       http.Handler
    maxInflight int64
    inflight    atomic.Int64
}

func (h *OverloadHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // 1. Check deadline before doing anything.
    deadline, hasDeadline := r.Context().Deadline()
    if hasDeadline && time.Until(deadline) < 5*time.Millisecond {
        http.Error(w, "deadline already exceeded", http.StatusGatewayTimeout)
        return
    }

    // 2. Admission: count in-flight requests.
    cur := h.inflight.Add(1)
    defer h.inflight.Add(-1)

    // 3. Priority-aware shedding: low-priority requests shed earlier.
    priority := r.Header.Get("X-Request-Priority")
    limit := h.maxInflight
    if priority == "low" {
        limit = h.maxInflight / 2
    }
    if cur > limit {
        w.Header().Set("Retry-After", "1")
        http.Error(w, "overloaded", http.StatusServiceUnavailable)
        return
    }

    // 4. Propagate a shorter deadline to downstream calls.
    if hasDeadline {
        var cancel context.CancelFunc
        ctx, cancel := context.WithDeadline(r.Context(), deadline.Add(-10*time.Millisecond))
        defer cancel()
        r = r.WithContext(ctx)
    }

    h.inner.ServeHTTP(w, r)
}

func NewOverloadHandler(inner http.Handler, maxInflight int) *OverloadHandler {
    return &OverloadHandler{inner: inner, maxInflight: int64(maxInflight)}
}
```

This composes naturally as middleware:

```go
mux := http.NewServeMux()
mux.HandleFunc("/api/", myAPIHandler)

handler := NewOverloadHandler(mux, 500)
http.ListenAndServe(":8080", handler)
```

---

## Real-World Reference Points

**Google**: The SRE book documents that Google backends use in-flight count as the primary overload signal, not rate. They distinguish "critical" from "non-critical" traffic and shed non-critical first. ([Google SRE: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/))

**Netflix**: Hystrix (now maintenance mode) pioneered client-side circuit breakers in the JVM world. The successor, Resilience4j, uses a `BulkheadFullException` that maps directly to service-side admission control. Netflix open-sourced the `concurrency-limits` library implementing AIMD and Vegas-style gradient control.

**AWS**: The Builders' Library article "Using load shedding to avoid overload" explicitly distinguishes admission control from rate limiting and recommends measuring queue depth and server CPU as admission signals. ([AWS Builders' Library](https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/))

**Envoy / Istio**: Envoy's circuit breaker is deployed at scale across Lyft, Airbnb, Pinterest, and most large Kubernetes-based services. The `max_requests` threshold in the circuit breaker config is admission control in exact terms.

**gRPC**: The gRPC framework has built-in flow control at the HTTP/2 stream level. `MaxConcurrentStreams` on the server and client sides is admission control baked into the wire protocol. When the limit is hit, the framework returns `RESOURCE_EXHAUSTED` without invoking the handler.

---

## Common Mistakes

**Setting thresholds too low**: a threshold of 100 in-flight requests on a service that normally runs at 200 will cause spurious 503s. Calibrate from production p99 data, not guesses.

**No Retry-After header**: dropping requests with 503 without a `Retry-After` header teaches clients to retry immediately, amplifying the overload. Always include it.

**Circuit breaker that never opens**: a circuit breaker with `consecutive5xxErrors: 50` will tolerate 50 consecutive errors before ejecting. In a high-traffic system that is far too many. Start with 3–5 consecutive errors or a percentage threshold.

**Admission control without observability**: if you cannot see `inflight_current` and `inflight_max` in your dashboards, you will not know whether admission control is firing until users complain. Instrument it.

**Applying rate limiting instead of admission control for CPU-bound services**: a CPU-bound service at 1000 RPS may be fine, but at 1001 RPS it starts queuing. Rate limiting at 1000 RPS does not help if request latency varies 10x. Admission control (in-flight count) adapts; a fixed rate limit does not.

---

## Summary

Admission control is not one thing — it is a family of decisions made at three different layers, each with a different vantage point and cost model:

1. **Client-side**: prevent useless work from leaving the process. Best implemented with concurrency limits + AIMD. Makes retries safe.
2. **Service-side**: protect the server regardless of caller behaviour. Best implemented with in-flight count + latency gradient. Supports priority classes.
3. **Proxy-side (Envoy)**: enforce policy across a heterogeneous fleet without touching application code. Best combined with service mesh metrics and outlier detection.

Layer them. Rate limit at the edge to enforce quotas. Use proxy circuit breakers to isolate unhealthy upstreams. Use service-side admission to protect against latency spikes. Use backpressure to slow cooperative clients. Use load shedding as the last line of defence to protect p99 for traffic you do accept.

The combination is defence-in-depth for overload. No single layer is sufficient alone.

---

## References

- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [AWS Builders' Library: Using load shedding to avoid overload](https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/)
- [Envoy Proxy: Circuit breaking](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking)
- [Envoy Proxy: Adaptive concurrency filter](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/adaptive_concurrency_filter)
- [Netflix: Performance Under Load](https://netflixtechblog.medium.com/performance-under-load-3e6fa9a60581)
- [Istio: Traffic Management — Destination Rules](https://istio.io/latest/docs/reference/config/networking/destination-rule/)
- [gRPC: Flow Control](https://grpc.io/docs/guides/flow-control/)
