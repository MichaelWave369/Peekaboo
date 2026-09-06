# PEEKABOO

**Public Eye Explorer for Known Area-Based Observation Objects**

> **See what sees you.**

Peekaboo is a client-side public-data map for exploring mapped surveillance infrastructure and intentionally published public camera views while preserving provenance, source ownership and uncertainty.

**Live site:** https://michaelwave369.github.io/Peekaboo/

## Current release: v2.0.0

Peekaboo now spans several deliberately separate evidence lanes:

1. **OpenStreetMap / Overpass surveillance records**
   - cameras, ALPR, Flock Safety claims, guards/watched areas, gunshot detectors and other mapped surveillance objects;
   - explicit public-space and park/recreation context;
   - OSM snapshots, change ledger, record age, metadata diagnostics and audit exports.

2. **OSM-published public webcam links**
   - a surveillance record becomes viewable only when OSM explicitly publishes a valid `contact:webcam=*` URL;
   - published-link provenance is separate from current reachability;
   - known stale providers may use an official fallback directory without erasing the original OSM URL.

3. **Machine-readable official camera sources**
   - USGS Volcano Hazards Program / Ashcam;
   - Caltrans CCTV;
   - Iowa DOT / Iowa 511;
   - Denver / CDOT;
   - Chicago-region / Illinois public traffic cameras.

4. **NOAA environmental cameras**
   - NDBC BuoyCAM current-image stations;
   - NOAA Great Lakes Environmental Research Laboratory station webcams and current observation pages.

5. **Curated Places + Nature sources**
   - National Park Service webcams;
   - U.S. Fish & Wildlife Service wildlife cameras;
   - FAA Weather Camera sites;
   - official city / traveler-information viewers;
   - institution-published zoo and aquarium cameras;
   - separately labeled public-commercial tourism streams.

## v2.0 publisher model

Peekaboo no longer treats all curated publishers as a government-vs-commercial binary.

### GOVERNMENT OFFICIAL

The public page is published by a government agency or government science/service program.

Examples:

- National Park Service
- U.S. Fish & Wildlife Service
- Federal Aviation Administration
- NOAA / NDBC / GLERL
- state DOT / 511 systems

### INSTITUTION OFFICIAL

The public page is published by the institution that operates the zoo, aquarium, observatory, conservation facility or similar venue.

Current v2.0 examples:

- **Smithsonian National Zoo and Conservation Biology Institute**
- **Monterey Bay Aquarium**
- **San Diego Zoo Wildlife Alliance**

`institution-official` does not mean government-owned and does not mean every image is continuously live. It means the institution itself is the publisher of the public camera collection.

### PUBLIC COMMERCIAL

The source is intentionally public but is not represented as government- or institution-owned.

Examples include selected EarthCam, PTZtv and other tourism/landmark views.

A camera showing a place is not automatically owned or endorsed by the place it shows.

## v2.0 source shortcuts

The horizontally scrollable source rail includes filtered views over canonical source records rather than duplicate datasets:

- **PLACES**
- **WILDLIFE**
- **FAA WX**
- **ZOO / AQUARIUM**
- **GREAT LAKES**
- **NOAA BUOYS**
- plus OSM, USGS and transportation-source controls

A record therefore cannot drift into contradictory forms merely because it appears under more than one user-facing category.

## New v2.0 institution sources

### Smithsonian National Zoo

Peekaboo links to the National Zoo's institution-published live animal camera collection, including giant pandas, elephants, lions, black-footed ferrets and naked mole-rats.

### Monterey Bay Aquarium

Peekaboo links to the Aquarium's public live-cam collection including sea otters, jellies, kelp forest, aviary, sharks, open-sea exhibits and the Monterey Bay outdoor view. Some exhibit cams publish daytime live hours and may use prerecorded footage outside those hours.

### San Diego Zoo Wildlife Alliance

Peekaboo exposes separate San Diego Zoo and Safari Park records pointing to the Wildlife Alliance's public live-camera collection. The source itself warns that animals may be indoors or out of frame.

These pages remain external-only. Peekaboo does not scrape embedded player internals or guess stream URLs.

## New v2.0 NOAA Great Lakes sources

The **GREAT LAKES** shortcut initially includes official NOAA / Great Lakes Environmental Research Laboratory stations such as:

- South Haven, MI
- Thunder Bay Island, MI
- Alpena, MI
- Muskegon Pier Light, MI
- Toledo Channel Marker #2, western Lake Erie

These sources combine environmental observations with current/browsable webcam imagery. Update cadence is preserved only when the source page explicitly states it.

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

Peekaboo will not publish API credentials in the GitHub Pages client bundle. Sources requiring private keys belong behind a future protected proxy.

## What Peekaboo is

- a transparency and civic-tech visualization tool;
- a map-first browser for public surveillance metadata;
- a provenance-aware public camera atlas;
- a viewer/index for media intentionally published by upstream sources;
- a way to compare OSM records through time without confusing database change with physical-device change.

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

## Official-source reliability

Source adapters are isolated from one another and from OSM.

Common patterns include:

- viewport-bounded queries where the upstream API supports them;
- fail-closed transfer-limit handling;
- source-specific caching and timeouts;
- stale-view invalidation;
- safe public URL validation;
- no media autoplay;
- no inferred stream paths;
- source-specific status semantics instead of one universal `camera_is_live=true` fiction.

## NOAA / NDBC BuoyCAMs

The **NOAA BUOYS** layer uses vetted NDBC station IDs and NOAA's documented current-image endpoint.

- images load only after user action;
- station IDs and coordinates are validated;
- duplicate station IDs are removed deterministically;
- failed current images are treated as source availability conditions rather than proof of camera removal;
- Peekaboo does not derive alternate NOAA image paths.

## OSM change ledger

Peekaboo can save a local baseline for a scanned OSM viewport and compare a later scan of the same area.

- `NEWLY MAPPED`
- `REMOVED FROM OSM`
- `METADATA CHANGED`
- `UNCHANGED`

These labels describe OpenStreetMap records only. They are not physical-device status claims.

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

The regression suite covers OSM normalization, Flock evidence, context filters, address search, adaptive queries, endpoint health, shard consistency, snapshots/change-ledger behavior, public-webcam URL safety, official camera adapters, NOAA BuoyCAMs and the v2.0 government/institution/commercial curated-source contract.

## Data-source responsibility

Peekaboo does not control upstream OpenStreetMap, government agencies, institutions or public-commercial publishers. Public records and camera pages can be incomplete, stale, seasonal, temporarily unavailable, incorrectly tagged or changed by their publishers.

The interface is designed to expose those distinctions rather than hide them.
