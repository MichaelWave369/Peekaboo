# Public webcams and published feeds

Peekaboo v1.2 may display or link to a camera feed only when the mapped OpenStreetMap record explicitly publishes a valid `contact:webcam=*` URL.

## What counts as a public feed

The OSM webcam convention describes webcams as cameras whose feed is publicly available and recommends storing the feed URL in `contact:webcam=*` on the surveillance record.

Peekaboo treats that tag as feed-access evidence. Camera names, operators, manufacturers, locations, proximity to parks, and surveillance categories do not create a feed URL.

## Viewer policy

- Media never auto-loads. A user explicitly chooses **LOAD PUBLIC FEED**.
- Direct HTTPS image URLs may render inside Peekaboo.
- Direct HTTPS browser-video URLs may render inside Peekaboo.
- Direct HTTPS HLS (`.m3u8`) URLs use native browser playback where supported.
- Ordinary webcam webpages are not automatically iframed or executed inside Peekaboo. They open as external published-feed links.
- Every public webcam retains a direct external link to the URL published in OSM.

## URL safety

Peekaboo rejects webcam links that use unsupported URL schemes, embed credentials, or target obvious local/private/link-local addresses such as localhost, loopback, RFC1918 IPv4 space and common local IPv6 ranges.

This is defense in depth. OSM is community editable, so a URL stored in a tag must not be treated as trusted executable content.

## What Peekaboo does not do

Peekaboo does not:

- scan IP address ranges,
- discover exposed cameras,
- guess RTSP/HLS/MJPEG paths,
- test default credentials,
- bypass logins or authentication,
- convert an ordinary surveillance marker into a feed,
- infer that a camera is public merely because it is city-owned or located in a public place.

## Weather, city and park context

**Weather / conditions** is a descriptive hint applied only after public-feed evidence already exists. It can be inferred from OSM name/description text such as weather, snow, surf, river, volcano or current conditions. This hint does not create feed access.

**City / public space** continues to rely on the existing OSM public/town/street context rules.

**Park / recreation** continues to require explicit park/recreation context on the surveillance record rather than geographic proximity alone.

## Future official source adapters

The source-adapter architecture can later ingest official public-camera catalogs while preserving source-specific provenance. Candidate adapters include National Park Service webcams, USGS near-real-time webcams and transportation-agency camera catalogs. Any adapter must use documented public interfaces and comply with that provider's authentication, rate-limit and redistribution rules.
