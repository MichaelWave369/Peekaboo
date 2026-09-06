# Peekaboo v2.1 — Teach the Map

v2.1 focuses on first-run comprehension and map-level product clarity rather than adding another source adapter.

## Goals

A new user should understand within seconds that:

1. curated/official public-view sources and OSM surveillance records are different evidence lanes;
2. OSM surveillance is queried only when the user explicitly scans the current viewport;
3. Peekaboo does not discover hidden cameras or treat an empty map as proof that an area has no surveillance;
4. official-source coverage varies by geography and source access policy.

## First-run onboarding

The one-time onboarding panel explains the distinction between public views, on-demand OSM surveillance scans, and provenance.

It provides two explicit choices:

- **Use my location** — requests browser geolocation and moves the map only. It does not automatically trigger an OSM query.
- **Explore map** — dismisses onboarding without requesting location.

Onboarding state is stored locally in the browser under a versioned key.

## Primary Scan This View control

The existing sidebar scan remains the source action. v2.1 mirrors it as a prominent map-level control so scanning is no longer hidden behind the research drawer.

The map-level control preserves the underlying states:

- `SCAN THIS VIEW`
- `RESCAN THIS VIEW`
- `SCANNING OSM…`

No new acquisition path is created. The control delegates to the existing viewport-bound OSM query action.

## Last viewport restore

The current map center/zoom is stored locally after map movement.

A stored viewport is restored only when the user did **not** arrive with an explicit `map=` hash state. Shared/deep map URLs therefore win over local history.

Location and map state are not uploaded by this feature.

## What Works Here

v2.1 adds viewport-aware source hints instead of leaving every source chip to look equally applicable everywhere.

The panel always includes:

- **OpenStreetMap surveillance — SCAN ON DEMAND**

It can also add regional source policy hints such as:

- Caltrans — `IN APP`
- Iowa DOT / 511 — `IN APP`
- Denver / CDOT — `IN APP`
- Chicago / Illinois — `IN APP`
- 511NY — `KEY REQUIRED`
- FL511 — `OFFICIAL VIEWER`
- MDOT Mi Drive — `OFFICIAL VIEWER`
- AZ511 — `KEY REQUIRED`
- DriveTexas — `OFFICIAL VIEWER`

The panel also reports curated public-view records and vetted NOAA/NDBC BuoyCAM stations that actually fall inside the current viewport.

These are product-coverage hints, not claims that the listed system is the only camera source in that area.

## OSM change-ledger promotion

When a compatible local baseline comparison has nonzero changes, v2.1 surfaces a map-level summary:

- newly mapped
- removed from OSM
- metadata changed

Selecting the summary opens the existing OSM change ledger.

`Removed from OSM` remains a database-record claim and is never shortened into a physical-device-removal claim.

## Deferred intentionally

The following review items are valuable but require deeper App/state refactoring and are intentionally deferred rather than implemented through additional brittle DOM contracts:

- unified Surveillance / Public Views mode switch;
- first-class in-view record list driven directly from application state;
- selected-record permalinks that survive the App hash writer;
- generic source-layer/source-drawer architecture;
- CSS/folder consolidation.

Those are better handled after the v2.1 UX behavior is frozen.
