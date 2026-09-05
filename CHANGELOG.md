# Peekaboo changelog

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
