# Peekaboo v2.2 — Product State + Evidence Modes

v2.2 is the first structural pass after the v2.1 **Teach the Map** release.

The purpose is not to redesign acquisition or add more camera sources. It is to make core product behavior available as application state rather than inferred DOM state, while making the visible controls match Peekaboo's evidence model.

## Shared product state

`src/productState.jsx` provides a React context shared by `App` and enhancement layers.

The current snapshot contains:

- current map viewport;
- scan label/loading/dirty/can-scan state;
- current browse mode;
- selected OSM record ID;
- pending linked OSM record ID;
- whether an OSM query has been loaded;
- whether the current map differs from the loaded OSM scope;
- compatible OSM change-ledger delta.

`App` publishes these values directly. `TeachMapEnhancer` consumes them directly.

The v2.1 implementation that inferred scan state from `.load-button` text and ledger deltas from `.recent-changes-panel` DOM is retired.

The enhancement layer still uses a portal host to render its floating controls. That host attachment is presentation plumbing, not the source of scan/ledger truth.

## Evidence browse modes

Two user-facing modes are now explicit:

### SURVEILLANCE

Presents OpenStreetMap surveillance controls and OSM-published webcam filters.

The map presents the OSM evidence family while hiding public-view markers from interaction.

### PUBLIC VIEWS

Presents USGS, NOAA, transportation, park, wildlife, institution and curated public-source controls.

The map presents public-view markers while hiding OSM surveillance markers from interaction.

Mode switching does not delete or reinterpret layer state. A source explicitly enabled by the user remains enabled when they switch away and returns when they switch back.

This avoids both semantic mixing and destructive UI side effects.

## OSM result list

After a successful OSM scan, Surveillance mode exposes a first-class result list.

Rules:

- list records come only from the already accepted OSM scan;
- after the map moves, the result list is marked stale/disabled until a new scan succeeds;
- current UI rendering is capped at 100 rows;
- the full filtered record count remains visible;
- a list cap is never presented as the source record count;
- selecting a row opens the existing OSM object drawer.

## Selected-record permalinks

v2.2 adds a bounded `record=` hash parameter.

A record URL can preserve:

- map center/zoom;
- OSM category/context filters;
- search query;
- evidence browse mode;
- selected OSM record ID.

The ordinary hash writer preserves `record=` rather than erasing it.

Opening a record permalink does **not** auto-query OpenStreetMap. The shared state is restored, the record target remains pending, and the user must still press **Scan this view**. If the accepted scan contains that ID, Peekaboo opens the record. If not, it says the linked record is not present in the loaded scan.

The record ID parser is bounded and rejects characters that could be used to inject additional hash/query parameters.

## Geolocation

Geolocation remains explicit and navigational only.

After a successful location request:

1. the map moves;
2. Peekaboo states that location was found;
3. **Scan this view** receives a temporary visual nudge;
4. no OSM request begins automatically.

## Coverage hints

Regional source-policy hints are placed before generic coverage lines so the meaningful local condition remains visible in the collapsed panel.

Examples:

- Bay Area / California: Caltrans before generic OSM text;
- NYC: 511NY `KEY REQUIRED` before generic OSM text;
- Tucson: AZ511 `KEY REQUIRED` before generic OSM text.

`How this map works` can reopen onboarding without deleting the local onboarding-seen key.

## CSS direction

v2.2 stops adding version-numbered style sheets for new product structures.

New product UI lives in `src/product.css`.

Existing `v04.css` … `v21.css` files remain temporarily because deleting/recombining them in the same release as the state migration would increase regression risk. A later design-system pass can consolidate them after v2.2 behavior is frozen.

## Still deferred

v2.2 does **not** yet replace every historical source enhancer with one generic component.

Remaining structural work includes:

- one generic official/public source-layer component;
- one generic source drawer contract;
- first-class cross-source in-view lists, not only OSM;
- public-source selected-record permalinks;
- source-jump navigation / coverage destinations;
- old CSS consolidation;
- directory reorganization into `osm/`, `sources/`, `map/`, `ui/`, `ledger/` or equivalent.

Those changes should build on the new shared product state rather than recreate the old DOM-observer pattern.
