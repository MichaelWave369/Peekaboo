# PEEKABOO

**Public Eye Explorer for Known Area-Based Observation Objects**

> **See what sees you.**

Peekaboo is a public-data map for exploring surveillance infrastructure that has been voluntarily documented in [OpenStreetMap](https://www.openstreetmap.org/). It queries the public Overpass API for surveillance-related OSM objects in the current map view, normalizes the tags, and presents them in a modern browser interface.

## What Peekaboo is

- A transparency and civic-tech visualization tool.
- A client-side OpenStreetMap / Overpass explorer.
- A way to inspect public metadata such as surveillance type, observed zone, operator, camera type and direction when those tags exist.
- A deliberately honest view of **mapped data**, not a claim about real-world surveillance completeness.

## What Peekaboo is not

Peekaboo does **not** discover cameras, probe devices, access live feeds, identify surveillance blind spots, or claim that an unmapped area has no surveillance. It only visualizes data already published in OpenStreetMap.

## v0.1 features

- Interactive Leaflet/OpenStreetMap map.
- Live Overpass query for the current viewport.
- Categories for cameras, ALPR/plate readers, guards, gunshot detectors and other surveillance objects.
- Layer filters.
- Public OSM metadata inspector with direct source-object link.
- Mapping-signal panel for mapped density and tagging detail.
- Hard viewport-size cap to avoid abusive Overpass queries.
- Responsive desktop/mobile UI.
- No backend, database, accounts or API keys.

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
   Overpass API
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

The Overpass query currently includes objects with either `man_made=surveillance` or a `surveillance:type=*` tag and requests centers for mapped ways/relations.

## Mapping signal

The **Mapping Signal** panel intentionally does not call itself "coverage confidence." An empty OpenStreetMap result cannot establish that a real location has no cameras. The panel only summarizes the records currently loaded:

- **Mapped density**: OSM surveillance objects per approximate square kilometer in the current viewport.
- **Tag detail**: how often loaded objects contain descriptive fields such as zone, operator, camera type and direction.

## Responsible use

Peekaboo is intended for public-interest research, mapping quality work, journalism, education and civic transparency. Please respect OpenStreetMap's contributor community and Overpass infrastructure. Do not use this project to target people or property, evade lawful security measures, or overload public API services.

## Attribution

Map and surveillance metadata © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the [ODbL](https://opendatacommons.org/licenses/odbl/).

Peekaboo source code is released under the MIT License.
