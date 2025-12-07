# How they work.

How do mutexes actually work?

## Programming Language Level

Mutexes are one of the most simple synchronization primitives. Let's see how we can implement out own.

- Balanced tree ensures logarithmic lookups
- Supports range queries efficiently
- Handles inserts with minimal rebalancing

### Example Query

```go
var mu sync.Mutex


```

## When To Avoid Indexes

> Indexes have a cost. They slow down writes and consume disk space.

Consider skipping indexes on columns with high write throughput or very low selectivity.

[Read the docs](https://www.postgresql.org/docs/current/indexes-intro.html) for deeper guidance.
