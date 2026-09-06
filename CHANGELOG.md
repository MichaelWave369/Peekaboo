# Peekaboo changelog

## 1.6.0

Major-metro camera expansion with explicit coverage-state semantics.

- Added **Denver / CDOT** as a viewport-bound official-source layer using camera data currently exposed through a CDOT-owned GIS host.
- Added **Chicago / Illinois public traffic cameras** as a viewport-bound public ArcGIS source with snapshot, direction and source-age metadata.
- Added a **Major Metros** coverage matrix for Los Angeles, Denver, Chicago, New York City, Miami, Detroit, Tucson and Austin.
- Coverage states are explicit: **IN APP**, **OFFICIAL VIEWER**, or **KEY REQUIRED**.
- Los Angeles remains covered by the existing Caltrans adapter.
- New York City / 511NY and Tucson / AZ511 are marked **KEY REQUIRED** because their documented camera APIs require developer credentials that are not safe to publish in the GitHub Pages client bundle.
- Miami / FL511, Detroit / Mi Drive and Austin / TxDOT remain **OFFICIAL VIEWER** integrations until Peekaboo has a stable no-secret machine-readable camera contract for them.
- Denver explicitly discloses that the currently integrated machine-readable source is hosted at CDOT's `test.maps.codot.gov`; COtrip remains the authoritative public fallback.
- Chicago is labeled conservatively as an Illinois public traffic-camera source rather than assuming uniform ownership for every individual record.
- Denver and Chicago use the reusable ArcGIS envelope contract with viewport fingerprints, 2,000-record transfer ceilings, fail-closed truncation, source-error propagation, coordinate validation and deterministic deduplication.
- Both metro sources use two-minute viewport-keyed session caches, 12-second timeouts and stale-view invalidation after the map moves.
- Media never autoloads or autoplays. Peekaboo only offers explicit source-published links, with HTTPS inline media limited to supported image/video/HLS types.
- Added a 300-marker rendering cap per metro source while preserving the full query count. The panel explicitly reports `N IN QUERY • 300 RENDERED` when the cap is active.
- Added regressions for Denver/Chicago query bounding, source-specific normalization, unsafe URL rejection, source-age/status semantics, transfer-limit propagation, deduplication and metro coverage-state policy.

### Major-metro semantics

A city marked **IN APP** has a Peekaboo source adapter. **OFFICIAL VIEWER** means the public agency publishes cameras but Peekaboo does not yet have a stable no-secret machine-readable integration contract. **KEY REQUIRED** means the documented API requires credentials, so Peekaboo refuses to embed a secret in its public client bundle.

The metro adapters remain separate from OpenStreetMap surveillance records and never enter the OSM change ledger.

## 1.5.0

Reusable ArcGIS official-feed foundation plus Iowa DOT / Iowa 511 cameras.

- Added shared ArcGIS official-feed helpers for envelope validation, deterministic viewport fingerprints, bounded FeatureServer queries, transfer-limit detection, source-error propagation, coordinate extraction and first-ID-wins deduplication.
- Added **Iowa DOT / Iowa 511** as another credential-free official public camera source.
- Added an **IOWA DOT** map chip and dedicated Iowa DOT source panel.
- Iowa DOT requests are scoped to the current map viewport through the state-published Traffic Cameras FeatureServer.
- Added explicit image/video normalization from `ImageURL` and `VideoURL` without treating ordinary camera metadata as feed access.
- Added source metadata including route, region, organization, camera type/function, common camera ID and the public `RECORDED` field.
- The Iowa `RECORDED` field is displayed only as a source claim; Peekaboo does not reinterpret it as proof of current recording or retention.
- Iowa records remain separate from OSM surveillance objects and the OSM change ledger.
- Added fail-closed handling for ArcGIS `exceededTransferLimit`; truncated camera datasets are rejected rather than displayed as complete.
- Added two-minute viewport-keyed session caching and a 12-second source timeout.
- Added stale-viewport protection: moving the map invalidates the loaded Iowa DOT locality claim until the current viewport is refreshed.
- Media never autoplays or autoloads. HTTPS image/video/HLS is offered only from explicit Iowa DOT fields and only inline when the browser can support the media type.
- HTTP media remains external-only to avoid mixed-content failures in the HTTPS app.
- Added a 300-marker rendering cap for dense views while preserving the queried source count and instructing users to zoom in rather than silently dropping records.
- Added regressions for shared ArcGIS helpers, Iowa query bounding, safe media URLs, duplicate IDs, transfer-limit handling, source errors and conservative recording-field semantics.

### Iowa DOT source semantics

Iowa DOT explicitly documents its 511 ESRI feature services as credential-free public data feeds for current traffic cameras, images and video streams. Peekaboo consumes only those published fields. It does not derive stream paths, probe devices or infer feed access from camera existence alone.

## 1.4.0

Official transportation-camera expansion with viewport-bound Caltrans feeds.

- Added **Caltrans CCTV** as a second zero-secret official-source adapter alongside USGS Ashcam.
- Added a **CALTRANS** map chip and dedicated Caltrans source panel.
- Caltrans requests are scoped to the current map viewport through the official ArcGIS CCTV FeatureServer rather than loading the entire statewide catalog.
- Added explicit snapshot/video/source-status normalization from Caltrans fields including `currentImageURL`, `streamingVideoURL`, `inService`, route, direction, county and update metadata.
- Caltrans records remain separate from OSM surveillance objects and the OSM change ledger.
- Added fail-closed handling for ArcGIS `exceededTransferLimit`; Peekaboo refuses truncated camera datasets and asks the user to zoom in.
- Added a two-minute viewport-keyed session cache and a 12-second source timeout.
- Added stale-viewport protection: after the map moves, Caltrans markers and counts are not treated as current until the source is refreshed for the new view.
- Added explicit source/service receipts and separate **video**, **snapshot**, and **out-of-service** presentation states.
- Media never autoplays or autoloads. HTTPS snapshots load only after user action; direct video/HLS is offered only from Caltrans-published URLs and native browser playback capability.
- HTTP media remains external-only to avoid mixed-content failures in the HTTPS app.
- Added a 300-marker rendering cap for dense views while keeping the queried source count visible and instructing users to zoom in rather than silently dropping source records.
- Added regressions for query bounding, transfer-limit reporting, service-state parsing, safe URL handling, duplicate IDs, invalid coordinates and source-error propagation.

### Caltrans source semantics

Caltrans camera records are official transportation-agency data. `inService` is treated as a source-published status claim, not independent proof of physical camera health. A `streamingVideoURL` or `currentImageURL` is used only when Caltrans explicitly publishes it. Peekaboo does not scan devices, derive stream paths, or probe alternate endpoints.

## 1.3.0

Official public-camera sources become a separate evidence lane.

- Added an extensible official-feed adapter layer that is intentionally separate from OpenStreetMap surveillance records.
- Added the first zero-secret official source: **USGS Volcano Hazards Program / Ashcam** public current-image cameras.
- Added a **USGS CAMS** map chip and a dedicated **Official Public Cams** source panel.
- Added USGS camera markers with source-specific styling and image-freshness classes.
- Added a source-aware details drawer with the current USGS image, last-image timestamp, camera code, coordinates, volcano metadata when available, Ashcam history link, and original-provider link when supplied by USGS.
- USGS images load only after explicit user action and surface a clear media-load failure state.
- Added session caching and bounded source fetching for Ashcam, with source failure isolated from the OSM scanner.
- Added a 250-marker rendering cap for unusually broad views; source counts remain accurate and users are asked to zoom in rather than silently dropping records.
- Added regressions for Ashcam normalization, placeholder-coordinate rejection, HTTPS image requirements, duplicate records, and freshness classification.
- Renamed the OSM webcam quick chip to **OSM LIVE** so source provenance is visible before opening a record.
- Centralized release labels so enhancement components cannot race each other into displaying different versions.

### Official-source semantics

USGS Ashcam records are kept outside Peekaboo's OSM surveillance dataset and OSM change ledger. A USGS current image is treated as a near-real-time public snapshot whose freshness comes from the timestamp reported by Ashcam. It is not automatically described as continuous live video.

Official-source adapters do not probe devices, guess stream URLs, bypass authentication, or discover exposed cameras. They consume only intentionally public source data and published media.

## 1.2.2

Stale public-webcam provider repair and reachability semantics.

- Changed webcam status wording from **PUBLIC FEED** to **PUBLISHED LINK** unless Peekaboo has a current official provider route.
- Added an extensible public-camera provider registry so known providers can supply current official camera directories without overwriting the original OSM provenance.
- Added Nevada 511 handling: legacy or unrecognized `nvroads.com` webcam routes now use the current official `https://www.nvroads.com/cctv` camera directory as the primary action.
- Original OSM `contact:webcam` URLs remain visible in the object inspector for provenance even when an official provider fallback is used.
- Added explicit `reachability: unverified` semantics to public-webcam evidence. OSM publishing a URL is not treated as proof that the URL still works.
- Direct image/video/HLS loads now surface a clear media-load failure state instead of leaving a silently broken media element.
- Peekaboo still never probes for alternate stream paths, bypasses authentication, or converts ordinary surveillance records into viewable feeds.
- Added regression tests for current/legacy Nevada 511 routes, unknown-provider behavior, provider fallbacks, and fallback summary accounting.

## 1.2.1

Live-cam filtering and stale-viewport clarity fix.

- **LIVE CAMS** and **WEATHER** quick chips now act as complete presets instead of inheriting an accidentally empty base-category selection.
- Activating either preset restores all base surveillance categories, clears competing context filters, and enables only the requested webcam context.
- When the map has moved since the last scan, webcam quick chips show **RESCAN** instead of presenting previous-viewport counts as though they belong to the current map.
- Added a dedicated webcam-context warning with **RESCAN CURRENT MAP** when an active webcam filter is looking at stale loaded data.
- Preserved the previous loaded dataset until a new scan succeeds; the UI now makes that provenance boundary explicit instead of silently hiding it.

## 1.2.0

Public webcam viewing with explicit feed provenance.

- Added a **Public live cam** context based only on valid `contact:webcam=*` links carried by OSM surveillance records.
- Added a **Weather / conditions cam** context for public webcams whose OSM name/description indicates current-conditions use.
- Added **LIVE CAMS** and **WEATHER** quick-filter chips to the map.
- Added an object-level public webcam viewer.
- Direct HTTPS image feeds can render in Peekaboo with a manual refresh control.
- Direct HTTPS MP4/WebM/OGG media can play in Peekaboo with browser controls.
- Direct HTTPS HLS (`.m3u8`) links use native browser playback where supported and always retain an external published-feed fallback.
- Ordinary webcam webpages are never automatically embedded. Peekaboo opens them externally instead.
- Feed media never auto-loads. The user must explicitly press **LOAD PUBLISHED MEDIA**.
- Webcam URLs are rejected when they use unsupported schemes, credentials, localhost, or common private/link-local address ranges.
- Added regression tests for URL safety, media classification, weather hints and public-feed evidence.
- Updated social metadata and public release labels for v1.2.

### Public webcam semantics

A camera is viewable only when its OSM record explicitly publishes a valid `contact:webcam` URL. A camera name, operator, location, or surveillance category alone never creates feed access. A published URL is evidence of a mapping claim, not proof that the destination remains reachable.

Peekaboo does not probe cameras, guess stream paths, discover exposed devices, bypass authentication, or convert ordinary surveillance records into live feeds.

## 1.1.0

Public-use polish and conservative context layers.

- Added on-map quick filter chips for Flock, ALPR, cameras, public-space context and park/recreation context.
- Added a compact map legend.
- Added an in-app **What's New** panel.
- Added a compact **Recently Changed** summary when a compatible local baseline exists.
- Added Web Share API support with copy-link fallback.
- Added richer Open Graph and Twitter sharing metadata.
- Added mobile spacing, touch-target and details-sheet polish.
- Added explicit public-space context based on `surveillance=public` and public/town/street surveillance-zone tags.
- Added conservative park/recreation context based only on explicit park/recreation tags carried by the surveillance record.
- Added context-filter persistence to shared map URLs.
- Added context evidence to GeoJSON exports and context summaries to JSON manifests.
- Added regression tests preventing public/park context from being inferred from operator names or free text alone.

### Context semantics

`Public space` describes the mapped surveillance context. It does not prove public ownership or operation.

`Park / recreation` requires explicit park/recreation context on the surveillance record. Peekaboo does not infer park status merely because a camera is geographically near a mapped park.

## 1.0.0

Map-first public release.

- Full-map consumer-style interface.
- Floating address/place search and research drawer.
- Overlay object inspector with mobile bottom-sheet behavior.
- Existing provenance, Flock classification, adaptive Overpass scans, endpoint health, request budgets, change ledger and audit exports preserved from the 0.x series.
