# How do nil channels behave?

### Receiving from a nil channel

```go
var c chan string

<- c
```

Receiving from a nil channel will cause a deadlock

### Sending to a nil channel

```go
var c chan string
<- c
```

Sending to a nil channel will deadlock

### Ranging over a nil channel

```go
var c chan string
for range c {
}
```

Ranging over a nil channel will deadlock

### Closing a nil channel

```go
var c chan string

close(c)
```

Closing a nil channel will panic
