import test from 'node:test'
import assert from 'node:assert/strict'
import { PLACE_FEEDS, normalizedPlaceFeed, placeFeedRegistry, visiblePlaceFeeds } from './placeFeeds.js'

test('curated place feed registry has unique valid records', () => {
  const feeds = placeFeedRegistry()
  assert.equal(feeds.length, PLACE_FEEDS.length)
  assert.equal(new Set(feeds.map((feed) => feed.id)).size, feeds.length)
  feeds.forEach((feed) => {
    assert.equal(typeof feed.url, 'string')
    assert.match(feed.url, /^https?:\/\//)
    assert.ok(Number.isFinite(feed.lat))
    assert.ok(Number.isFinite(feed.lon))
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
  ]
  ids.forEach((id) => assert.equal(feeds.find((item) => item.id === id)?.publisherClass, 'government-official', id))
})

test('invalid place feed records fail closed', () => {
  assert.equal(normalizedPlaceFeed({ id: 'bad', name: 'Bad', lat: 500, lon: 0, url: 'https://example.org', status: 'public-stream', publisherClass: 'commercial-public' }), null)
  assert.equal(normalizedPlaceFeed({ id: 'bad2', name: 'Bad', lat: 10, lon: 10, url: 'javascript:alert(1)', status: 'public-stream', publisherClass: 'commercial-public' }), null)
  assert.equal(normalizedPlaceFeed({ id: 'bad3', name: 'Bad', lat: 10, lon: 10, url: 'https://example.org', status: 'made-up', publisherClass: 'commercial-public' }), null)
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
  const westernParks = feeds.filter((feed) => feed.category === 'park' && feed.publisher === 'National Park Service')
  assert.ok(westernParks.length >= 8)
  assert.ok(westernParks.every((feed) => feed.publisherClass === 'government-official'))
})
