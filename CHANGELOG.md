# Peekaboo changelog

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
