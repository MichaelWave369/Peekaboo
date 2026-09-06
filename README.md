# PEEKABOO

**Public Eye Explorer for Known Area-Based Observation Objects**

> **See what sees you.**

Peekaboo is a client-side public-data map for exploring mapped surveillance infrastructure and intentionally published public camera feeds while preserving source provenance and uncertainty.

**Live site:** https://michaelwave369.github.io/Peekaboo/

## Current release: v1.6.0

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
   - **Caltrans CCTV** traffic-camera snapshots and published video URLs.
   - **Iowa DOT / Iowa 511** public traffic-camera images and video URLs.
   - **Colorado DOT / COtrip** public camera links for the Denver region through a CDOT-owned GIS host.
   - **Illinois public traffic cameras** for the Chicago region through a public ArcGIS camera service.
   - Official-source records remain separate from OSM and do not enter the OSM change ledger.

## Major metro coverage

v1.6 introduces an explicit metro coverage matrix instead of making unsupported areas look indistinguishable from empty data.

| Metro | Peekaboo status | Public source |
| --- | --- | --- |
| Los Angeles | **IN APP** | Caltrans CCTV / QuickMap |
| Denver | **IN APP** | CDOT / COtrip |
| Chicago | **IN APP** | Illinois public traffic-camera ArcGIS service |
| New York City | **KEY REQUIRED** | 511NY documented camera API / public viewer |
| Miami | **OFFICIAL VIEWER** | FL511 |
| Detroit | **OFFICIAL VIEWER** | MDOT Mi Drive |
| Tucson | **KEY REQUIRED** | AZ511 documented camera API / public viewer |
| Austin | **OFFICIAL VIEWER** | TxDOT / DriveTexas |

`IN APP` means Peekaboo has a source adapter. `OFFICIAL VIEWER` means the agency publishes public cameras but Peekaboo has not found a sufficiently stable no-secret machine-readable integration contract. `KEY REQUIRED` means the documented camera API requires credentials and therefore cannot be safely embedded in the public GitHub Pages bundle.

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
- independently styled OSM, USGS, Caltrans, Iowa DOT, Denver/CDOT and Chicago/Illinois camera markers.

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

Peekaboo uses reusable source-agnostic helpers for camera data exposed through ArcGIS FeatureServer endpoints.

The shared contract handles:

- validated geographic envelopes;
- deterministic viewport fingerprints;
- bounded record counts;
- standard ArcGIS spatial-query parameters;
- source-error propagation;
- `exceededTransferLimit` detection;
- coordinate normalization;
- deterministic first-ID-wins deduplication.

Camera-specific semantics stay in each source adapter. Peekaboo does not collapse agency-specific fields into a universal truth flag.

### USGS Ashcam

USGS Ashcam supplies public current-image cameras with explicit image timestamps. Peekaboo labels these as current/near-real-time snapshots rather than automatically calling them continuous live video.

### Caltrans CCTV

Caltrans is queried by current map viewport. The adapter can use source-published `currentImageURL`, `streamingVideoURL`, `inService`, route, direction, county and source update fields. Transfer-limit truncation is rejected rather than displayed as a complete dataset.

### Iowa DOT / Iowa 511

Iowa DOT documents its ESRI camera feature service as credential-free public data for current traffic camera images/video. Peekaboo consumes only explicit `ImageURL` and `VideoURL` fields. The Iowa `RECORDED` field is displayed only as a source claim, not proof that a camera is currently recording or retaining footage.

### Denver / Colorado DOT

The Denver source uses camera data currently exposed through a **CDOT-owned `test.maps.codot.gov` GIS host**. Because the machine-readable endpoint is explicitly on a test host, Peekaboo treats it as potentially less stable than the public COtrip viewer and keeps COtrip as the authoritative fallback.

- current viewport only;
- two-minute viewport-keyed session cache;
- 12-second timeout;
- fail closed on ArcGIS transfer-limit truncation;
- source `status` remains a source claim;
- media type is inferred only from the explicit published URL;
- no autoplay or automatic media loading;
- moved-map data becomes stale until refreshed.

### Chicago / Illinois public traffic cameras

The Chicago source uses a public Illinois traffic-camera ArcGIS service containing snapshot/location/direction and source-age fields.

Peekaboo deliberately labels this as an **Illinois public traffic-camera service** rather than claiming every individual record has identical agency ownership.

- snapshots only unless the source explicitly adds a supported media field later;
- source-reported `AgeInMinutes`, `TooOld` and warning-age values remain source metadata;
- moved-map data becomes stale until refreshed;
- unsafe/private URLs are rejected;
- transfer-limit truncation fails closed.

## Official-source rendering discipline

Official-source queries may return more records than are sensible to render as Leaflet markers in one view.

- source counts remain intact;
- at most 300 Denver/Chicago markers are rendered at once;
- the source panel explicitly shows when the query contains more records than are currently rendered;
- users are asked to zoom in rather than having excess records silently disappear from the visible layer.

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

- Overpass endpoint failover with cooldowns and request budgets;
- `Retry-After` awareness;
- bounded adaptive queries;
- user-triggered Nominatim place search without autocomplete;
- session caching to avoid unnecessary repeat requests;
- source-specific timeouts and failure isolation;
- viewport-bounded official ArcGIS camera queries instead of whole-state downloads where practical;
- no public API credentials committed to the client bundle.

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

The test suite covers OSM normalization, Flock evidence, context filters, geocoding, adaptive-query planning, endpoint health, shard consistency, snapshot/change-ledger behavior, public-webcam URL safety, USGS Ashcam normalization, shared ArcGIS query semantics, Caltrans CCTV, Iowa DOT, Denver/CDOT and Chicago/Illinois camera normalization/query semantics.

## Data-source responsibility

Peekaboo does not control upstream OpenStreetMap, USGS, Caltrans, Iowa DOT, CDOT, Illinois camera services or other providers. Public records can be incomplete, stale, incorrectly tagged, temporarily unavailable or changed by their publishers.

The interface is designed to expose those distinctions instead of hiding them.
