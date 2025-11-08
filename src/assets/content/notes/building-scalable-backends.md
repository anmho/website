# Scaling Checklist

Running a backend at scale means balancing latency, throughput, and reliability.

## Core Principles

- Observe before optimizing
- Cache aggressively, invalidate carefully
- Automate recovery paths

### Measuring Success

Use a blend of metrics and tracing:

```yaml
latency_p95: 120ms
throughput_rps: 4500
error_budget: "99.9%"
```

## Avoiding Pitfalls

> Every manual runbook page is a pager incident waiting to happen.

Document failure modes, roll out changes gradually, and always test the rollback plan.

[SRE workbook](https://sre.google/workbook/table-of-contents/) is a great deep dive.


