# Peekaboo v1.9 — Wildlife + FAA WeatherCams

Peekaboo v1.9 expands the curated Places + Nature lane with government-published wildlife and aviation-weather camera sources.

## Wildlife shortcut

The **WILDLIFE** source chip is a filtered view of the curated place registry. Initial entries are based on the U.S. Fish & Wildlife Service wildlife-webcam program:

- Blackwater National Wildlife Refuge — eagle and osprey cameras
- Seal Island National Wildlife Refuge — puffin camera
- Hopper Mountain National Wildlife Refuge — California condor camera

These records are `government-official` because the U.S. Fish & Wildlife Service itself identifies those refuge webcam programs. They open the official USFWS wildlife-webcam source externally.

### Wildlife availability semantics

USFWS notes that many refuge webcams operate only seasonally and weather-permitting. Peekaboo therefore treats the public camera program as an official published viewer, not proof that a live image is continuously available at every moment.

A refuge being closed to public physical access does not prevent a public webcam from being intentionally published. In fact, remote viewing can reduce disturbance at sensitive wildlife locations.

## FAA WeatherCams shortcut

The **FAA WX** source chip is another filtered view of the curated place registry. Initial seeded locations include:

- Homer, Alaska
- Fairbanks International Airport, Alaska
- Kapalua, Hawaiʻi
- the FAA Hawaiʻi WeatherCam directory

These records are `government-official` and only point to `weathercams.faa.gov`.

The FAA describes its Weather Camera Program as a near-real-time aviation-weather service. Camera imagery is generally updated about every ten minutes and many sites expose multiple directional views. FAA documentation says the program maintains hundreds of camera systems and also hosts images from a larger third-party network.

### FAA semantics

Peekaboo does not call a hidden FAA media API, scrape camera-image paths, or relabel hosted third-party imagery as FAA-owned hardware. The v1.9 integration is an official-viewer index: the public FAA page remains the authority for the currently available camera views, alerts and station context.

## Hawaiʻi Volcanoes

v1.9 also adds an official Hawaiʻi Volcanoes National Park place record linked to the National Park Service / USGS Hawaiian Volcano Observatory webcam hub.

NPS describes the Hawaiʻi volcano webcams as operating 24/7, including visible-light and thermal views. Weather, darkness and equipment failures can still limit what a camera shows, so Peekaboo does not interpret a dark or unavailable frame as proof that the camera was removed.

## Provenance boundary

Wildlife, FAA WeatherCam and Hawaiʻi Volcanoes entries remain in the curated place-source lane.

They do not become:

- OpenStreetMap surveillance records;
- OSM public-webcam claims;
- transportation FeatureServer records;
- OSM change-ledger entries.

The source-category chips are filtered views over the same curated registry rather than separate evidence databases.

## Security boundary

Peekaboo opens these publisher pages externally. It does not probe devices, derive alternate stream paths, bypass authentication, or turn ordinary camera metadata into feed access.
