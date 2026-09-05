# PEEKABOO

**Public Eye Explorer for Known Area-Based Observation Objects**

> **See what sees you.**

Peekaboo is a public-data map for exploring surveillance infrastructure voluntarily documented in [OpenStreetMap](https://www.openstreetmap.org/). It queries public Overpass infrastructure for surveillance-related OSM objects in the current map view, normalizes the tags, and presents them in a modern browser interface.

**Live site:** https://michaelwave369.github.io/Peekaboo/

## What Peekaboo is

- A transparency and civic-tech visualization tool.
- A client-side OpenStreetMap / Overpass explorer.
- A way to inspect public metadata such as surveillance type, observed zone, operator, manufacturer, model, camera type, direction and OSM source provenance when those fields exist.
- A deliberately honest view of **mapped data**, not a claim about real-world surveillance completeness.

## What Peekaboo is not

Peekaboo does **not** discover cameras, probe devices, access live feeds, identify surveillance blind spots, or claim that an unmapped area has no surveillance. It only visualizes data already published in OpenStreetMap.

## v0.6 features

### Viewport-bound OSM change ledger

Peekaboo can now save a local baseline for a scanned viewport and compare later scans of that **same query area** against it.

- `NEWLY MAPPED` means an OSM record ID is present now but was not present in the saved baseline.
- `REMOVED FROM OSM` means a baseline OSM record ID is no longer present in the current result set.
- `METADATA CHANGED` means the same OSM object has a different semantic comparison fingerprint, such as operator, model, vendor evidence, classification, direction, geometry or raw tag changes.
- `UNCHANGED` means the normalized OSM record payload matches the saved baseline.
- Peekaboo refuses to infer change when baseline and current viewport fingerprints differ.
- Removed records are counted and exported, but are not rendered as ghost devices on the live map.
- Added/changed current records receive subtle map-ring indicators and per-object change receipts.

The change ledger compares **public OSM records**, not physical hardware. An added record does not independently prove installation; a removed record does not independently prove removal; and metadata edits do not establish device activity or status.

### Portable, tamper-checked snapshots

- Baselines are stored locally in the browser and are not uploaded by Peekaboo.
- Snapshots can be exported as JSON and imported later for the same viewport.
- Snapshot records use deterministic semantic fingerprints plus a dataset fingerprint.
- Imported snapshots are validated for generator, schema, record count, duplicate IDs, coordinates and fingerprint integrity before use.
- Snapshot imports are size-bounded in the browser.
- The comparison fingerprint is deterministic but is intended for reproducibility/tamper detection, not cryptographic authentication.
- Source revision metadata such as OSM version/timestamp alone does not fabricate a semantic change when the mapped semantic payload is unchanged.
- Change reports can be exported as JSON with baseline/current fingerprints, query metadata and explicit uncertainty language.

### Dense-map rendering

- Deterministic client-side clustering activates automatically for dense result sets at lower zoom levels.
- Clusters are only a rendering optimization: record totals, filters and exports continue to operate on the underlying OSM records.
- Clicking a cluster zooms toward the grouped records; high zoom restores individual markers.
- No additional map service, analytics service or clustering dependency is required.

### Metadata detail diagnostics

Peekaboo computes a **metadata detail score** for each loaded record based on descriptive fields such as source identity, classification, timestamp, zone, operator, camera type, direction, manufacturer and model.

- The score measures metadata completeness only.
- It is explicitly labeled **NOT TRUTH SCORE** in the interface.
- Missing or generic fields are shown in the object inspector.
- Dataset-level average detail and high/medium/low detail counts can be included in the exported audit manifest.

### Co-location diagnostics

- Peekaboo detects mapped-record pairs within roughly 12 meters using a bounded spatial index.
- These are labeled **co-located candidates**, never automatically deduplicated.
- Nearby records may represent duplicate mapping, multiple real devices on one structure, or legitimate overlapping records.
- The selected-object inspector explains the ambiguity instead of silently merging evidence.

### Failure recovery

- Failed queries preserve the previously loaded result set instead of replacing it with a misleading empty map.
- Query errors expose an explicit retry control.
- Browser online/offline state is surfaced in the interface.
- Superseded requests are aborted, including cleanup when the app unmounts.
- A top-level React error boundary fails into a recovery screen rather than leaving a partially rendered map that appears trustworthy.
- Baseline storage/import errors are contained and surfaced instead of silently corrupting comparison state.

### Search and auditability

- Search within currently loaded public OSM records by name, operator, manufacturer, model, zone, category, object ID and raw tag text.
- Search state is preserved in copyable Peekaboo view links alongside map center, zoom and visible layers.
- Selected objects automatically close if filtering/search removes them from the visible result set.

### OSM record age

Peekaboo separates **record age** from **device status**.

- `< 1 year`, `1–3 years`, `3+ years`, and `unknown/no date` buckets summarize the last OSM edit timestamp.
- Each selected object shows its OSM record-age class.
- An old OSM record is never presented as proof that a physical device has disappeared.
- A recent edit is never presented as independent verification that a physical device is currently active.

### Flock Safety ALPR layer

Peekaboo treats mapped Flock Safety ALPR devices as a first-class category while preserving the provenance of the vendor claim.

- Strong Flock matches use `manufacturer=Flock Safety` or `manufacturer:wikidata=Q108485435`.
- Older or alternate `brand=Flock Safety` / `operator=Flock Safety` records can still be recognized, but are labeled as legacy/alternate evidence in the inspector.
- Falcon model text can support the ALPR classification when vendor evidence is present.
- Flock Raven gunshot detectors remain in the gunshot-detector category instead of being mislabeled as ALPR cameras.
- Manufacturer, model, evidence strength and the exact source tag are displayed in the detail inspector.
- Vendor identity is always presented as an **OpenStreetMap claim**, not independent physical-device verification.

### Reliability and provenance

- Result sets are bound to the viewport that produced them.
- Visible **VIEW MOVED • RESCAN** state prevents old results from being mistaken for the current map view.
- Mapping-signal statistics use the loaded query area rather than whatever viewport happens to be on screen later.
- Overpass endpoint failover between independent public instances.
- Small abortable delay before fallback requests reduces immediate hammering when an endpoint fails.
- Per-request timeout handling and cancellation of superseded queries.
- Five-minute session cache to reduce repeat load on public Overpass infrastructure.
- Explicit force-refresh control for a fresh network query.
- Source endpoint, query path, query duration and prior failover count shown in the interface.
- Overpass `remark` responses are treated as failures rather than silently accepted as empty/partial data.
- Browser rendering is bounded for unexpectedly large result sets.

### Reproducibility and data tools

- URL hash permalinks preserve map center, zoom, visible layers and loaded-record search text.
- One-click copyable view links.
- GeoJSON export of the currently visible loaded records.
- CSV export with spreadsheet-formula injection neutralization for untrusted public text fields.
- JSON manifest export containing schema version, source endpoint, query metadata, category counts, OSM record-age summary, metadata-detail diagnostics, co-location diagnostics and change-ledger summary when a compatible baseline exists.
- Portable JSON snapshot export/import for same-viewport comparisons.
- JSON change-report export with added, removed and changed OSM records.
- GeoJSON includes manufacturer/model/vendor-evidence fields when available.
- Export metadata explicitly states that vendor identity is an OSM claim and missing OSM records do not imply absence of surveillance.

### Guardrails

- Hard viewport-size cap to avoid abusive Overpass queries.
- No backend, database, accounts or API keys.
- No live-feed access or device discovery.
- No routing around surveillance or blind-spot inference.
- No automatic deletion or merging of suspected duplicate records.
- No cross-viewport change inference.
- Responsive desktop/mobile UI.

## Run locally

```bash
npm install
npm run dev
```

Tests and production build:

```bash
npm test
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
        ├── endpoint failover + light backoff
        └── short session cache
        │
        ▼
  tag normalization
        │
        ├── Flock Safety ALPR
        ├── camera
        ├── generic ALPR / ANPR
        ├── guard
        ├── gunshot detector
        └── other surveillance
        │
        ├── vendor-claim provenance
        ├── OSM record-age classification
        ├── metadata-detail diagnostics
        ├── bounded co-location diagnostics
        ├── loaded-record search
        ├── viewport-bound change snapshots
        └── GeoJSON / CSV / manifest / change exports
        │
        ▼
 deterministic display clustering
        │
        ▼
 React + Leaflet interface
```

The Overpass query includes objects with either `man_made=surveillance` or a `surveillance:type=*` tag and requests metadata plus centers for mapped ways/relations.

## Change-ledger policy

Peekaboo deliberately treats source change and physical-world change as different claims.

A baseline is tied to the exact stored viewport fingerprint. A later scan is comparable only when its viewport fingerprint matches. The comparison key is the OSM object ID; semantic fingerprints then detect normalized/tag/geometry changes for records that persist across snapshots.

The following inferences are intentionally **not** made:

- `NEW OSM RECORD` ≠ independently verified new physical camera.
- `REMOVED FROM OSM` ≠ independently verified removed physical camera.
- `METADATA CHANGED` ≠ independently verified hardware modification.
- `UNCHANGED` ≠ proof the physical device remains present or active.

This keeps the ledger useful for public-data research without laundering map edits into claims about the real world.

## Flock identification policy

Peekaboo deliberately separates three claims that are often blurred together:

1. A mapped surveillance object exists in OSM.
2. Its tags indicate ALPR/ANPR behavior or a Falcon model.
3. Its tags attribute the device to Flock Safety.

Only records that satisfy both the Flock-vendor claim and the ALPR/Falcon condition enter the dedicated **Flock Safety ALPR** layer. A Flock manufacturer tag by itself is not enough to label an arbitrary surveillance device as an ALPR.

OSM data can be incomplete, outdated, disputed or incorrectly tagged. Peekaboo therefore exposes the original object, changeset, raw tags, record age, descriptive-metadata gaps and change-ledger status so users can inspect the evidence rather than treating the rendered marker as an independently verified fact.

## Mapping signal and diagnostics

The **Mapping Signal** panel intentionally does not call itself "coverage confidence." An empty OpenStreetMap result cannot establish that a real location has no cameras.

- **Mapped density**: loaded OSM surveillance objects per approximate square kilometer of the viewport that produced the result set.
- **Tag detail**: how often loaded objects contain descriptive fields such as zone, operator, camera type and direction.
- **Metadata detail score**: descriptive-field completeness, not claim truthfulness.
- **Co-located candidates**: nearby mapped records, not automatically duplicate devices.
- **Change ledger**: differences between two same-viewport OSM snapshots, not independently verified physical changes.

When the map moves after a scan, Peekaboo keeps the previous data visible but marks it stale relative to the current viewport until the user rescans.

## Responsible use

Peekaboo is intended for public-interest research, mapping quality work, journalism, education and civic transparency. Please respect OpenStreetMap's contributor community and public Overpass infrastructure. Do not use this project to target people or property, evade lawful security measures, or overload public API services.

## Attribution

Map and surveillance metadata © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the [ODbL](https://opendatacommons.org/licenses/odbl/).

Peekaboo source code is released under the MIT License.
