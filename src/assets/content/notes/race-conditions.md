# Race Conditions, Deadlocks, and Liveness

Concurrency bugs are not one category. Some produce the wrong value, some stop all progress, and some let the system run forever while one request never gets served.

The useful distinctions are **safety** — nothing bad happens — and **liveness** — something good eventually happens.

### A race is an interleaving problem

A race condition exists when the outcome depends on the relative timing of concurrent operations.

The smallest example is a lost update. `count++` is not one operation; it is a read, an addition, and a write:

```go
var count int
var wg sync.WaitGroup

wg.Add(2)
for i := 0; i < 2; i++ {
    go func() {
        defer wg.Done()
        count++
    }()
}

wg.Wait()
// count is not guaranteed to be 2
```

Both goroutines can read `0`, both compute `1`, and both write `1`. The program has lost an update even though each individual instruction looks harmless.

A **data race** is the narrower, language-level case: two goroutines access the same memory concurrently, at least one access is a write, and there is no synchronization ordering those accesses.

The broader logic race can exist even when every memory access is synchronized. A program that checks a permission, then uses it later, can race with a permission revocation between those two steps.

### Atomicity, visibility, and ordering

Every shared-state fix needs to answer three separate questions:

- **Atomicity:** can another goroutine observe this operation halfway through?
- **Visibility:** when will another goroutine observe the write?
- **Ordering:** which events are guaranteed to happen before which other events?

A mutex can provide all three for the protected region. An atomic increment provides atomicity for that value, but it does not automatically make a related multi-field state transition safe.

For example, this is still broken if readers need `ready` and `value` to agree:

```go
value = 42
ready.Store(true)
```

The reader needs a defined synchronization relationship between the publication of `value` and the observation of `ready`. The [Go memory model](https://go.dev/ref/mem) defines those guarantees; timing and intuition do not.

### Happens-before is the contract

Synchronization is useful because it establishes a **happens-before** relationship. If event A happens-before event B, B is allowed to rely on the effects of A.

Common Go synchronization edges include:

- A channel send happens before the corresponding receive completes.
- An `Unlock` happens before a later `Lock` on the same mutex completes.
- A `WaitGroup.Done` contributes to the `Wait` that unblocks.
- A goroutine's creation happens before the goroutine begins running.

This is why sleeping is not synchronization. A 100 ms delay might hide a scheduling bug on one machine and expose it on another. It establishes no ordering guarantee.

### Choose the smallest correct ownership model

The safest shared state is state that is not shared. Give one goroutine ownership of a value and communicate with it through a channel:

```go
type request struct {
    delta int
    done  chan int
}

func counter() chan<- request {
    requests := make(chan request)

    go func() {
        value := 0
        for req := range requests {
            value += req.delta
            req.done <- value
        }
    }()

    return requests
}
```

If shared memory is the clearer model, protect the entire invariant with a mutex:

```go
type Account struct {
    mu      sync.Mutex
    balance int
}

func (a *Account) Deposit(amount int) {
    a.mu.Lock()
    defer a.mu.Unlock()

    a.balance += amount
}
```

Use an atomic for an isolated scalar where the operation itself is the invariant:

```go
var requests atomic.Int64

requests.Add(1)
```

Do not replace a mutex with an atomic just because the field is an integer. If the operation touches multiple fields, the invariant belongs inside one critical section or inside one owner goroutine.

### Deadlock: no one can make progress

A deadlock is a liveness failure where a set of goroutines wait forever for one another.

The classic lock deadlock needs four conditions, often called the Coffman conditions:

- **Mutual exclusion:** a resource has one owner at a time.
- **Hold and wait:** a goroutine holds one resource while waiting for another.
- **No preemption:** the resource cannot be taken away safely.
- **Circular wait:** the wait graph contains a cycle.

Two locks acquired in opposite orders create the cycle:

```go
// Goroutine A: locks left, then right.
left.Lock()
right.Lock()

// Goroutine B: locks right, then left.
right.Lock()
left.Lock()
```

Neither goroutine needs to be buggy in isolation. The bug is in the combined ordering.

Prevent deadlocks by imposing one global lock order, acquiring one lock at a time, reducing lock scope, or moving ownership into a single event loop. Context cancellation can bound a wait, but cancellation alone does not release a mutex; the code still needs a cleanup path.

### Livelock: everyone is active, nobody progresses

A livelock is a liveness failure without blocked threads. Participants keep changing state in response to one another, but the system makes no useful progress.

Two workers repeatedly backing off at the same deterministic interval are a simple example:

```text
worker A: detect conflict → release → wait 10 ms → retry
worker B: detect conflict → release → wait 10 ms → retry
worker A: detect conflict → release → wait 10 ms → retry
worker B: detect conflict → release → wait 10 ms → retry
```

The fix is not merely “retry faster.” Add asymmetry: randomized jitter, a coordinator, bounded retries, or a rule that lets one participant keep the resource.

Livelock often appears in polite conflict-resolution code. Every worker yields correctly, but if every worker yields at the same time, politeness becomes synchronized failure.

### Starvation: progress exists, but not for you

Starvation occurs when the system continues serving work while one goroutine or request waits indefinitely.

Causes include an unfair scheduler, a hot producer that monopolizes a worker, priority inversion, or retry logic that always favors newer work.

Fix it with bounded waits, queue fairness, aging priorities, admission limits, or separate capacity for latency-sensitive work. A timeout detects starvation; it does not make the scheduling policy fair.

### Not every race is a data race

This check-then-act sequence can be wrong even if the map itself is protected by a mutex:

```go
if !store.Exists(key) {
    store.Create(key)
}
```

Another request can create `key` after the check. The operation needs one atomic `CreateIfAbsent`, a transaction, or a database uniqueness constraint.

The same shape appears in caches, job claims, inventory, token refreshes, and idempotency keys. Ask whether the **decision and the action** must be one indivisible operation.

### Finding and fixing concurrency bugs

Run Go's race detector during tests and realistic workloads:

```sh
go test -race ./...
go test -race -run TestConcurrentClaim -count=100 ./...
```

The [race detector](https://go.dev/doc/articles/race_detector) finds observed unsynchronized memory accesses. It cannot prove that an unexecuted schedule is safe, and it cannot detect every higher-level logic race.

Make bad schedules easier to observe: use barriers instead of sleeps, run with multiple repetitions, inject delays at ownership boundaries, and record queue age, lock wait time, retry counts, and cancellation reasons.

### A review checklist

- Can this state be owned by one goroutine instead?
- What exact invariant does the synchronization protect?
- Are the decision and the action atomic together?
- Is there a documented lock order?
- Can any wait be unbounded?
- Does cancellation release every resource?
- Does `go test -race ./...` run in CI?

Concurrency becomes tractable when ownership, ordering, and progress are explicit. The goal is not to eliminate parallelism; it is to make every shared transition and every possible wait explainable.
