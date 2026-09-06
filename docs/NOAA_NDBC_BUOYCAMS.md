# NOAA / NDBC BuoyCAM source policy

Peekaboo v1.8 adds a separate **NOAA BUOYS** layer for National Data Buoy Center BuoyCAM stations.

## Source contract

The layer uses only NOAA/NDBC-published station identifiers, coordinates and the documented current-image URL pattern:

```text
https://www.ndbc.noaa.gov/buoycam.php?station=XXXXX
```

Peekaboo does not discover camera endpoints, derive image filenames, inspect devices or probe alternate URLs.

## Freshness semantics

NDBC documents BuoyCAMs as generally taking photographs during daylight hours. NDBC also documents that the current-image endpoint will not provide a current image when the latest BuoyCAM photo is older than 16 hours.

Peekaboo therefore does **not** invent its own freshness label. The UI says that the image is the source's documented current-image endpoint and surfaces a load failure when NOAA does not provide an image.

A missing image can mean nighttime, a station outage, a photo outside NDBC's current-image window, or another source-side problem. It is not interpreted as proof that the physical camera has been removed.

## Registry semantics

Peekaboo ships a vetted seed registry of BuoyCAM station IDs and coordinates so the map can place NOAA markers without scraping the NDBC status page on every client session.

The seed registry is not represented as a complete inventory of every NOAA marine observation station. It is specifically the BuoyCAM subset integrated by Peekaboo.

The panel always links to NOAA's full BuoyCAM map and each station's NDBC station page.

## Media behavior

- Images load only after explicit user action.
- Images are requested directly from `ndbc.noaa.gov`.
- No autoplay or background polling occurs.
- Manual refresh adds only a cache-busting query value to the same documented NOAA endpoint.
- Image load failure is surfaced instead of replaced with a guessed alternate URL.

## Separation from other evidence lanes

NOAA BuoyCAM stations are official environmental/public-observation sources. They are separate from:

- OpenStreetMap surveillance records;
- OSM `contact:webcam` links;
- the OSM change ledger;
- transportation-camera adapters;
- public-commercial tourism streams.

This separation prevents an ocean-observation camera from being mislabeled as a surveillance record merely because both appear on one map.
