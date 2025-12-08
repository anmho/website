# Defining a deadlock

### A deadlock can happen if the four following conditions apply. These are known as the Coffman Conditions:

- Mutual Exclusion: A concurrent process holds exclusive rights to a resource at any one time.
- Hold and Wait: A process or thread must be simultaneously waiting for a resource while holding access to a resource.
- No Preemption: A resource held by a process/thread can only be released by that process/thread
- Circular Wait: Suppose we have Process A and Process B. A must be waiting for B to release a resource, while B is simultaneously waiting for A to release its resource.

### Creating a deadlock

Fastest way to deadlock on purpose:

```go
package main
import "sync"

func main() {
    var mu sync.Mutex

    mu.Lock()
    mu.Lock()
}
```
