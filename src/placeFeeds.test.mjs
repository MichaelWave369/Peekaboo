import test from 'node:test'
import assert from 'node:assert/strict'
import { PLACE_FEEDS, PLACE_PUBLISHER_CLASS, normalizedPlaceFeed, placeFeedRegistry, visiblePlaceFeeds } from './placeFeeds.js'

test('curated place feed registry has unique valid records', () => {
  const feeds = placeFeedRegistry()
  assert.equal(feeds.length, PLACE_FEEDS.length)
  assert.equal(new Set(feeds.map((feed) => feed.id)).size, feeds.length)
  feeds.forEach((feed) => {
    assert.equal(typeof feed.url, 'string')
    assert.match(feed.url, /^https?:\/\//)
    assert.ok(Number.isFinite(feed.lat))
    assert.ok(Number.isFinite(feed.lon))
    assert.ok(PLACE_PUBLISHER_CLASS[feed.publisherClass])
  })
})

test('Disneyland-area source is explicitly public-commercial rather than Disney official', () => {
  const feed = placeFeedRegistry().find((item) => item.id === 'anaheim-disneyland-area-earthcam')
  assert.equal(feed.publisherClass, 'commercial-public')
  assert.match(feed.summary, /not an official Disneyland or Disney-operated camera/i)
})

test('Key West public stream preserves non-city provenance', () => {
  const feed = placeFeedRegistry().find((item) => item.id === 'key-west-harbor-ptztv')
  assert.equal(feed.publisherClass, 'commercial-public')
  assert.match(feed.summary, /not affiliated with or officially endorsed by the City of Key West/i)
})

test('national park expansion remains government-official', () => {
  const feeds = placeFeedRegistry()
  const ids = [
    'yellowstone-nps-webcams',
    'grand-canyon-yavapai',
    'yosemite-nps-webcams',
    'zion-nps-webcam',
    'mount-rainier-nps-webcams',
    'glacier-nps-webcams',
    'great-smokies-nps-webcams',
    'acadia-nps-webcams',
    'hawaii-volcanoes-nps-webcams',
  ]
  ids.forEach((id) => assert.equal(feeds.find((item) => item.id === id)?.publisherClass, 'government-official', id))
})

test('wildlife shortcut records preserve Fish and Wildlife Service provenance', () => {
  const wildlife = placeFeedRegistry().filter((feed) => feed.category === 'wildlife')
  assert.ok(wildlife.length >= 3)
  assert.ok(wildlife.every((feed) => feed.publisher === 'U.S. Fish & Wildlife Service'))
  assert.ok(wildlife.every((feed) => feed.publisherClass === 'government-official'))
})

test('FAA WeatherCam records remain government-official aviation sources', () => {
  const aviation = placeFeedRegistry().filter((feed) => feed.category === 'aviation')
  assert.ok(aviation.length >= 4)
  assert.ok(aviation.every((feed) => feed.publisher === 'Federal Aviation Administration'))
  assert.ok(aviation.every((feed) => feed.publisherClass === 'government-official'))
  assert.ok(aviation.every((feed) => new URL(feed.url).hostname === 'weathercams.faa.gov'))
})

test('institution-owned camera collections use institution-official rather than government or commercial classes', () => {
  const institutions = placeFeedRegistry().filter((feed) => feed.category === 'institution')
  assert.ok(institutions.length >= 4)
  assert.ok(institutions.every((feed) => feed.publisherClass === 'institution-official'))
  assert.ok(institutions.some((feed) => /Smithsonian/i.test(feed.publisher)))
  assert.ok(institutions.some((feed) => /Monterey Bay Aquarium/i.test(feed.publisher)))
  assert.ok(institutions.filter((feed) => /San Diego Zoo Wildlife Alliance/i.test(feed.publisher)).length >= 2)
})

test('NOAA Great Lakes sources stay government-official and on GLERL domains', () => {
  const greatLakes = placeFeedRegistry().filter((feed) => feed.category === 'great-lakes')
  assert.ok(greatLakes.length >= 5)
  assert.ok(greatLakes.every((feed) => feed.publisherClass === 'government-official'))
  assert.ok(greatLakes.every((feed) => /Great Lakes Environmental Research Laboratory/.test(feed.publisher)))
  assert.ok(greatLakes.every((feed) => /glerl\.noaa\.gov$/.test(new URL(feed.url).hostname)))
})

test('invalid place feed records fail closed including unknown publisher classes', () => {
  assert.equal(normalizedPlaceFeed({ id: 'bad', name: 'Bad', lat: 500, lon: 0, url: 'https://example.org', status: 'public-stream', publisherClass: 'commercial-public' }), null)
  assert.equal(normalizedPlaceFeed({ id: 'bad2', name: 'Bad', lat: 10, lon: 10, url: 'javascript:alert(1)', status: 'public-stream', publisherClass: 'commercial-public' }), null)
  assert.equal(normalizedPlaceFeed({ id: 'bad3', name: 'Bad', lat: 10, lon: 10, url: 'https://example.org', status: 'made-up', publisherClass: 'commercial-public' }), null)
  assert.equal(normalizedPlaceFeed({ id: 'bad4', name: 'Bad', lat: 10, lon: 10, url: 'https://example.org', status: 'official-live', publisherClass: 'official-ish' }), null)
})

test('viewport filtering uses geographic bounds without changing the registry', () => {
  const feeds = placeFeedRegistry()
  const vegas = visiblePlaceFeeds({ west: -116, south: 35.5, east: -114.5, north: 36.5 }, feeds)
  assert.ok(vegas.some((item) => item.id === 'las-vegas-rtc-traffic'))
  assert.ok(vegas.some((item) => item.id === 'las-vegas-earthcam'))
  assert.ok(!vegas.some((item) => item.id === 'yellowstone-nps-webcams'))
  assert.equal(feeds.length, PLACE_FEEDS.length)
})

test('park-heavy views can surface multiple official nature sources without changing source ownership', () => {
  const feeds = placeFeedRegistry()
  const westernParks = feeds.filter((feed) => feed.category === 'park' && feed.publisherClass === 'government-official')
  assert.ok(westernParks.length >= 9)
})

test('Alaska and Hawaii curated weather records stay geographically filterable', () => {
  const feeds = placeFeedRegistry()
  const alaska = visiblePlaceFeeds({ west: -170, south: 50, east: -130, north: 72 }, feeds)
  assert.ok(alaska.some((feed) => feed.id === 'faa-homer-weathercams'))
  assert.ok(alaska.some((feed) => feed.id === 'faa-fairbanks-weathercams'))
  assert.ok(!alaska.some((feed) => feed.id === 'faa-kapalua-weathercams'))

  const hawaii = visiblePlaceFeeds({ west: -161, south: 18, east: -154, north: 23 }, feeds)
  assert.ok(hawaii.some((feed) => feed.id === 'hawaii-volcanoes-nps-webcams'))
  assert.ok(hawaii.some((feed) => feed.id === 'faa-kapalua-weathercams'))
})

test('institution and Great Lakes sources remain geographically filterable', () => {
  const feeds = placeFeedRegistry()
  const monterey = visiblePlaceFeeds({ west: -122.1, south: 36.4, east: -121.7, north: 36.9 }, feeds)
  assert.ok(monterey.some((feed) => feed.id === 'monterey-bay-aquarium-live-cams'))

  const dc = visiblePlaceFeeds({ west: -77.2, south: 38.8, east: -76.9, north: 39.0 }, feeds)
  assert.ok(dc.some((feed) => feed.id === 'smithsonian-national-zoo-cams'))

  const lakeMichigan = visiblePlaceFeeds({ west: -87.2, south: 41.5, east: -82.5, north: 46.0 }, feeds)
  assert.ok(lakeMichigan.some((feed) => feed.id === 'noaa-glerl-south-haven'))
  assert.ok(lakeMichigan.some((feed) => feed.id === 'noaa-glerl-thunder-bay-island'))
})
