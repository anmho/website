# Python Threading Primitives and Queues (and how they compare to asyncio)

Python has two parallel toolkits that solve different problems:
- **`threading`** for OS threads.
- **`asyncio`** for cooperative async tasks.

This article explains the **main threading primitives**, how **`queue.Queue`** fits in, how **`asyncio.Queue`** differs, and when to use **`asyncio.to_thread`**.

## Threading Primitives (Core Building Blocks)

The `threading` module provides these core primitives:
- **Lock**: a basic mutex.
- **RLock**: a re-entrant lock (same thread can acquire multiple times).
- **Condition**: wait/notify with an underlying lock.
- **Semaphore / BoundedSemaphore**: limit concurrent access to a resource.
- **Event**: one-to-many signaling.
- **Barrier**: coordinate a group of threads at a rendezvous point.
- **Timer**: run a function after a delay.
- **Thread**: the actual execution unit.

These are the fundamental tools you combine to build thread-safe coordination and blocking protocols. ([threading docs](https://docs.python.org/3.12/library/threading.html))

## queue.Queue (Thread-Safe Producer/Consumer)

`queue.Queue` is the standard thread-safe FIFO queue for multi-producer, multi-consumer workloads. It handles the locking for you and supports FIFO, LIFO, and Priority variants. ([queue docs](https://docs.python.org/3/library/queue.html))

Common pattern:

```python
import queue
import threading

q = queue.Queue()

def worker():
    while True:
        item = q.get()
        try:
            process(item)
        finally:
            q.task_done()

threading.Thread(target=worker, daemon=True).start()
```

## asyncio.Queue (Task-Safe, Not Thread-Safe)

`asyncio.Queue` looks similar, but it is **not thread-safe** and is designed for async/await tasks. It supports `await put()` and `await get()`, and integrates naturally with async task scheduling. ([asyncio queue docs](https://docs.python.org/3/library/asyncio-queue.html))

Key difference:
- **`queue.Queue`** → safe across OS threads.
- **`asyncio.Queue`** → safe across asyncio tasks **within one event loop**.

## When to Use asyncio.to_thread

`asyncio.to_thread()` lets you run a blocking function in a separate OS thread without blocking the event loop. It is intended for **IO-bound** functions and propagates the current `contextvars.Context`. ([asyncio tasks docs](https://docs.python.org/3.9/library/asyncio-task.html))

Example:

```python
import asyncio
import time

def blocking_io():
    time.sleep(1)
    return "done"

async def main():
    result = await asyncio.to_thread(blocking_io)
    print(result)

asyncio.run(main())
```

Note: Due to the GIL, `to_thread` is not a general CPU-parallelism solution, but it is a clean escape hatch for blocking IO in async code. ([asyncio tasks docs](https://docs.python.org/3.9/library/asyncio-task.html))

## A Practical Decision Table

- **Threading primitives + queue.Queue**
  Use when you need multi-threaded coordination or worker pools.

- **asyncio primitives + asyncio.Queue**
  Use when you’re inside an event loop and want structured task concurrency.

- **asyncio + to_thread**
  Use when you must call blocking code from async code.

## Summary

- `threading` gives you Locks, Conditions, Semaphores, Events, Barriers, and Thread.
- `queue.Queue` is the thread-safe producer/consumer workhorse.
- `asyncio.Queue` is task-safe and designed for async/await.
- `asyncio.to_thread` bridges blocking IO into async apps.

## References

- [threading — Python docs](https://docs.python.org/3.12/library/threading.html)
- [queue — Python docs](https://docs.python.org/3/library/queue.html)
- [asyncio.Queue — Python docs](https://docs.python.org/3/library/asyncio-queue.html)
- [asyncio.to_thread — Python docs](https://docs.python.org/3.9/library/asyncio-task.html)
