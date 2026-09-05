# PEEKABOO

**Public Eye Explorer for Known Area-Based Observation Objects**

> **See what sees you.**

Peekaboo is a public-data map for exploring surveillance infrastructure voluntarily documented in [OpenStreetMap](https://www.openstreetmap.org/). It queries public Overpass infrastructure for surveillance-related OSM objects in the current map view, normalizes the tags, and presents them in a modern browser interface.

**Live site:** https://michaelwave369.github.io/Peekaboo/

## What Peekaboo is

- A transparency and civic-tech visualization tool.
- A client-side OpenStreetMap / Overpass explorer.
- A way to inspect public metadata such as surveillance type, observed zone, operator, camera type, direction and OSM source provenance when those fields exist.
- A deliberately honest view of **mapped data**, not a claim about real-world surveillance completeness.

## What Peekaboo is not

Peekaboo does **not** discover cameras, probe devices, access live feeds, identify surveillance blind spots, or claim that an unmapped area has no surveillance. It only visualizes data already published in OpenStreetMap.

## v0.2 features

### Map and inspection

- Interactive Leaflet/OpenStreetMap map.
- Live Overpass query for the current viewport.
- Categories for cameras, ALPR/plate readers, guards, gunshot detectors and other surveillance objects.
- Layer filters with per-category counts.
- Public OSM metadata inspector with direct source-object and changeset links.
- OSM record version and update timestamp when available.

### Reliability and provenance

- Result sets are bound to the viewport that produced them.
- Visible **VIEW MOVED • RESCAN** state prevents old results from being mistaken for the current map view.
- Mapping-signal statistics use the loaded query area rather than whatever viewport happens to be on screen later.
- Overpass endpoint failover between independent public instances.
- Per-request timeout handling and cancellation of superseded queries.
- Five-minute session cache to reduce repeat load on public Overpass infrastructure.
- Explicit force-refresh control for a fresh network query.
- Source endpoint, query path and query duration shown in the interface.

### Reproducibility and data tools

- URL hash permalinks preserve map center, zoom and visible layers.
- One-click copyable view links.
- GeoJSON export of the currently visible loaded categories.
- Export metadata explicitly states that missing OSM records do not imply absence of surveillance.

### Guardrails

- Hard viewport-size cap to avoid abusive Overpass queries.
- No backend, database, accounts or API keys.
- No live-feed access or device discovery.
- Responsive desktop/mobile UI.

## Run locally

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Data flow

```text
OpenStreetMap contributors
        │
        ▼
 public Overpass endpoints
        │
        ├── timeout / cancellation
        ├── endpoint failover
        └── short session cache
        │
        ▼
  tag normalization
        │
        ├── camera
        ├── ALPR / ANPR
        ├── guard
        ├── gunshot detector
        └── other surveillance
        │
        ▼
 React + Leaflet interface
```

The Overpass query includes objects with either `man_made=surveillance` or a `surveillance:type=*` tag and requests metadata plus centers for mapped ways/relations.

## Mapping signal

The **Mapping Signal** panel intentionally does not call itself "coverage confidence." An empty OpenStreetMap result cannot establish that a real location has no cameras.

- **Mapped density**: loaded OSM surveillance objects per approximate square kilometer of the viewport that produced the result set.
- **Tag detail**: how often loaded objects contain descriptive fields such as zone, operator, camera type and direction.

When the map moves after a scan, Peekaboo keeps the previous data visible but marks it stale relative to the current viewport until the user rescans.

## Responsible use

Peekaboo is intended for public-interest research, mapping quality work, journalism, education and civic transparency. Please respect OpenStreetMap's contributor community and public Overpass infrastructure. Do not use this project to target people or property, evade lawful security measures, or overload public API services.

## Attribution

Map and surveillance metadata © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the [ODbL](https://opendatacommons.org/licenses/odbl/).

Peekaboo source code is released under the MIT License.
