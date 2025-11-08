---
title: Database Indexing Test
---

# Optimizing Lookups

Database indexes help the query planner locate rows quickly.

## B-Tree Overview

B-Tree indexes are the default structure in most relational databases.

- Balanced tree ensures logarithmic lookups
- Supports range queries efficiently
- Handles inserts with minimal rebalancing

### Example Query

```sql
SELECT *
FROM users
WHERE email = 'andrew@example.com';
```

## When To Avoid Indexes

> Indexes have a cost. They slow down writes and consume disk space.

Consider skipping indexes on columns with high write throughput or very low selectivity.

[Read the docs](https://www.postgresql.org/docs/current/indexes-intro.html) for deeper guidance.

