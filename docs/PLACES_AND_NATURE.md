# Peekaboo Places + Nature source policy

Peekaboo v1.7 adds a curated **Places + Nature** layer for public park, nature, landmark and tourism camera pages.

This layer is intentionally different from the OSM surveillance dataset and from machine-readable official camera adapters such as Caltrans, Iowa DOT, CDOT or USGS Ashcam.

## Source classes

### Government official

The publisher is a government agency or an official government camera/traveler-information service.

Examples in the initial v1.7 registry:

- Yellowstone National Park webcams — National Park Service
- Grand Canyon Yavapai Point — National Park Service
- Grand Canyon South Entrance — National Park Service
- Las Vegas traffic-camera gateway — RTC Southern Nevada / NDOT
- Atlantic City-area traffic cameras — NJDOT / 511NJ

### Public commercial

The camera is intentionally published for public viewing, but it is operated by a private/commercial publisher. Peekaboo must not relabel it as a municipal, park-agency or property-owner camera merely because the view contains that place.

Examples in the initial registry:

- Key West Harbor — PTZtv / Historic Tours of America; the operator explicitly says it is not affiliated with or officially endorsed by the City of Key West.
- Anaheim / Disneyland Resort area — EarthCam / Hilton Anaheim; this is not an official Disneyland or Disney-operated camera.
- Las Vegas public tourism view — EarthCam; separate from RTC/NDOT traffic cameras.
- Atlantic City Boardwalk Live — public third-party livestream; separate from NJDOT / 511NJ.

## Media policy

Curated place-camera pages are opened on the publisher's site.

Peekaboo does not:

- copy or restream the media;
- scrape hidden stream URLs out of commercial pages;
- bypass player controls or authentication;
- infer ownership from what appears in the frame;
- convert a tourism camera into a surveillance record;
- add curated-place records to the OSM change ledger.

## Current initial registry

| Place | Source | Class | View type |
| --- | --- | --- | --- |
| Yellowstone National Park | NPS | Government official | Webcam hub with Old Faithful livestream + static cams |
| Grand Canyon Yavapai Point | NPS | Government official | Periodic snapshot |
| Grand Canyon South Entrance | NPS | Government official | Frequently refreshed snapshot |
| Las Vegas | RTC / NDOT | Government official | Traffic-camera live viewer |
| Las Vegas | EarthCam | Public commercial | Tourism livestream |
| Atlantic City | NJDOT / 511NJ | Government official | Traffic-camera viewer |
| Atlantic City Boardwalk | APM Digital / YouTube | Public commercial | Livestream |
| Key West Harbor | PTZtv / Historic Tours of America | Public commercial | Livestream |
| Anaheim / Disneyland Resort area | EarthCam / Hilton Anaheim | Public commercial | Tourism livestream |

## Why Disneyland is labeled “area”

Peekaboo did not find an official Disneyland public webcam source in the current public Disneyland site material used for this release. The curated Anaheim source is a public third-party tourism camera whose view includes the Disneyland Resort area skyline. It must remain labeled as a third-party public view, not a Disney camera.

## Future expansion

The Places + Nature registry is suitable for additional intentionally public sources such as:

- NPS park webcam pages;
- NOAA/NDBC BuoyCAMs and environmental cameras;
- official state or municipal camera viewers;
- public harbor, beach and skyline streams whose publisher and access terms are clear.

When a documented machine-readable source is available, Peekaboo should prefer a dedicated source adapter over a curated viewer entry so it can preserve camera-level coordinates, freshness and provenance.
