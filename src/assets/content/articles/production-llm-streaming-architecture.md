# Production LLM Streaming Architecture

Token streaming looks simple in a demo and gets complicated in production.

The key is to evolve in stages instead of overbuilding on day one.

## Stage 1: Direct SSE (Cheapest + Fastest)

The demo version is one process, and this is usually the right place to start:
1. Call provider.
2. Forward chunks to browser over SSE.
3. Let disconnects tear everything down.

Why teams start here:
1. Lowest latency path.
2. Lowest infra cost.
3. Smallest operational surface area.

This is the best default for MVPs and low-scale workloads.

## Stage 2: Decouple When Reliability Requirements Arrive

Direct streaming eventually hits operational limits:
1. Pod restarts/redeploys kill in-flight streams.
2. Reconnects often restart generation.
3. Resuming from exact token offset is awkward.
4. Stateful pods and affinity constraints make scaling harder.

At that point, separate _generation_ from _delivery_.

## The Production Shape (When You Need It)

Use two independent planes:
1. **Worker plane**: talks to provider, produces token events.
2. **API plane**: reads token events and streams to browser via SSE.

Shared state sits in Redis Streams, not pod memory.

```text
LLM Provider
    |
    | token chunks (HTTP stream)
    v
Worker Pod
    |
    | XADD stream:req_id
    v
Redis Stream (append-only log)
    ^
    | XREAD BLOCK from last_id
    |
API Pod (stateless, any pod)
    |
    | SSE events (id + data)
    v
Client Browser (auto reconnect + Last-Event-ID)
```

Result: no sticky sessions, no consistent hashing, and no “user must reconnect to the same pod” failure mode.

This is not “always better.” It is better once resiliency and resumability matter more than absolute simplicity.

## Why Redis Streams

For this pattern, you need:
1. Ordered append log.
2. Replay from offset.
3. Cheap operational footprint.

Redis Streams gives you that with one data type.

### What `XADD` Actually Does

`XADD` appends an event to a stream key and returns a globally ordered ID.

```text
XADD stream:req_abc123 * token "Hello"
      ^ key            ^ ^ field-value payload
                       |
                       * auto-generate entry ID
```

You end up with entries like:

```text
stream:req_abc123
  1708300000000-0  {"token": "Hello"}
  1708300000050-0  {"token": " world"}
  1708300000100-0  {"done": "true"}
```

That ID is your resume cursor.

## How The API Pod Consumes Without Polling

Use `XREAD BLOCK`.

This is not client-side polling. Redis blocks server-side and returns as soon as a new entry lands.

```python
entries = await redis.xread({f"stream:{req_id}": last_id}, block=5000)
```

Operationally, this is low CPU and low latency (roughly one Redis network RTT once data exists).

## Resume Semantics: Use SSE The Way It Was Designed

SSE already has built-in resume:
1. Server emits `id: <stream_entry_id>`.
2. Browser reconnects automatically.
3. Browser sends `Last-Event-ID`.
4. Server resumes `XREAD` from that ID.

```python
# emit
yield f"id: {entry_id}\ndata: {token}\n\n"

# reconnect
last_id = request.headers.get("Last-Event-ID", "0")
entries = await redis.xread({f"stream:{req_id}": last_id}, block=5000)
```

No custom client offset protocol required.

## Stream Lifetime: Per Generation, Not Per Chat

Treat streams as ephemeral transport buffers.

Pattern:
1. One stream per generation request (`req_id`).
2. Persist final assistant message to durable storage.
3. Expire stream quickly.

```python
async for chunk in provider.stream(prompt):
    await redis.xadd(f"stream:{req_id}", {"token": chunk.text})
await redis.xadd(f"stream:{req_id}", {"done": "true"})

await db.save_message(chat_id=chat_id, role="assistant", content=full_text)
await redis.expire(f"stream:{req_id}", 300)
```

This keeps Redis cost bounded and removes lifecycle ambiguity.

## Disconnect Policy Is A Product Decision, Not Just Infra

You need an explicit policy for “client disappeared mid-generation”.

1. **Always finish**
   - Best resume UX.
   - Can waste tokens.
2. **Timeout (N seconds)**
   - Usually best default.
   - Handles refreshes/network blips.
3. **Immediate cancel**
   - Lowest token waste.
   - Reconnect often means restart.

Most chat products pick **always finish** or **short timeout**.

## Shutdown and Cleanup Semantics (Python)

If your stream path uses async generators, shutdown behavior needs to be explicit.

1. `task.cancel()` only schedules cancellation.
2. You must await task completion to run cleanup.
3. Ctrl+C under `asyncio.run()` follows the same cancellation chain.

Safe shutdown:

```python
for t in pending:
    t.cancel()

await asyncio.gather(*pending, return_exceptions=True)
```

Skipping the `gather` step is how you end up with generator cleanup races (`aclose(): asynchronous generator is already running`).

## Redis Streams vs Alternatives

You can ship with several primitives, but they are not equivalent:

1. **Redis List**
   - simple, destructive queue.
   - weak replay story.
2. **Redis Pub/Sub**
   - transient broadcast, no history.
3. **Redis Stream**
   - replayable log with per-consumer offsets.
4. **Kafka**
   - strongest durability/scale options.
   - significantly higher operational cost.

For token streaming, Redis Streams usually hits the right point on the complexity curve.

## Practical Checklist

1. Emit SSE `id` from Redis stream entry IDs.
2. Resume using `Last-Event-ID`.
3. Keep API pods stateless.
4. Use one stream per generation request.
5. Persist final response to durable DB.
6. TTL stream keys aggressively.
7. Define disconnect policy explicitly.
8. Always cancel _and await_ pending tasks on shutdown.

This architecture is one pragmatic pattern that tends to stay predictable once retries, deploys, reconnects, and higher traffic are in play.
