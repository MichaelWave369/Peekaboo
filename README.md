# PEEKABOO

**Public Eye Explorer for Known Area-Based Observation Objects**

> **See what sees you.**

Peekaboo is a client-side public-data map for exploring mapped surveillance infrastructure and intentionally published public camera feeds while preserving source provenance and uncertainty.

**Live site:** https://michaelwave369.github.io/Peekaboo/

## Current release: v1.5.0

Peekaboo currently has three distinct evidence lanes:

1. **OpenStreetMap / Overpass surveillance records**
   - Cameras, ALPR, Flock Safety claims, guards/watched areas, gunshot detectors and other mapped surveillance objects.
   - Public-space and park/recreation context when supported by explicit OSM tags.
   - OSM change ledger, snapshots, record-age diagnostics, metadata-detail diagnostics and audit exports.

2. **OSM-published public webcam links**
   - A surveillance record becomes viewable only when OSM explicitly carries a valid `contact:webcam=*` URL.
   - Peekaboo distinguishes an OSM-published URL from verified reachability.
   - Known stale provider routes can use a current official provider directory while retaining the original OSM URL as provenance.

3. **Official public-camera sources**
   - **USGS Volcano Hazards Program / Ashcam** current-image cameras.
   - **Caltrans CCTV** traffic-camera snapshots and published video URLs for the current map viewport.
   - **Iowa DOT / Iowa 511** public traffic-camera images and video URLs from the state-published credential-free camera FeatureServer.
   - Official-source records remain separate from OSM and do not enter the OSM change ledger.

## What Peekaboo is

- A transparency and civic-tech visualization tool.
- A map-first browser interface for public surveillance metadata.
- A provenance-aware viewer for camera media intentionally published by public data sources.
- A way to compare OSM records through time without confusing database change with physical-device change.
- A client-side application with no device scanner and no camera-discovery backend.

## What Peekaboo is not

Peekaboo does **not**:

- scan networks or discover cameras;
- probe camera IPs, ports, credentials or alternate stream paths;
- bypass authentication;
- guess hidden or undocumented feed URLs;
- convert an ordinary surveillance marker into a viewable camera;
- identify surveillance blind spots or provide camera-avoidance routing;
- claim that an unmapped area has no surveillance;
- treat a stale/deleted OSM record as proof that physical hardware was removed.

A feed is shown only when an upstream public source explicitly publishes the media or camera link.

## Map-first interface

Peekaboo uses familiar consumer-map interaction patterns without copying third-party branding:

- floating address/place search;
- full-map workspace;
- quick filter chips;
- collapsible research panel;
- marker details drawer / mobile bottom sheet;
- independently styled OSM, USGS, Caltrans and Iowa DOT camera markers.

Address search only moves the map. It does not silently trigger an OSM surveillance scan or an official-source request.

## OpenStreetMap surveillance lane

### Viewport-bound querying

OSM data is loaded only when the user explicitly scans the current viewport.

- Result sets are bound to the exact query viewport.
- Moving the map produces a visible **VIEW MOVED • RESCAN** state.
- Previous known-good data is preserved when a refresh fails.
- A hard query-area limit prevents accidental huge Overpass requests.

### Adaptive Overpass recovery

Peekaboo first attempts the normal viewport query. Congestion-style failures can trigger deterministic 2×2 geographic sharding.

- All shards must succeed.
- Partial shard results are rejected.
- Boundary duplicates are canonicalized and deduplicated.
- If two shards return different payloads for the same OSM object, the acquisition fails closed with a consistency-conflict receipt.
- HTTP 429 / explicit `Retry-After` conditions do not trigger sharding.
- Endpoint-health cooldowns and a per-scan request budget reduce load on public Overpass infrastructure.

### Flock Safety layer

Flock Safety ALPR classification is based on public OSM claims such as manufacturer/model metadata. Vendor identity is never presented as independent physical verification.

Flock Raven gunshot detectors remain gunshot detectors rather than being collapsed into the ALPR category.

### OSM context layers

- **Public space** requires explicit public/town/street surveillance context.
- **Park / recreation** requires explicit park/recreation context on the surveillance record.
- Peekaboo does not infer a park camera merely because a marker happens to be geographically near a park.

### OSM public webcams

A record enters the **OSM LIVE** layer only when `contact:webcam=*` supplies a safe public HTTP(S) URL.

- Browser-local/private addresses and unsafe schemes are rejected.
- Direct HTTPS image/video media may be displayed after explicit user action.
- Ordinary webpages are opened externally instead of being silently embedded.
- A published URL is labeled as a published mapping claim, not proof of current reachability.
- Provider fallbacks never erase the original OSM URL.

## Official-source lane

Official sources are isolated from the OSM data model. A failure in an official feed does not alter OSM results, OSM exports or the OSM change ledger.

### Shared ArcGIS source contract

v1.5 introduces reusable helpers for official camera sources published through ArcGIS FeatureServer endpoints.

The shared layer handles only source-agnostic mechanics:

- validated geographic envelopes;
- deterministic viewport fingerprints;
- bounded record counts;
- standard ArcGIS spatial-query parameters;
- source-error propagation;
- `exceededTransferLimit` detection;
- coordinate normalization;
- deterministic first-ID-wins deduplication.

Camera-specific semantics stay in each agency adapter. For example, `inService` is Caltrans-specific while `RECORDED` is an Iowa DOT source field. Peekaboo does not collapse those into a generic truth flag.

### USGS Ashcam

Peekaboo can load public current-image camera records from the USGS Volcano Hazards Program Ashcam service.

- zero-secret browser adapter;
- explicit source receipt;
- coordinates and camera code;
- current-image URL;
- reported image timestamp;
- image-freshness classes (`<1 hour`, `<24 hours`, `<7 days`, `7+ days`, unknown);
- optional original-provider link;
- 10-minute session cache;
- 12-second source timeout;
- bounded marker rendering for broad views.

Ashcam images are described as current/near-real-time snapshots, not automatically as continuous live video.

### Caltrans CCTV

Peekaboo uses viewport-bound queries against the official Caltrans CCTV ArcGIS FeatureServer.

The adapter can use source-published fields including:

- `locationName` / nearby place;
- route, direction, county and district;
- `inService` status;
- `currentImageURL`;
- `streamingVideoURL`;
- image refresh metadata;
- source record timestamp and coordinates.

Robustness rules:

- only the current map viewport is queried;
- ArcGIS transfer-limit truncation is rejected instead of displayed as a complete result;
- moved-map results become stale until refreshed;
- camera IDs are deduplicated;
- unsafe/private media URLs are rejected;
- HTTP media remains external-only in the HTTPS app;
- media never autoplays or autoloads;
- HLS/video is only offered from the explicit Caltrans URL and only inline when the browser reports compatible native playback;
- dense views cap marker rendering while preserving the queried source count and telling the user to zoom in.

### Iowa DOT / Iowa 511

Peekaboo v1.5 adds viewport-bound queries against Iowa DOT's public Traffic Cameras FeatureServer. Iowa DOT documents this ESRI service as credential-free and as a source for current camera images/video.

The adapter can use source-published fields including:

- `ImageName` / description;
- route, region and organization;
- camera type and function;
- common camera ID;
- `ImageURL`;
- `VideoURL`;
- `RECORDED` source field;
- coordinates.

Robustness rules mirror the ArcGIS contract used for Caltrans:

- current viewport only;
- fail closed on `exceededTransferLimit`;
- stale after the map moves until refreshed;
- first-ID-wins deduplication;
- unsafe/private media URLs rejected;
- HTTP media external-only;
- no autoplay or automatic media loading;
- HLS/video offered only from the explicit Iowa DOT URL and only inline when browser support is appropriate;
- dense views cap marker rendering while preserving the queried source count.

The `RECORDED` field is shown only as an Iowa DOT source claim. Peekaboo does not reinterpret it as proof that a camera is currently recording, how long footage is retained, or whether the hardware is healthy.

## OSM change ledger

Peekaboo can save a local baseline for a scanned OSM viewport and compare a later scan of the **same** area.

- `NEWLY MAPPED`: an OSM record ID appears now but not in the baseline.
- `REMOVED FROM OSM`: a baseline ID is no longer present in the current OSM result.
- `METADATA CHANGED`: the same OSM object has a different semantic fingerprint.
- `UNCHANGED`: the normalized semantic payload matches.

These labels describe OSM records only. They do not independently prove physical installation, removal, presence or activity.

Baselines remain local to the browser unless the user explicitly exports them.

## Diagnostics and auditability

Peekaboo includes:

- OSM record-age buckets;
- metadata-detail score labeled **NOT TRUTH SCORE**;
- co-location diagnostics that never automatically deduplicate nearby records;
- deterministic dense-map clustering;
- source endpoint / query-path / duration information;
- GeoJSON, CSV and JSON audit exports;
- viewport/source fingerprints;
- change-report exports;
- explicit failure states instead of silent empty maps.

## Public API discipline

Peekaboo treats public infrastructure as shared infrastructure.

- Overpass endpoint failover with cooldowns and request budgets.
- `Retry-After` awareness.
- bounded adaptive queries.
- user-triggered Nominatim place search without autocomplete.
- session caching to avoid unnecessary repeat requests.
- source-specific timeouts and failure isolation.
- viewport-bounded official ArcGIS camera queries instead of whole-state downloads where practical.

## Privacy and security boundary

Peekaboo has no functionality for camera exploitation or private-feed discovery.

Public media URLs are accepted only from explicit upstream public records. URL handling rejects unsupported schemes, credentials, localhost and common private/link-local address ranges before media is offered.

## Development

```bash
npm install
npm test
npm run dev
```

Production build:

```bash
npm run build
```

The test suite covers OSM normalization, Flock evidence, context filters, geocoding, adaptive-query planning, endpoint health, shard consistency, snapshot/change-ledger behavior, public-webcam URL safety, USGS Ashcam normalization, shared ArcGIS query semantics, Caltrans CCTV and Iowa DOT camera normalization/query semantics.

## Data-source responsibility

Peekaboo does not control upstream OpenStreetMap, USGS, Caltrans, Iowa DOT or provider data. Public records can be incomplete, stale, incorrectly tagged, temporarily unavailable or changed by their publishers.

The interface is designed to expose those distinctions instead of hiding them.
