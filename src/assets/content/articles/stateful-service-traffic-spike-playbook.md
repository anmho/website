# Unexpected Traffic Spikes on Stateful Services

Stateless services are annoying during a traffic spike. Stateful services are dangerous.

If an API tier gets hot, you can often add pods, shed requests, or route around a bad instance. If a Valkey or Redis-style cluster gets hot, you are dealing with data placement, hot keys, connection storms, replication lag, client retry behavior, and cluster topology changes. The mitigation is not just "scale it up." Scaling changes the shape of the system while clients are already stressed.

This is the playbook I would want open during an incident.

## First Decide What Kind of Overload It Is

CPU is the visible symptom, but it is not the whole diagnosis. Before changing topology, split the spike into a few buckets.

### Look at the traffic shape

Ask:

- Is total QPS up, or is one command/key suddenly hot?
- Are reads hot, writes hot, or both?
- Are commands cheap (`GET`, `SET`) or expensive (`KEYS`, large `ZRANGE`, Lua, big multi-key operations)?
- Is the p99 rising before CPU hits 100%, or only after?
- Are clients retrying and amplifying the original spike?

A single hot key is a different incident from broad organic growth. A retry storm is different from a real user spike. A slow command spike is different from a high-QPS cheap-command spike.

### Check saturation signals, not just CPU

Useful signals:

- server CPU
- command latency by operation
- p95/p99 end-to-end latency
- instantaneous ops/sec
- connected clients
- rejected connections
- network in/out
- memory and eviction pressure
- replication lag
- cluster redirections (`MOVED`, `ASK`)
- client-side timeout and retry rate
- hot keys or skewed slot distribution

CPU tells you the server is busy. The other signals tell you whether it is busy doing useful work, retry work, migration work, eviction work, or one pathological command pattern.

## CPU Band 1: Elevated but Stable

Roughly: CPU is high enough to care about, but latency is still inside SLO and queues are not exploding.

This is the best time to act because the system can still absorb controlled changes.

### Remove obvious waste

Start with the cheapest mitigations:

- disable expensive debug/admin traffic
- stop batch jobs, backfills, cache warmers, and analytics scans
- reduce polling frequency
- disable non-critical features that fan out to the stateful store
- tighten client timeouts so abandoned work does not pile up

Do not start with a topology change if a background job is the source of the spike.

### Add read capacity where it is safe

If the service can tolerate stale reads, move some read paths to replicas. This works best for cache-style use cases where slight replica lag is acceptable.

Be careful with:

- read-after-write paths
- counters and locks
- rate limiters
- session mutation
- any path where replica lag becomes user-visible correctness drift

Replica reads can buy time, but they do not fix a write-heavy primary or a single hot key that every replica now has to serve.

### Pre-warm before the herd arrives

If the spike is predictable, warm keys before the traffic hits:

- precompute expensive values
- refresh hot cache entries early
- stagger TTLs
- add jitter to refresh jobs
- warm only the small set of likely hot keys, not the whole cache

The goal is to avoid a cold-cache stampede where every caller discovers the same miss at the same time.

## CPU Band 2: High and Latency Is Moving

Roughly: CPU is persistently high, latency is climbing, and the system is near the point where retries will make things worse.

At this point, the goal changes. You are not trying to serve everything. You are trying to preserve goodput.

### Start load shedding before saturation

Load shedding should happen before the stateful service is at 100% CPU. If you wait until then, callers are already timing out and retrying.

Good shedding signals:

- in-flight requests to the stateful backend
- backend p95/p99 latency
- client timeout rate
- pending queue depth
- backend CPU
- replication lag
- connection errors
- command-specific latency

CPU alone is a weak signal. A server at 85% CPU with stable p99 may be fine. A server at 65% CPU with p99 rising and retry rate climbing may already be unhealthy.

### Shed by value, not randomly

Prefer dropping or degrading low-value traffic first:

- background refreshes
- analytics writes
- non-critical personalization
- expensive search/autocomplete enrichment
- best-effort counters
- cache warming jobs
- low-priority tenants

Keep the core user path alive. If you drop randomly, you may waste capacity on traffic that users do not care about while failing important requests.

### Brown out expensive features

Brownout is controlled feature degradation:

- skip optional cache lookups
- return simpler responses
- serve stale values
- reduce page size
- turn off expensive aggregations
- disable fan-out enrichment
- cap leaderboard or sorted-set ranges

This is often better than binary fail-open/fail-closed behavior. You keep the product usable while reducing pressure on the backend.

### Clamp retries

A traffic spike plus retries becomes a thundering herd.

During overload:

- use exponential backoff with jitter
- cap retry attempts
- respect `Retry-After`
- retry only idempotent operations
- make clients stop retrying after their deadline
- avoid synchronized retry intervals

The dangerous pattern is thousands of clients timing out at the same threshold and retrying together. That turns a backend slowdown into a self-sustaining retry storm.

### Use CPU throttling carefully

There are two different things people mean by CPU throttling.

The useful version is throttling callers or background work before they hit the stateful service:

- reduce worker concurrency
- slow cache refresh jobs
- pause backfills
- lower per-tenant request budgets
- pace expensive endpoints
- reduce fan-out from the application tier

That kind of throttling reduces offered load.

The dangerous version is letting the stateful service itself get CPU-throttled by a container limit while clients keep sending the same traffic. That often makes latency worse. Commands take longer, in-flight work grows, clients time out, retries increase, and the backend does even more work per successful request.

For Valkey/Redis-like systems, CPU throttling is usually a control you apply around the backend, not a cure you apply to the backend.

## CPU Band 3: Saturated or Failing

Roughly: CPU is pinned, p99 is bad, errors are rising, and clients are timing out.

At this point, every new unit of work is suspect. Recovery usually requires reducing load faster than the system can accumulate queued work.

### Fail fast at the edge

If the stateful service is already saturated, do not let every request reach it.

Use:

- edge or gateway 429/503 responses
- service-side admission control
- per-tenant concurrency caps
- global request budgets
- circuit breakers around the stateful dependency
- short backend deadlines

Fast rejection is kinder than slow timeout. Slow timeout consumes client resources, server resources, and backend resources, then often triggers a retry.

### Protect the backend connection pool

Connection storms can be as damaging as command volume.

Mitigations:

- cap client connections
- reuse pooled connections
- lower idle connection churn
- stop aggressive health checks
- prevent every app pod from opening too many backend connections
- prefer bounded wait queues over unbounded connection acquisition

When every application instance opens a large pool to every Valkey node, scaling the app tier can accidentally DDoS the stateful tier.

### Kill the bad workload if you can identify it

If a known job, tenant, command, endpoint, or key pattern is causing the spike, stop that first.

Examples:

- pause the backfill
- disable a tenant
- block an endpoint
- reject one expensive command path
- temporarily deny large multi-key requests
- turn off a scheduled recomputation job

Surgical mitigation is better than broad shedding when you can do it quickly and safely.

## Scaling Up Without Making It Worse

Scaling stateful services is slower and riskier than scaling stateless services. You can add capacity, but capacity has to be attached to data.

### Vertical scale buys headroom

Increasing CPU, memory, or network bandwidth can help when the bottleneck is per-node capacity.

It is usually the least conceptually risky option because it avoids reshuffling the keyspace. The cost is that it may require failover, restart, or provider-specific maintenance behavior. It also does not fix a single hot key if one thread or one shard remains the bottleneck.

### Horizontal scale changes key placement

Adding Valkey/Redis Cluster shards means moving hash slots between nodes. That gives you more aggregate capacity, but it also introduces a transition period where the cluster topology is changing.

During resharding, clients may see redirections:

```text
MOVED 3999 10.0.4.12:6379
ASK 3999 10.0.4.12:6379
```

`MOVED` means the slot now belongs somewhere else. A cluster-aware client should update its slot map and send future commands to the new owner.

`ASK` is a temporary redirection during migration. The client should send the redirected command to the target node for now, without permanently updating the slot map in the same way it would for `MOVED`.

If clients are not cluster-aware, stale, or misconfigured, a reshard can look like an application outage even when the cluster is behaving correctly.

### Why `CROSSSLOT` shows up

Valkey/Redis Cluster partitions data by hash slot. A multi-key command can only run when all involved keys are in the same slot.

This can fail:

```text
MGET user:1 profile:9
```

because the two keys may hash to different slots.

The cluster returns:

```text
CROSSSLOT Keys in request don't hash to the same slot
```

The fix is either to avoid multi-key cross-slot commands or to use hash tags intentionally:

```text
MGET user:{42}:profile user:{42}:settings
```

The substring inside `{}` determines the hash slot, so those keys colocate.

Hash tags are useful, but they are also dangerous. If you put too much traffic under one tag, you create a hot slot that cannot be spread across shards.

### Why scale-up can surface these errors

The errors are not caused by "more CPU." They are caused by topology and key placement becoming visible:

- a reshard moves slots and clients receive `MOVED` or `ASK`
- old clients keep sending commands to stale owners
- non-cluster-aware clients do not follow redirections
- multi-key commands hit keys spread across slots
- hash tags concentrate too much traffic into one slot
- pipelines may contain commands for different slots

In a steady state, some of these mistakes may be rare or hidden. During scaling, resharding, failover, and retries make them obvious.

## Hot Keys, Hot Slots, and Hot Swapping

Not all overload is broad. Often one key, one slot, or one command pattern is the incident.

### Detect skew

Look for:

- one primary at much higher CPU than peers
- one hash slot receiving disproportionate traffic
- one key dominating command samples
- one endpoint causing most backend calls
- one tenant or customer creating most load

If the load is skewed, adding random capacity may not help. The hot item still lands somewhere.

### Split hot keys

For read-heavy hot keys:

- replicate the value under multiple physical keys
- randomly read from one of N copies
- refresh copies asynchronously
- keep TTL jittered across copies

For write-heavy hot keys:

- shard counters into multiple buckets
- aggregate periodically
- move exact computation off the request path
- use approximate counters where the product allows it

The tradeoff is correctness and complexity. You are turning one precise object into many objects with merge behavior.

### Hot swap the path, not just the server

Hot swapping during an incident can mean temporarily changing the code path:

- switch from exact to approximate counts
- route reads to stale snapshots
- serve cached static fallbacks
- bypass non-critical writes
- move a tenant to a dedicated cluster
- route a hot endpoint to a special pool
- swap one key schema for a sharded-key schema behind a feature flag

The safest hot swap is one you prepared before the incident. If the fallback path has never been exercised, it is not really a fallback.

## Thundering Herd Patterns

Stateful backends often get hurt by synchronization. The system does not just receive too much work. It receives the same work at the same time.

### Cache stampede

Many clients observe the same cache miss and recompute the same value.

Mitigations:

- singleflight request coalescing
- stale-while-revalidate
- probabilistic early refresh
- TTL jitter
- per-key locks with short deadlines
- serving stale data when recomputation is already in progress

The important rule: one miss should trigger one recomputation, not one recomputation per caller.

### Reconnect herd

A failover, deploy, or network blip drops many clients. They all reconnect immediately.

Mitigations:

- connection retry jitter
- client-side circuit breakers
- capped connection pools
- gradual rollout and restart pacing
- server-side connection admission

The reconnect herd can happen even after the original backend issue is resolved. The recovery path becomes the outage.

### TTL herd

Many keys expire together because they were written together or share a fixed TTL.

Mitigations:

- add TTL jitter
- use soft TTL plus background refresh
- spread scheduled refresh work
- avoid synchronized cron-based invalidation

Fixed TTLs are simple, but synchronized expiry is a common way to manufacture a spike.

## A Practical Incident Sequence

During a spike, I would work in this order.

### 1) Stabilize

- stop known batch jobs
- cap retries
- throttle callers and background work
- shorten backend deadlines
- enable priority shedding
- disable optional features
- protect connection pools
- serve stale where possible

The first goal is to stop making the queue bigger.

### 2) Identify the shape

- broad QPS spike or hot key?
- read-heavy or write-heavy?
- one command or all commands?
- one tenant or all tenants?
- one node or all nodes?
- retry amplification or real demand?

Do not reshard a hot-key problem until you know it is a slot-capacity problem.

### 3) Add capacity carefully

- vertically scale if per-node headroom is the fastest safe option
- add replicas for stale-tolerant reads
- reshard only with cluster-aware clients and redirection handling verified
- watch `MOVED`, `ASK`, `CROSSSLOT`, retry rate, and p99 during the change

Capacity changes should reduce pressure, not create a second incident.

### 4) Make the temporary controls explicit

Track every incident-time change:

- which features were browned out
- which tenants were limited
- which jobs were paused
- which TTLs or schemas were changed
- which retry settings were tightened

Many outages have a second phase caused by forgetting to unwind emergency mitigations.

## The Main Takeaway

Unexpected spikes on stateful services are not solved by one lever.

Scaling can help, but it can also expose cluster topology problems through `MOVED`, `ASK`, and `CROSSSLOT` errors. Load shedding protects the backend, but only if it uses the right signals and sheds lower-value work first. CPU throttling and brownouts can preserve the core path, but only if clients stop retrying blindly. Hot keys require schema and routing changes, not just more nodes.

The durable fix is to design for overload before the incident: bounded queues, jittered retries, stale-serving paths, cluster-aware clients, hot-key escape hatches, and dashboards that distinguish broad overload from skew.
