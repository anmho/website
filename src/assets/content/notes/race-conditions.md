# Race conditions

A race condition happens when concurrent code accesses shared state and at least one access is a write. The result depends on the order in which the operations happen.

### Lost updates

`count++` is a read, an increment, and a write. Two goroutines can both read the same value before either writes it back:

```go
var count int
var wg sync.WaitGroup

wg.Add(2)
go func() {
    defer wg.Done()
    count++
}()
go func() {
    defer wg.Done()
    count++
}()

wg.Wait()
// count is not guaranteed to be 2
```

The race detector can find this class of bug:

```sh
go test -race ./...
```

### Synchronize shared state

Use a mutex when an operation needs to protect a larger critical section:

```go
var mu sync.Mutex
var count int

mu.Lock()
count++
mu.Unlock()
```

For a single counter, an atomic operation is a smaller alternative:

```go
var count atomic.Int64

count.Add(1)
```

The [Go memory model](https://go.dev/ref/mem) defines which reads are guaranteed to observe writes. The practical rule is simple: every shared write needs an intentional synchronization strategy, or the program has a data race.
