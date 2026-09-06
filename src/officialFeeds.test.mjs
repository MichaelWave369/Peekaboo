import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeAshcamWebcam,
  officialFeedFreshness,
  parseAshcamPayload,
} from './officialFeeds.js'

const NOW = Date.UTC(2026, 8, 5, 20, 0, 0)

function sample(overrides = {}) {
  return {
    webcamCode: 'rainier-test',
    webcamName: 'Rainier Test Cam',
    latitude: 46.78,
    longitude: -121.73,
    currentImageUrl: 'https://volcview.wr.usgs.gov/ashcam-api/images/webcams/rainier-test/current.jpeg',
    currentMediumImageUrl: 'https://volcview.wr.usgs.gov/ashcam-api/images/webcams/rainier-test/current-medium.jpeg',
    currentThumbImageUrl: 'https://volcview.wr.usgs.gov/ashcam-api/images/webcams/rainier-test/current-thumb.jpeg',
    lastImageTimestamp: Math.floor((NOW - 20 * 60 * 1000) / 1000),
    vnum: '321030',
    vName: 'Mount Rainier',
    ...overrides,
  }
}

test('normalizes a usable Ashcam camera with explicit official-source provenance', () => {
  const cam = normalizeAshcamWebcam(sample(), NOW)
  assert.equal(cam.id, 'official/usgs-ashcam/rainier-test')
  assert.equal(cam.sourceClass, 'official-public-feed')
  assert.equal(cam.sourceKey, 'usgs-ashcam')
  assert.equal(cam.currentImageUrl.startsWith('https://volcview.wr.usgs.gov/'), true)
  assert.equal(cam.freshness.key, 'fresh')
  assert.equal(cam.volcanoName, 'Mount Rainier')
})

test('rejects placeholder coordinates and records without safe HTTPS current images', () => {
  assert.equal(normalizeAshcamWebcam(sample({ latitude: 0, longitude: 0 }), NOW), null)
  assert.equal(normalizeAshcamWebcam(sample({ currentImageUrl: null }), NOW), null)
  assert.equal(normalizeAshcamWebcam(sample({ currentImageUrl: 'http://example.org/current.jpg' }), NOW), null)
  assert.equal(normalizeAshcamWebcam(sample({ currentImageUrl: 'http://127.0.0.1/current.jpg' }), NOW), null)
})

test('freshness labels are descriptive and bounded', () => {
  assert.equal(officialFeedFreshness(NOW - 30 * 60 * 1000, NOW).key, 'fresh')
  assert.equal(officialFeedFreshness(NOW - 6 * 60 * 60 * 1000, NOW).key, 'recent')
  assert.equal(officialFeedFreshness(NOW - 3 * 24 * 60 * 60 * 1000, NOW).key, 'aging')
  assert.equal(officialFeedFreshness(NOW - 10 * 24 * 60 * 60 * 1000, NOW).key, 'stale')
  assert.equal(officialFeedFreshness(null, NOW).key, 'unknown')
})

test('payload parser accepts wrapped or raw arrays and deduplicates camera codes', () => {
  const a = sample()
  const b = sample({ webcamCode: 'rainier-two', webcamName: 'Second Cam' })
  assert.equal(parseAshcamPayload({ webcams: [a, a, b] }, NOW).length, 2)
  assert.equal(parseAshcamPayload([a, b], NOW).length, 2)
})

test('external provider URL is optional and does not affect current-image evidence', () => {
  const cam = normalizeAshcamWebcam(sample({ externalUrl: 'https://www.nps.gov/example' }), NOW)
  assert.equal(cam.externalUrl, 'https://www.nps.gov/example')
  assert.equal(cam.sourceLabel, 'USGS Volcano Hazards Program / Ashcam')
})
