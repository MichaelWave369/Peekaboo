# Peekaboo changelog

## 2.2.0

Product-state consolidation and information-architecture pass.

- Added a shared React product-state contract for viewport, scan state, ledger delta, current browse mode and selected-record navigation.
- `TeachMapEnhancer` no longer infers scan or ledger state from DOM text / mutation observation; those values now come from application state.
- Added first-class **SURVEILLANCE** and **PUBLIC VIEWS** browse modes so the source rail agrees with the evidence lanes explained during onboarding.
- Surveillance mode presents OSM type/context controls plus OSM-published webcam controls; Public Views presents official/institution/commercial source controls.
- Mode presentation hides the other evidence family's map markers without silently clearing that family's explicit layer state.
- Added a first-class **OSM RESULTS** browser for the current successfully scanned viewport.
- OSM result browsing is disabled after the map moves until a compatible rescan succeeds, preserving the existing viewport-binding contract.
- The result sheet caps its UI list at 100 entries while reporting the full filtered count instead of turning a list-rendering cap into a data claim.
- Added selected OSM record permalinks through a bounded `record=` hash parameter that survives the normal map hash writer.
- A record permalink restores its map/filter/mode state but still requires the user to explicitly scan OSM before the linked record can be loaded.
- Added **COPY RECORD LINK** and **SHARE RECORD** actions to the OSM details drawer.
- Added a reusable **HOW THIS MAP WORKS** action inside `WHAT WORKS HERE`, allowing returning users to reopen the three-lane explanation without clearing local storage.
- Geolocation now explicitly nudges **SCAN THIS VIEW** after moving the map while preserving the rule that location permission never auto-starts an OSM query.
- Coverage hints prioritize applicable regional source policy before generic OSM/curated-source summaries.
- Introduced `product.css` as the forward product-design layer rather than adding another version-numbered stylesheet.
- Added tests for product-mode normalization, safe record IDs, hash persistence and deterministic result ordering.

### v2.2 semantics

Browse mode is presentation and interaction state, not evidence conversion. Switching modes never turns an official public feed into an OSM record or vice versa. Explicitly enabled source-layer state is retained when moving between modes, while the non-active evidence family is hidden from map interaction.

A selected-record permalink identifies a public OSM record and the viewport/filter context needed to look for it. Opening that link does not silently query OSM. The user still chooses **Scan this view**.

## 2.1.0

First-run comprehension and map-level product clarity.

- Added one-time onboarding that states the product contract directly: public views are listed, OSM surveillance is scanned on demand, and an empty map does not prove an absence of cameras.
- Added a prominent map-level **SCAN THIS VIEW / RESCAN THIS VIEW / SCANNING OSM…** control that delegates to the existing viewport-bound acquisition path.
- Added explicit **USE MY LOCATION** navigation. Geolocation moves the map only and never automatically scans OSM.
- Added local last-viewport persistence while preserving shared-link precedence: an explicit `map=` hash always wins over saved local history.
- Added a viewport-aware **WHAT WORKS HERE** panel with `IN APP`, `KEY REQUIRED`, `OFFICIAL VIEWER` and `SCAN ON DEMAND` source-policy hints.
- NYC now explicitly exposes the 511NY developer-key limitation rather than making unavailable native integration look like zero cameras.
- Added in-viewport curated public-view and NOAA/NDBC BuoyCAM counts to coverage hints.
- Added a map-level OSM ledger pulse for newly mapped, removed-from-OSM and metadata-changed records.
- Preserved the exact ledger semantics: `REMOVED FROM OSM` is a database-record claim, never a physical-camera-removal claim.
- Documented deferred structural work instead of implementing deeper mode/list/permalink features through additional DOM observers.

## 2.0.0

Publisher-model expansion for institution-owned public cameras and Great Lakes environmental sources.

- Added **INSTITUTION OFFICIAL** as a third first-class curated publisher class alongside **GOVERNMENT OFFICIAL** and **PUBLIC COMMERCIAL**.
- Added institution-published public camera collections for Smithsonian's National Zoo, Monterey Bay Aquarium, San Diego Zoo and San Diego Zoo Safari Park.
- Added a **ZOO / AQUARIUM** curated-source shortcut.
- Added official NOAA Great Lakes Environmental Research Laboratory station/webcam records for South Haven, Thunder Bay Island, Alpena, Muskegon Pier Light and Toledo Channel Marker #2.
- Added a **GREAT LAKES** shortcut while keeping NOAA/GLERL records government-official.
- Added regression coverage preventing commercial tourism sources from silently promoting into government/institution classes.
- Added distinct visual treatment for institution-official publishers.

## 1.9.0

Wildlife, aviation-weather and Hawaiʻi volcano source expansion.

- Added a **WILDLIFE** shortcut over canonical U.S. Fish & Wildlife Service refuge-camera records.
- Added USFWS public wildlife-camera sources including Blackwater eagle/osprey, Seal Island puffins and Hopper Mountain condors.
- Added an **FAA WX** shortcut and seeded official FAA WeatherCam locations for Alaska and Hawaiʻi.
- FAA camera imagery remains source-viewer based; Peekaboo does not scrape hidden image endpoints from the FAA application.
- Added official Hawaiʻi Volcanoes National Park / USGS Hawaiian Volcano Observatory webcam coverage.
- Preserved seasonal/weather/outage caveats instead of treating every wildlife/aviation/volcano source as continuously live.
- Implemented WILDLIFE and FAA WX as filtered views over the canonical Places registry rather than duplicated records.

## 1.8.0

NOAA/NDBC marine-camera expansion plus a broader official National Park webcam registry.

- Added a dedicated **NOAA BUOYS** layer backed by a vetted registry of NOAA National Data Buoy Center BuoyCAM station IDs and coordinates.
- Added current-image viewing through NDBC's documented `buoycam.php?station=...` endpoint.
- BuoyCAM media loads only after explicit user action and manual refresh stays on the same documented NOAA endpoint.
- Added explicit NOAA source receipts and a dedicated ocean/weather camera drawer.
- Added source-aware failure handling for nighttime, unavailable or too-old BuoyCAM imagery; Peekaboo does not invent alternate image paths.
- NOAA stations remain separate from OSM surveillance records, OSM webcams, transportation sources and commercial tourism streams.
- Added regression tests for station validation, duplicate handling, current-image URL construction and viewport filtering.
- Expanded the official NPS Places + Nature registry with Yosemite, Zion, Mount Rainier, Glacier, Great Smoky Mountains and Acadia.
- Added regressions ensuring the expanded park set remains government-official rather than inheriting commercial-source semantics.
- Kept the growing quick-source rail horizontally scrollable with a visible thin scrollbar for easier source discovery.
- Hardened NOAA drawer lifecycle so disabling the layer closes its inspector rather than leaving hidden-source UI behind.
- Added `docs/NOAA_NDBC_BUOYCAMS.md` and updated the README/release panel for the five-lane evidence model.

### NOAA / NDBC semantics

A NOAA BuoyCAM marker means Peekaboo has a vetted public NDBC station record and uses NOAA's documented most-recent-image endpoint. NDBC generally operates BuoyCAMs during daylight and documents a source-side age cutoff for its current-image endpoint. Peekaboo therefore does not invent a separate freshness score.

A failed image load can mean nighttime, a stale image, station outage or another source-side condition. It is not treated as proof that the physical camera was removed.

## 1.7.0

Places + Nature expansion with source-rail polish and explicit official-vs-commercial place provenance.

- Added a curated **PLACES** layer for parks, nature, landmark and tourism camera pages.
- Initial curated coverage includes Yellowstone National Park, Grand Canyon National Park, Las Vegas, Atlantic City, Key West Harbor and the Anaheim / Disneyland Resort area.
- Added official NPS entries for Yellowstone and Grand Canyon without requiring an NPS API key because Peekaboo links to stable public NPS webcam pages rather than calling the protected API.
- Added an official RTC / NDOT Las Vegas traffic-camera gateway and kept it separate from a public-commercial EarthCam tourism stream.
- Added an official NJDOT / 511NJ Atlantic City-area traffic-camera viewer and kept it separate from a public third-party Boardwalk livestream.
- Added a public Key West Harbor stream from PTZtv / Historic Tours of America with an explicit note that the operator states it is not affiliated with or officially endorsed by the City of Key West.
- Added a public Anaheim / Disneyland Resort area stream from EarthCam / Hilton Anaheim with an explicit note that it is not an official Disneyland or Disney-operated camera.
- Curated place sources are external-only. Peekaboo does not copy, restream, scrape hidden media URLs or infer ownership from what appears in the frame.
- Added a local viewport-aware place registry so moving the map does not require a new network request merely to discover curated place markers.
- Added source-class badges for **government official** and **public commercial** place feeds.
- Added regression tests for unique registry IDs, coordinate/URL validation, viewport filtering and the provenance rules that prevent Disneyland-area and Key West cameras from being mislabeled as official property/city feeds.
- Hardened drawer lifecycle so OSM, official-source, metro and curated-place inspectors do not stack on top of each other.
- Polished the quick-source row into a single-line horizontally scrollable source rail, reducing header crowding as more source adapters are added.
- Updated the README, release panel and source-policy documentation for the four-lane evidence model.

### Places + Nature semantics

A curated place record means Peekaboo has a known intentionally public viewer or stream page for that place. It does not mean the publisher is the owner of every landmark visible in the frame.

Government and public-commercial publishers remain separate classes. A third-party camera that happens to show Disneyland, Key West, Las Vegas or Atlantic City is not promoted into an official city, park or property-owner camera.

Curated place records remain outside OpenStreetMap and never enter the OSM change ledger.

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
- Caltrans requests are scoped to the current map viewport through the official Caltrans CCTV ArcGIS FeatureServer rather than loading the entire statewide catalog.
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
