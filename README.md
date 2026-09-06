# PEEKABOO

**Public Eye Explorer for Known Area-Based Observation Objects**

> **See what sees you.**

Peekaboo is a client-side public-data map for exploring mapped surveillance infrastructure and intentionally published public camera feeds while preserving provenance, source ownership and uncertainty.

**Live site:** https://michaelwave369.github.io/Peekaboo/

## Current release: v1.8.0

Peekaboo now has five distinct evidence lanes:

1. **OpenStreetMap / Overpass surveillance records**
   - Cameras, ALPR, Flock Safety claims, guards/watched areas, gunshot detectors and other mapped surveillance objects.
   - Public-space and park/recreation context when supported by explicit OSM tags.
   - OSM change ledger, snapshots, record-age diagnostics, metadata-detail diagnostics and audit exports.

2. **OSM-published public webcam links**
   - A surveillance record becomes viewable only when OSM explicitly carries a valid `contact:webcam=*` URL.
   - Peekaboo distinguishes an OSM-published URL from verified reachability.
   - Known stale provider routes can use a current official provider directory while retaining the original OSM URL as provenance.

3. **Machine-readable official public-camera sources**
   - **USGS Volcano Hazards Program / Ashcam** current-image cameras.
   - **Caltrans CCTV** traffic-camera snapshots and published video URLs.
   - **Iowa DOT / Iowa 511** public traffic-camera images and video URLs.
   - **Colorado DOT / COtrip** public camera links for the Denver region through a CDOT-owned GIS host.
   - **Illinois public traffic cameras** for the Chicago region through a public ArcGIS camera service.
   - Official-source records remain separate from OSM and do not enter the OSM change ledger.

4. **Curated Places + Nature sources**
   - NPS park webcam pages, official traffic-camera viewers and intentionally public tourism/landmark streams.
   - Government and public-commercial publishers are labeled separately.
   - Current park coverage includes Yellowstone, Grand Canyon, Yosemite, Zion, Mount Rainier, Glacier, Great Smoky Mountains and Acadia.
   - Current city/landmark coverage includes Las Vegas, Atlantic City, Key West and the Anaheim / Disneyland Resort area.
   - Curated place sources open on the publisher's site and are not restreamed or scraped by Peekaboo.

5. **NOAA / NDBC BuoyCAMs**
   - A dedicated **NOAA BUOYS** layer for vetted National Data Buoy Center BuoyCAM stations.
   - The station registry supplies map geography without scraping NOAA on every map move.
   - Current images are requested directly from NOAA only after the user presses **LOAD CURRENT NOAA IMAGE**.
   - NDBC's documented current-image endpoint is used exactly as published; Peekaboo does not derive image filenames or alternate camera paths.
   - NOAA BuoyCAMs remain separate from surveillance, transportation and tourism-camera data.

## Major metro coverage

Peekaboo exposes an explicit metro coverage matrix instead of making unsupported areas look indistinguishable from empty data.

| Metro | Peekaboo status | Public source |
| --- | --- | --- |
| Los Angeles | **IN APP** | Caltrans CCTV / QuickMap |
| Denver | **IN APP** | CDOT / COtrip |
| Chicago | **IN APP** | Illinois public traffic cameras |
| New York City | **KEY REQUIRED** | 511NY camera API |
| Miami | **OFFICIAL VIEWER** | FL511 |
| Detroit | **OFFICIAL VIEWER** | MDOT Mi Drive |
| Tucson | **KEY REQUIRED** | AZ511 camera API |
| Austin | **OFFICIAL VIEWER** | TxDOT / DriveTexas |

`KEY REQUIRED` is intentionally different from `OFFICIAL VIEWER`: Peekaboo will not expose API credentials in the public GitHub Pages bundle. A protected proxy is the appropriate future path for sources such as 511NY and AZ511.

## What Peekaboo is

- A transparency and civic-tech visualization tool.
- A map-first browser interface for public surveillance metadata.
- A provenance-aware viewer for camera media intentionally published by public data sources.
- A public-view atlas for government, park, environmental and clearly labeled public-commercial camera sources.
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
- treat a stale/deleted OSM record as proof that physical hardware was removed;
- relabel a third-party tourism camera as an official city, park or property-owner feed.

A feed is shown only when an upstream public source explicitly publishes the media or camera link.

## Map-first interface

Peekaboo uses familiar consumer-map interaction patterns without copying third-party branding:

- floating address/place search;
- full-map workspace;
- horizontally scrollable quick-source rail;
- collapsible research panel;
- marker details drawer / mobile bottom sheet;
- independently styled OSM, USGS, Caltrans, Iowa DOT, metro, NOAA and curated-place markers.

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

Reusable helpers handle source-agnostic mechanics for official camera FeatureServers:

- validated geographic envelopes;
- deterministic viewport fingerprints;
- bounded record counts;
- standard ArcGIS spatial-query parameters;
- source-error propagation;
- `exceededTransferLimit` detection;
- coordinate normalization;
- deterministic first-ID-wins deduplication.

Camera-specific semantics stay in each agency adapter. Peekaboo does not collapse unrelated agency fields into a generic truth flag.

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

### Transportation camera sources

Peekaboo currently has first-class transportation-camera adapters for:

- **Caltrans CCTV**
- **Iowa DOT / Iowa 511**
- **Denver / CDOT / COtrip machine-readable camera source**
- **Chicago-region / Illinois public traffic cameras**

Shared rules include current-viewport querying where applicable, fail-closed transfer-limit handling, stale-view protection, safe public media URLs, no autoplay, source-specific status semantics and bounded rendering that preserves the difference between queried records and rendered markers.

The major-metro panel distinguishes **IN APP**, **OFFICIAL VIEWER** and **KEY REQUIRED** sources so a missing adapter is not confused with an absence of cameras.

## NOAA / NDBC BuoyCAM lane

Peekaboo v1.8 adds a dedicated marine-camera layer using NOAA National Data Buoy Center BuoyCAM station IDs and the documented current-image endpoint.

Current seed coverage includes stations near Cape Hatteras, Charleston, Cape Canaveral, Puerto Rico, St. Martin and Boston plus several offshore Atlantic stations.

Robustness rules:

- station IDs and coordinates are validated locally;
- duplicate station IDs are rejected deterministically;
- the map does not scrape NOAA's status page on every pan/zoom;
- media never loads until the user asks for it;
- current images come directly from `ndbc.noaa.gov`;
- manual refresh stays on the same documented endpoint;
- a failed or unavailable current image is surfaced as a source-side availability condition rather than replaced with a guessed URL;
- the panel links to NOAA's complete BuoyCAM map when the local seed registry does not cover the user's area.

NDBC documents BuoyCAMs as generally operating during daylight and documents its current-image endpoint as refusing images older than its current-image window. Peekaboo therefore does not invent a separate freshness claim.

See `docs/NOAA_NDBC_BUOYCAMS.md` for the source policy.

## Places + Nature lane

The curated public-view registry covers locations where the publisher exposes a stable public webcam page but a camera-level zero-secret API is not necessarily available.

### Official NPS park sources

- **Yellowstone National Park** — official NPS webcam hub including the Old Faithful / Upper Geyser Basin livestream and static park webcams.
- **Grand Canyon National Park** — official NPS Yavapai Point and South Entrance webcam pages.
- **Yosemite National Park** — official NPS webcam hub with high-country, air-quality, ski-area and river-condition views.
- **Zion National Park** — official NPS Temples and Towers of the Virgin webcam.
- **Mount Rainier National Park** — official NPS Longmire, Paradise and Sunrise-area webcam hub.
- **Glacier National Park** — official NPS webcam hub with Lake McDonald, Apgar, Logan Pass, Many Glacier, St. Mary and other views.
- **Great Smoky Mountains National Park** — official NPS current-view cameras with approximately 15-minute updates according to NPS.
- **Acadia National Park** — official NPS webcam page with Jordan Pond, air-quality and partner-hosted regional views.

### City / landmark sources

- **Las Vegas** — official RTC/NDOT traffic-camera gateway plus a separately labeled EarthCam public tourism stream.
- **Atlantic City** — official NJDOT / 511NJ traffic-camera viewer plus a separately labeled public Boardwalk livestream.
- **Key West Harbor** — public PTZtv / Historic Tours of America stream, explicitly labeled as not affiliated with or officially endorsed by the City of Key West.
- **Anaheim / Disneyland Resort area** — public EarthCam / Hilton Anaheim view, explicitly labeled as not an official Disneyland or Disney-operated camera.

Curated place-camera pages are external-only. Peekaboo does not copy or restream them, scrape hidden media URLs, or infer ownership from what appears in the frame.

See `docs/PLACES_AND_NATURE.md` for the detailed source-class policy.

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
- local curated registries where a source does not require live discovery on every map movement.

## Privacy and security boundary

Peekaboo has no functionality for camera exploitation or private-feed discovery.

Public media URLs are accepted only from explicit upstream public records or documented official source patterns. URL handling rejects unsupported schemes, credentials, localhost and common private/link-local address ranges before media is offered.

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

The test suite covers OSM normalization, Flock evidence, context filters, geocoding, adaptive-query planning, endpoint health, shard consistency, snapshot/change-ledger behavior, public-webcam URL safety, USGS Ashcam normalization, shared ArcGIS query semantics, transportation-camera adapters, metro coverage-state semantics, curated Places + Nature provenance and NOAA/NDBC BuoyCAM station normalization.

## Data-source responsibility

Peekaboo does not control upstream OpenStreetMap, USGS, NOAA/NDBC, transportation agencies, NPS or commercial public-camera publishers. Public records can be incomplete, stale, incorrectly tagged, temporarily unavailable or changed by their publishers.

The interface is designed to expose those distinctions instead of hiding them.
