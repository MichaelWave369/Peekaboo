import { safePublicCamUrl } from './publicCam.js'

export const PLACE_FEED_STATUS = {
  'official-viewer': 'OFFICIAL VIEWER',
  'official-live': 'OFFICIAL LIVE',
  'public-stream': 'PUBLIC STREAM',
  'public-viewer': 'PUBLIC VIEWER',
}

export const PLACE_FEEDS = [
  {
    id: 'yellowstone-nps-webcams',
    name: 'Yellowstone National Park Webcams',
    place: 'Yellowstone National Park',
    region: 'WY / MT / ID',
    category: 'park',
    status: 'official-live',
    publisherClass: 'government-official',
    publisher: 'National Park Service',
    lat: 44.4605,
    lon: -110.8281,
    url: 'https://www.nps.gov/yell/learn/photosmultimedia/webcams.htm',
    summary: 'Official Yellowstone webcam hub. NPS currently lists ten webcams, including the Old Faithful / Upper Geyser Basin livestream and multiple static entrance/weather views.',
    media: 'mixed',
    externalOnly: true,
  },
  {
    id: 'grand-canyon-yavapai',
    name: 'Grand Canyon — Yavapai Point',
    place: 'Grand Canyon National Park',
    region: 'AZ',
    category: 'park',
    status: 'official-viewer',
    publisherClass: 'government-official',
    publisher: 'National Park Service',
    lat: 36.0566,
    lon: -112.1165,
    url: 'https://www.nps.gov/media/webcam/view.htm?id=6AB2E06A-B28C-A55F-6E7C6519E2AA8F51',
    summary: 'Official NPS air-quality and weather webcam looking northwest from Yavapai Point. NPS says the source image refreshes about every 15 minutes.',
    media: 'snapshot',
    externalOnly: true,
  },
  {
    id: 'grand-canyon-south-entrance',
    name: 'Grand Canyon — South Entrance',
    place: 'Grand Canyon National Park',
    region: 'AZ',
    category: 'park',
    status: 'official-viewer',
    publisherClass: 'government-official',
    publisher: 'National Park Service',
    lat: 35.9711,
    lon: -112.1242,
    url: 'https://www.nps.gov/media/webcam/view.htm?id=81B467D6-1DD8-B71B-0BE07E579A95DA72',
    summary: 'Official NPS South Entrance webcam used for current arrival and road-condition context. NPS says the view refreshes every minute.',
    media: 'snapshot',
    externalOnly: true,
  },
  {
    id: 'las-vegas-rtc-traffic',
    name: 'Las Vegas — RTC / NDOT Traffic Cameras',
    place: 'Las Vegas',
    region: 'NV',
    category: 'city',
    status: 'official-live',
    publisherClass: 'government-official',
    publisher: 'Regional Transportation Commission of Southern Nevada / NDOT',
    lat: 36.1147,
    lon: -115.1728,
    url: 'https://www.rtcsnv.com/traffic-cams/watch-live/',
    summary: 'Official Southern Nevada traffic-camera gateway. RTC directs users to Nevada 511 for live traffic camera feeds on major roadways.',
    media: 'live-video',
    externalOnly: true,
  },
  {
    id: 'las-vegas-earthcam',
    name: 'Las Vegas — Public Tourism Cam',
    place: 'Las Vegas',
    region: 'NV',
    category: 'tourism',
    status: 'public-stream',
    publisherClass: 'commercial-public',
    publisher: 'EarthCam',
    lat: 36.0908,
    lon: -115.1720,
    url: 'https://www.earthcam.com/usa/nevada/lasvegas/',
    summary: 'Public EarthCam tourism stream for the Las Vegas area. This is not an NDOT/RTC government camera and is kept in a separate public-commercial class.',
    media: 'live-video',
    externalOnly: true,
  },
  {
    id: 'atlantic-city-511nj',
    name: 'Atlantic City — NJ511 Traffic Cameras',
    place: 'Atlantic City',
    region: 'NJ',
    category: 'city',
    status: 'official-live',
    publisherClass: 'government-official',
    publisher: 'New Jersey Department of Transportation / 511NJ',
    lat: 39.3643,
    lon: -74.4229,
    url: 'https://www.511nj.org/',
    summary: 'Official New Jersey traveler-information system with live traffic camera access. NJDOT describes camera images as refreshed approximately every 30 seconds.',
    media: 'traffic-camera-viewer',
    externalOnly: true,
  },
  {
    id: 'atlantic-city-boardwalk-live',
    name: 'Atlantic City Boardwalk Live',
    place: 'Atlantic City',
    region: 'NJ',
    category: 'tourism',
    status: 'public-stream',
    publisherClass: 'commercial-public',
    publisher: 'APM Digital / YouTube',
    lat: 39.3568,
    lon: -74.4297,
    url: 'https://www.youtube.com/watch?v=GDU59FNpYAM',
    summary: 'Public livestream of the Atlantic City Boardwalk area. This is a third-party public stream, not an official City of Atlantic City or NJDOT camera.',
    media: 'live-video',
    externalOnly: true,
  },
  {
    id: 'key-west-harbor-ptztv',
    name: 'Key West Harbor Webcam',
    place: 'Key West',
    region: 'FL',
    category: 'tourism',
    status: 'public-stream',
    publisherClass: 'commercial-public',
    publisher: 'PTZtv / Historic Tours of America',
    lat: 24.5593,
    lon: -81.8074,
    url: 'https://www.keywestharborwebcam.com/',
    summary: 'Public Key West Harbor livestream with Mallory Square and harbor views. The operator explicitly states it is not affiliated with or officially endorsed by the City of Key West.',
    media: 'live-video',
    externalOnly: true,
  },
  {
    id: 'anaheim-disneyland-area-earthcam',
    name: 'Anaheim / Disneyland Resort Area Cam',
    place: 'Anaheim',
    region: 'CA',
    category: 'tourism',
    status: 'public-stream',
    publisherClass: 'commercial-public',
    publisher: 'EarthCam / Hilton Anaheim',
    lat: 33.8002,
    lon: -117.9180,
    url: 'https://www.earthcam.com/usa/california/anaheim/',
    summary: 'Public Anaheim tourism view that includes the Disneyland Resort area skyline. This is not an official Disneyland or Disney-operated camera.',
    media: 'live-video',
    externalOnly: true,
  },
]

export function normalizedPlaceFeed(feed = {}) {
  const lat = Number(feed.lat)
  const lon = Number(feed.lon)
  const url = safePublicCamUrl(feed.url)
  if (!feed.id || !feed.name || !Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180 || !url) return null
  if (!PLACE_FEED_STATUS[feed.status]) return null
  if (!['government-official', 'commercial-public'].includes(feed.publisherClass)) return null
  return { ...feed, lat, lon, url }
}

export function placeFeedRegistry() {
  const seen = new Set()
  return PLACE_FEEDS
    .map(normalizedPlaceFeed)
    .filter(Boolean)
    .filter((feed) => {
      if (seen.has(feed.id)) return false
      seen.add(feed.id)
      return true
    })
}

export function visiblePlaceFeeds(bounds, feeds = placeFeedRegistry()) {
  if (!bounds) return feeds
  const contains = typeof bounds.contains === 'function'
    ? (feed) => bounds.contains([feed.lat, feed.lon])
    : (feed) => feed.lat >= bounds.south && feed.lat <= bounds.north && feed.lon >= bounds.west && feed.lon <= bounds.east
  return feeds.filter(contains)
}
