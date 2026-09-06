import { safePublicCamUrl } from './publicCam.js'

export const PLACE_FEED_STATUS = {
  'official-viewer': 'OFFICIAL VIEWER',
  'official-live': 'OFFICIAL LIVE',
  'public-stream': 'PUBLIC STREAM',
  'public-viewer': 'PUBLIC VIEWER',
}

export const PLACE_PUBLISHER_CLASS = {
  'government-official': 'GOVERNMENT OFFICIAL',
  'institution-official': 'INSTITUTION OFFICIAL',
  'commercial-public': 'PUBLIC COMMERCIAL',
}

export const PLACE_FEEDS = [
  {
    id: 'yellowstone-nps-webcams',
    name: 'Yellowstone National Park Webcams',
    place: 'Yellowstone National Park', region: 'WY / MT / ID', category: 'park', status: 'official-live',
    publisherClass: 'government-official', publisher: 'National Park Service',
    lat: 44.4605, lon: -110.8281,
    url: 'https://www.nps.gov/yell/learn/photosmultimedia/webcams.htm',
    summary: 'Official Yellowstone webcam hub. NPS currently lists ten webcams, including the Old Faithful / Upper Geyser Basin livestream and multiple static entrance/weather views.',
    media: 'mixed', externalOnly: true,
  },
  {
    id: 'grand-canyon-yavapai', name: 'Grand Canyon — Yavapai Point', place: 'Grand Canyon National Park', region: 'AZ', category: 'park', status: 'official-viewer',
    publisherClass: 'government-official', publisher: 'National Park Service', lat: 36.0566, lon: -112.1165,
    url: 'https://www.nps.gov/media/webcam/view.htm?id=6AB2E06A-B28C-A55F-6E7C6519E2AA8F51',
    summary: 'Official NPS air-quality and weather webcam looking northwest from Yavapai Point. NPS says the source image refreshes about every 15 minutes.', media: 'snapshot', externalOnly: true,
  },
  {
    id: 'grand-canyon-south-entrance', name: 'Grand Canyon — South Entrance', place: 'Grand Canyon National Park', region: 'AZ', category: 'park', status: 'official-viewer',
    publisherClass: 'government-official', publisher: 'National Park Service', lat: 35.9711, lon: -112.1242,
    url: 'https://www.nps.gov/media/webcam/view.htm?id=81B467D6-1DD8-B71B-0BE07E579A95DA72',
    summary: 'Official NPS South Entrance webcam used for current arrival and road-condition context. NPS says the view refreshes every minute.', media: 'snapshot', externalOnly: true,
  },
  {
    id: 'yosemite-nps-webcams', name: 'Yosemite National Park Webcams', place: 'Yosemite National Park', region: 'CA', category: 'park', status: 'official-viewer',
    publisherClass: 'government-official', publisher: 'National Park Service', lat: 37.7459, lon: -119.5332,
    url: 'https://www.nps.gov/yose/learn/photosmultimedia/webcams.htm', summary: 'Official NPS Yosemite webcam hub covering high-country, air-quality, ski-area and river-condition views, with some cameras operated by park partners.', media: 'mixed', externalOnly: true,
  },
  {
    id: 'zion-nps-webcam', name: 'Zion — Temples and Towers of the Virgin', place: 'Zion National Park', region: 'UT', category: 'park', status: 'official-viewer',
    publisherClass: 'government-official', publisher: 'National Park Service', lat: 37.2009, lon: -112.9870,
    url: 'https://www.nps.gov/zion/learn/photosmultimedia/webcams.htm', summary: 'Official Zion National Park webcam at park headquarters looking toward the Temples and Towers of the Virgin.', media: 'snapshot', externalOnly: true,
  },
  {
    id: 'mount-rainier-nps-webcams', name: 'Mount Rainier National Park Webcams', place: 'Mount Rainier National Park', region: 'WA', category: 'park', status: 'official-viewer',
    publisherClass: 'government-official', publisher: 'National Park Service', lat: 46.7860, lon: -121.7350,
    url: 'https://www.nps.gov/mora/learn/photosmultimedia/webcams.htm', summary: 'Official NPS Mount Rainier webcam hub with Longmire, Paradise, Sunrise, mountain, parking and air-quality views. Some cameras are seasonal.', media: 'mixed', externalOnly: true,
  },
  {
    id: 'glacier-nps-webcams', name: 'Glacier National Park Webcams', place: 'Glacier National Park', region: 'MT', category: 'park', status: 'official-viewer',
    publisherClass: 'government-official', publisher: 'National Park Service', lat: 48.5280, lon: -113.9950,
    url: 'https://www.nps.gov/glac/learn/photosmultimedia/webcams.htm', summary: 'Official Glacier National Park webcam hub with Lake McDonald, Apgar, Logan Pass, Many Glacier, St. Mary, Two Medicine and night-sky views.', media: 'mixed', externalOnly: true,
  },
  {
    id: 'great-smokies-nps-webcams', name: 'Great Smoky Mountains Webcams', place: 'Great Smoky Mountains National Park', region: 'TN / NC', category: 'park', status: 'official-viewer',
    publisherClass: 'government-official', publisher: 'National Park Service', lat: 35.5629, lon: -83.4985,
    url: 'https://www.nps.gov/grsm/learn/photosmultimedia/webcams.htm', summary: 'Official NPS Great Smoky Mountains webcam hub. NPS describes the current digital views as updating approximately every 15 minutes.', media: 'snapshot', externalOnly: true,
  },
  {
    id: 'acadia-nps-webcams', name: 'Acadia National Park Webcams', place: 'Acadia National Park', region: 'ME', category: 'park', status: 'official-viewer',
    publisherClass: 'government-official', publisher: 'National Park Service', lat: 44.3207, lon: -68.2538,
    url: 'https://www.nps.gov/acad/learn/photosmultimedia/webcams.htm', summary: 'Official NPS Acadia webcam page with Jordan Pond and air-quality views plus partner-hosted regional cameras.', media: 'mixed', externalOnly: true,
  },
  {
    id: 'hawaii-volcanoes-nps-webcams', name: 'Hawaiʻi Volcanoes — Kīlauea / Mauna Loa Webcams', place: 'Hawaiʻi Volcanoes National Park', region: 'HI', category: 'park', status: 'official-live',
    publisherClass: 'government-official', publisher: 'National Park Service / USGS Hawaiian Volcano Observatory', lat: 19.4194, lon: -155.2885,
    url: 'https://www.nps.gov/havo/learn/photosmultimedia/webcams.htm',
    summary: 'Official Hawaiʻi Volcanoes webcam hub using USGS Hawaiian Volcano Observatory cameras. NPS says the webcams operate 24/7, including visible-light and thermal views, while weather, darkness and equipment outages can affect visibility.',
    media: 'mixed', externalOnly: true,
  },

  {
    id: 'fws-blackwater-wildlife-cams', name: 'Blackwater NWR — Eagle + Osprey Cams', place: 'Blackwater National Wildlife Refuge', region: 'MD', category: 'wildlife', status: 'official-live',
    publisherClass: 'government-official', publisher: 'U.S. Fish & Wildlife Service', lat: 38.4454, lon: -76.0913,
    url: 'https://www.fws.gov/story/wildlife-webcams',
    summary: 'USFWS lists live eagle and osprey cameras at Blackwater National Wildlife Refuge. Wildlife cameras may be seasonal or weather-dependent.',
    media: 'live-video', externalOnly: true,
  },
  {
    id: 'fws-seal-island-puffin-cam', name: 'Seal Island NWR — Puffin Cam', place: 'Seal Island National Wildlife Refuge', region: 'ME', category: 'wildlife', status: 'official-live',
    publisherClass: 'government-official', publisher: 'U.S. Fish & Wildlife Service', lat: 43.8900, lon: -68.7400,
    url: 'https://www.fws.gov/story/wildlife-webcams',
    summary: 'USFWS lists a puffin camera for Seal Island National Wildlife Refuge. Webcam availability can be seasonal and weather-dependent.',
    media: 'live-video', externalOnly: true,
  },
  {
    id: 'fws-hopper-mountain-condor-cam', name: 'Hopper Mountain NWR — Condor Cam', place: 'Hopper Mountain National Wildlife Refuge', region: 'CA', category: 'wildlife', status: 'official-live',
    publisherClass: 'government-official', publisher: 'U.S. Fish & Wildlife Service', lat: 34.4600, lon: -118.7900,
    url: 'https://www.fws.gov/story/wildlife-webcams',
    summary: 'USFWS lists a California condor camera associated with Hopper Mountain National Wildlife Refuge. The webcam provides remote public viewing of sensitive condor-recovery habitat.',
    media: 'live-video', externalOnly: true,
  },

  {
    id: 'faa-homer-weathercams', name: 'FAA WeatherCams — Homer', place: 'Homer', region: 'AK', category: 'aviation', status: 'official-viewer',
    publisherClass: 'government-official', publisher: 'Federal Aviation Administration', lat: 59.647587, lon: -151.52881,
    url: 'https://weathercams.faa.gov/cameras/state/AK/cameraSite/100/details/pdfs',
    summary: 'Official FAA Weather Camera site for Homer, Alaska. FAA weather cameras provide near-real-time visual weather information and typically update imagery about every 10 minutes.', media: 'multi-camera', externalOnly: true,
  },
  {
    id: 'faa-fairbanks-weathercams', name: 'FAA WeatherCams — Fairbanks International', place: 'Fairbanks', region: 'AK', category: 'aviation', status: 'official-viewer',
    publisherClass: 'government-official', publisher: 'Federal Aviation Administration', lat: 64.81089, lon: -147.84857,
    url: 'https://weathercams.faa.gov/cameras/state/AK/cameraSite/1085/details/pdfs',
    summary: 'Official FAA Weather Camera site for Fairbanks International Airport. FAA WeatherCams combine multiple directional views with aviation weather context.', media: 'multi-camera', externalOnly: true,
  },
  {
    id: 'faa-kapalua-weathercams', name: 'FAA WeatherCams — Kapalua', place: 'Kapalua', region: 'HI', category: 'aviation', status: 'official-viewer',
    publisherClass: 'government-official', publisher: 'Federal Aviation Administration', lat: 20.9630, lon: -156.6747,
    url: 'https://weathercams.faa.gov/cameras/state/HI/cameraSite/589/details/pdfs',
    summary: 'Official FAA Weather Camera site for Kapalua, Hawaiʻi, with multiple directional visual-weather views and associated aviation-weather context.', media: 'multi-camera', externalOnly: true,
  },
  {
    id: 'faa-hawaii-weathercams-directory', name: 'FAA WeatherCams — Hawaiʻi Network', place: 'Hawaiʻi', region: 'HI', category: 'aviation', status: 'official-viewer',
    publisherClass: 'government-official', publisher: 'Federal Aviation Administration', lat: 20.7000, lon: -157.2000,
    url: 'https://weathercams.faa.gov/cameras/state/HI',
    summary: 'Official FAA Hawaiʻi weather-camera directory with public aviation-weather views across the islands.', media: 'camera-directory', externalOnly: true,
  },

  {
    id: 'smithsonian-national-zoo-cams', name: 'Smithsonian National Zoo — Animal Cams', place: 'Washington, DC', region: 'DC', category: 'institution', status: 'official-live',
    publisherClass: 'institution-official', publisher: "Smithsonian's National Zoo and Conservation Biology Institute", lat: 38.9296, lon: -77.0498,
    url: 'https://nationalzoo.si.edu/webcams',
    summary: 'Institution-published live animal cams for giant pandas, elephants, lions, black-footed ferrets and naked mole-rats. Availability follows Smithsonian operating conditions and source policy.',
    media: 'live-video', externalOnly: true,
  },
  {
    id: 'monterey-bay-aquarium-live-cams', name: 'Monterey Bay Aquarium — Live Cams', place: 'Monterey', region: 'CA', category: 'institution', status: 'official-live',
    publisherClass: 'institution-official', publisher: 'Monterey Bay Aquarium', lat: 36.6180, lon: -121.9010,
    url: 'https://www.montereybayaquarium.org/cams-videos/live-cams',
    summary: 'Aquarium-published live cams including sea otters, jellies, kelp forest, aviary, sharks, open sea and Monterey Bay views. Several exhibit cams publish daytime live hours and may show prerecorded footage off-hours.',
    media: 'mixed', externalOnly: true,
  },
  {
    id: 'san-diego-zoo-live-cams', name: 'San Diego Zoo — Live Cameras', place: 'San Diego', region: 'CA', category: 'institution', status: 'official-live',
    publisherClass: 'institution-official', publisher: 'San Diego Zoo Wildlife Alliance', lat: 32.7353, lon: -117.1490,
    url: 'https://zoo.sandiegozoo.org/live-cameras',
    summary: 'Zoo-published live wildlife cameras including giant pandas, koalas, baboons, polar bears, penguins, hippos and apes. Animals may be indoors or outside the camera frame.',
    media: 'live-video', externalOnly: true,
  },
  {
    id: 'san-diego-safari-park-live-cams', name: 'San Diego Zoo Safari Park — Live Cameras', place: 'Escondido / San Diego Zoo Safari Park', region: 'CA', category: 'institution', status: 'official-live',
    publisherClass: 'institution-official', publisher: 'San Diego Zoo Wildlife Alliance', lat: 33.0975, lon: -116.9958,
    url: 'https://zoo.sandiegozoo.org/live-cameras',
    summary: 'Safari Park live-camera collection published by San Diego Zoo Wildlife Alliance, including tigers, elephants, platypuses, giraffes, burrowing owls and other wildlife views.',
    media: 'live-video', externalOnly: true,
  },

  {
    id: 'noaa-glerl-south-haven', name: 'NOAA Great Lakes — South Haven', place: 'South Haven', region: 'MI', category: 'great-lakes', status: 'official-viewer',
    publisherClass: 'government-official', publisher: 'NOAA Great Lakes Environmental Research Laboratory', lat: 42.4014, lon: -86.2889,
    url: 'https://glerl.noaa.gov/metdata/shv/',
    summary: 'Official NOAA/GLERL real-time meteorological station and webcam page for South Haven. GLERL describes webcam images as updating about every 30 minutes on the station page.',
    media: 'snapshot-series', externalOnly: true,
  },
  {
    id: 'noaa-glerl-thunder-bay-island', name: 'NOAA Great Lakes — Thunder Bay Island', place: 'Thunder Bay Island', region: 'MI', category: 'great-lakes', status: 'official-viewer',
    publisherClass: 'government-official', publisher: 'NOAA Great Lakes Environmental Research Laboratory', lat: 45.0347, lon: -83.1942,
    url: 'https://glerl.noaa.gov/metdata/tbi/',
    summary: 'Official NOAA/GLERL meteorological and webcam station on Thunder Bay Island. The station page publishes multiple recent webcam views and reports an hourly image cadence.',
    media: 'snapshot-series', externalOnly: true,
  },
  {
    id: 'noaa-glerl-alpena', name: 'NOAA Great Lakes — Alpena', place: 'Alpena', region: 'MI', category: 'great-lakes', status: 'official-viewer',
    publisherClass: 'government-official', publisher: 'NOAA Great Lakes Environmental Research Laboratory', lat: 45.0597, lon: -83.4236,
    url: 'https://www.glerl.noaa.gov/metdata/apn/',
    summary: 'Official NOAA/GLERL Alpena meteorological and webcam station, operated in collaboration with Thunder Bay National Marine Sanctuary.',
    media: 'snapshot-series', externalOnly: true,
  },
  {
    id: 'noaa-glerl-muskegon-pier-light', name: 'NOAA Great Lakes — Muskegon Pier Light', place: 'Muskegon', region: 'MI', category: 'great-lakes', status: 'official-viewer',
    publisherClass: 'government-official', publisher: 'NOAA Great Lakes Environmental Research Laboratory', lat: 43.2267, lon: -86.3414,
    url: 'https://glerl.noaa.gov/metdata/mkglight/',
    summary: 'Official NOAA/GLERL Muskegon Pier Light meteorological and webcam station page with current environmental observations and public imagery.',
    media: 'snapshot-series', externalOnly: true,
  },
  {
    id: 'noaa-glerl-toledo-channel-marker', name: 'NOAA Great Lakes — Toledo Channel Marker #2', place: 'Western Lake Erie / Toledo', region: 'OH', category: 'great-lakes', status: 'official-viewer',
    publisherClass: 'government-official', publisher: 'NOAA Great Lakes Environmental Research Laboratory', lat: 41.82555, lon: -83.19362,
    url: 'https://glerl.noaa.gov/res/recon/station-cmt.html',
    summary: 'Official NOAA/GLERL ReCON station at Toledo Channel Marker #2 with current environmental observations and browsable webcam photos.',
    media: 'snapshot-series', externalOnly: true,
  },

  {
    id: 'las-vegas-rtc-traffic', name: 'Las Vegas — RTC / NDOT Traffic Cameras', place: 'Las Vegas', region: 'NV', category: 'city', status: 'official-live',
    publisherClass: 'government-official', publisher: 'Regional Transportation Commission of Southern Nevada / NDOT', lat: 36.1147, lon: -115.1728,
    url: 'https://www.rtcsnv.com/traffic-cams/watch-live/', summary: 'Official Southern Nevada traffic-camera gateway. RTC directs users to Nevada 511 for live traffic camera feeds on major roadways.', media: 'live-video', externalOnly: true,
  },
  {
    id: 'las-vegas-earthcam', name: 'Las Vegas — Public Tourism Cam', place: 'Las Vegas', region: 'NV', category: 'tourism', status: 'public-stream',
    publisherClass: 'commercial-public', publisher: 'EarthCam', lat: 36.0908, lon: -115.1720,
    url: 'https://www.earthcam.com/usa/nevada/lasvegas/', summary: 'Public EarthCam tourism stream for the Las Vegas area. This is not an NDOT/RTC government camera and is kept in a separate public-commercial class.', media: 'live-video', externalOnly: true,
  },
  {
    id: 'atlantic-city-511nj', name: 'Atlantic City — NJ511 Traffic Cameras', place: 'Atlantic City', region: 'NJ', category: 'city', status: 'official-live',
    publisherClass: 'government-official', publisher: 'New Jersey Department of Transportation / 511NJ', lat: 39.3643, lon: -74.4229,
    url: 'https://www.511nj.org/', summary: 'Official New Jersey traveler-information system with live traffic camera access. NJDOT describes camera images as refreshed approximately every 30 seconds.', media: 'traffic-camera-viewer', externalOnly: true,
  },
  {
    id: 'atlantic-city-boardwalk-live', name: 'Atlantic City Boardwalk Live', place: 'Atlantic City', region: 'NJ', category: 'tourism', status: 'public-stream',
    publisherClass: 'commercial-public', publisher: 'APM Digital / YouTube', lat: 39.3568, lon: -74.4297,
    url: 'https://www.youtube.com/watch?v=GDU59FNpYAM', summary: 'Public livestream of the Atlantic City Boardwalk area. This is a third-party public stream, not an official City of Atlantic City or NJDOT camera.', media: 'live-video', externalOnly: true,
  },
  {
    id: 'key-west-harbor-ptztv', name: 'Key West Harbor Webcam', place: 'Key West', region: 'FL', category: 'tourism', status: 'public-stream',
    publisherClass: 'commercial-public', publisher: 'PTZtv / Historic Tours of America', lat: 24.5593, lon: -81.8074,
    url: 'https://www.keywestharborwebcam.com/', summary: 'Public Key West Harbor livestream with Mallory Square and harbor views. The operator explicitly states it is not affiliated with or officially endorsed by the City of Key West.', media: 'live-video', externalOnly: true,
  },
  {
    id: 'anaheim-disneyland-area-earthcam', name: 'Anaheim / Disneyland Resort Area Cam', place: 'Anaheim', region: 'CA', category: 'tourism', status: 'public-stream',
    publisherClass: 'commercial-public', publisher: 'EarthCam / Hilton Anaheim', lat: 33.8002, lon: -117.9180,
    url: 'https://www.earthcam.com/usa/california/anaheim/', summary: 'Public Anaheim tourism view that includes the Disneyland Resort area skyline. This is not an official Disneyland or Disney-operated camera.', media: 'live-video', externalOnly: true,
  },
]

export function normalizedPlaceFeed(feed = {}) {
  const lat = Number(feed.lat)
  const lon = Number(feed.lon)
  const url = safePublicCamUrl(feed.url)
  if (!feed.id || !feed.name || !Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180 || !url) return null
  if (!PLACE_FEED_STATUS[feed.status]) return null
  if (!PLACE_PUBLISHER_CLASS[feed.publisherClass]) return null
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
