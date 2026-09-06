# PEEKABOO

**Public Eye Explorer for Known Area-Based Observation Objects**

> **See what sees you.**

Peekaboo is a client-side public-data map for exploring mapped surveillance infrastructure and intentionally published public camera views while preserving provenance, source ownership and uncertainty.

**Live site:** https://michaelwave369.github.io/Peekaboo/

## Current release: v2.2.0

v2.2 begins consolidating the product around the distinctions Peekaboo already enforced in its data model.

### Two browse modes

**SURVEILLANCE**

- OpenStreetMap surveillance records queried on demand for the current viewport.
- Flock, ALPR, camera, public-space and park/recreation OSM filters.
- OSM-published webcam links remain OSM evidence and never become official-source records.
- OSM results can be browsed as a first-class in-view list after a successful scan.
- Selected OSM records can be shared through a hash-safe `record=` permalink.

**PUBLIC VIEWS**

- intentionally public government, institution and clearly labeled commercial camera sources;
- USGS, NOAA, DOT/511, parks, wildlife, FAA WeatherCams, zoos/aquariums, Great Lakes, harbors and tourism sources;
- source-specific media/status semantics rather than one generic `camera_is_live=true` claim.

Switching browse modes changes which evidence family is presented and interactive. It does not convert one source class into another.

## First-run contract

Peekaboo explains three ideas on first use:

1. **Public views** may already be listed on the map.
2. **Surveillance** from OpenStreetMap is queried only when the user presses **Scan this view**.
3. **Provenance** matters: a published link, source claim and physical-camera status are different things.

**Use my location** moves the map only. It never starts an OSM scan automatically. After geolocation, Peekaboo visually nudges **Scan this view** so the next action is explicit.

The last viewport is stored locally in the browser. A shared URL with an explicit `map=` state always wins over local history.

The **What works here** panel reports geographic source-policy hints such as `IN APP`, `OFFICIAL VIEWER`, `KEY REQUIRED` and `SCAN ON DEMAND`. These are product-coverage hints, not claims that a listed system is the only camera source in an area.

## Evidence lanes

Peekaboo keeps these sources deliberately separate:

1. **OpenStreetMap / Overpass surveillance records**
   - cameras, ALPR, Flock Safety claims, guards/watched areas, gunshot detectors and other mapped surveillance objects;
   - explicit public-space and park/recreation context;
   - OSM snapshots, change ledger, record age, metadata diagnostics and audit exports.

2. **OSM-published public webcam links**
   - a surveillance record becomes viewable only when OSM explicitly publishes a valid `contact:webcam=*` URL;
   - published-link provenance is separate from current reachability;
   - provider fallbacks never erase the original OSM URL.

3. **Machine-readable official camera sources**
   - USGS Volcano Hazards Program / Ashcam;
   - Caltrans CCTV;
   - Iowa DOT / Iowa 511;
   - Denver / CDOT;
   - Chicago-region / Illinois public traffic cameras.

4. **NOAA environmental cameras**
   - NDBC BuoyCAM current-image stations;
   - NOAA Great Lakes Environmental Research Laboratory webcam/observation stations.

5. **Curated Places + Nature sources**
   - National Park Service webcams;
   - U.S. Fish & Wildlife Service wildlife cameras;
   - FAA Weather Camera sites;
   - official city / traveler-information viewers;
   - institution-published zoo and aquarium cameras;
   - separately labeled public-commercial tourism streams.

## Publisher model

### GOVERNMENT OFFICIAL

Published by a government agency or government science/service program.

Examples: NPS, USFWS, FAA, NOAA/NDBC/GLERL and state DOT/511 systems.

### INSTITUTION OFFICIAL

Published by the institution that operates the zoo, aquarium, observatory, conservation facility or similar venue.

Current examples include:

- Smithsonian National Zoo and Conservation Biology Institute
- Monterey Bay Aquarium
- San Diego Zoo Wildlife Alliance

`institution-official` does not mean government-owned and does not mean a camera is continuously live. It means the institution itself publishes the public camera collection.

### PUBLIC COMMERCIAL

Intentionally public sources that are not represented as government- or institution-owned, including selected EarthCam, PTZtv and tourism/landmark views.

A camera showing a place is not automatically owned or endorsed by the place it shows.

## Selected-record links

v2.2 adds selected OSM record permalinks.

A shared record URL preserves:

- map center/zoom;
- active OSM filters and contexts;
- browse mode;
- selected public OSM record ID.

Opening a record permalink does **not** silently query OSM. The map restores the shared state and tells the user to **Scan this view** before the linked record can be loaded.

## OSM in-view results

After a successful current-viewport scan, Surveillance mode exposes an **OSM RESULTS** sheet.

The sheet is a browsing surface over the already accepted OSM result set. If the map moves, the list becomes stale and is disabled until the current viewport is rescanned.

The UI renders at most 100 list rows at once while preserving and reporting the full filtered record count. A UI rendering cap is never presented as a source-data count.

## OSM acquisition reliability

OSM scans remain explicitly user-triggered and viewport-bound.

Peekaboo includes:

- Overpass endpoint failover;
- endpoint cooldowns and `Retry-After` handling;
- per-scan request budgets;
- deterministic 2×2 recovery sharding for appropriate congestion failures;
- all-shards-or-nothing acceptance;
- cross-shard consistency checking;
- canonical duplicate handling;
- previous-known-good preservation after failed refreshes;
- explicit **VIEW MOVED • RESCAN** state.

## OSM change ledger

Peekaboo can save a local baseline for a scanned OSM viewport and compare a later scan of the same area.

- `NEWLY MAPPED`
- `REMOVED FROM OSM`
- `METADATA CHANGED`
- `UNCHANGED`

The map can surface nonzero ledger deltas directly, but these labels remain database-record claims. `REMOVED FROM OSM` never means “physical camera removed.”

## Major metro coverage

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

Peekaboo will not publish API credentials in the GitHub Pages client bundle. Sources requiring private keys belong behind a protected proxy if native integration is added later.

## What Peekaboo is not

Peekaboo does **not**:

- scan networks or discover cameras;
- probe camera IPs, ports, credentials or alternate stream paths;
- bypass authentication;
- guess hidden or undocumented feed URLs;
- convert an ordinary surveillance marker into a viewable camera;
- identify surveillance blind spots or provide camera-avoidance routing;
- claim that an unmapped area has no surveillance;
- treat a deleted/stale OSM record as proof that physical hardware was removed;
- relabel a third-party tourism camera as an official property, city or institution camera.

## v2.2 state architecture

v2.2 introduces a shared React product-state contract for:

- viewport;
- scan state;
- browse mode;
- selected/pending OSM record ID;
- stale/current query state;
- OSM ledger delta.

The first-run/coverage layer consumes those values directly instead of inferring them from button text or ledger-panel DOM mutations.

This is the first structural step toward a generic source-layer/source-drawer architecture. Existing source adapters remain isolated and tested while that consolidation proceeds incrementally.

New product styling now lands in `src/product.css` instead of creating another version-numbered CSS file. Earlier versioned CSS remains intact for behavior preservation until a dedicated design-system cleanup can safely replace it.

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

The regression suite covers OSM normalization, Flock evidence, context filters, address search, adaptive queries, endpoint health, shard consistency, snapshots/change-ledger behavior, public-webcam URL safety, official camera adapters, NOAA BuoyCAMs, curated publisher classes, v2.1 viewport/onboarding behavior and v2.2 mode/record-permalink navigation semantics.

See `CHANGELOG.md` and the files under `docs/` for release-specific contracts.

## Data-source responsibility

Peekaboo does not control upstream OpenStreetMap, government agencies, institutions or public-commercial publishers. Public records and camera pages can be incomplete, stale, seasonal, temporarily unavailable, incorrectly tagged or changed by their publishers.

The interface is designed to expose those distinctions rather than hide them.
