# Peekaboo adaptive Overpass scans

Peekaboo v0.7 adds a bounded recovery path for public Overpass queries that fail because a viewport is expensive to evaluate.

## Normal path

A scan always starts as one viewport-bounded Overpass request using the existing endpoint failover logic. A successful normal request remains the preferred path and is labeled `single` in exported query metadata.

## When sharding is allowed

Peekaboo only considers a 2×2 fallback after congestion-like failures such as:

- request timeout / timeout remarks
- HTTP 429
- HTTP 502
- HTTP 503
- HTTP 504
- Overpass runtime/out-of-memory style failures

Malformed responses, invalid JSON and ordinary bad-query errors do not trigger four additional public requests.

## Recovery path

The original viewport is split into four deterministic quadrants: `NW`, `NE`, `SW`, and `SE`.

- Shards are requested sequentially, never as a burst.
- A delay is inserted between shard requests.
- Each shard retains the normal endpoint failover behavior.
- Objects duplicated on shared quadrant boundaries are deduplicated by OSM object identity.
- The existing browser rendering ceiling still applies to the merged result.

## Complete-only invariant

A sharded scan is **all-or-nothing**.

If any quadrant fails after its endpoint failover path, Peekaboo rejects the entire refresh. It never presents a three-of-four-shard dataset as a successful viewport result. The previously loaded successful dataset remains visible through the app's existing failure-preservation behavior.

This invariant exists because partial geospatial evidence can look deceptively complete on a map.

## Provenance

The cached query result and exported audit manifest retain:

- `scanMode`: `single` or `sharded`
- `shardCount`
- per-shard endpoint/cache/attempt metadata
- the original full-view fallback reason
- endpoint failure history
- the original viewport fingerprint
- an explicit complete-only policy statement

A later session-cache hit preserves the original scan mode rather than relabeling a sharded dataset as a single request.

## What this does not mean

Adaptive sharding improves query reliability. It does not improve OpenStreetMap coverage, verify physical surveillance devices, infer unmapped cameras, or make absence from OSM evidence of absence in the real world.
