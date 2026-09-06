import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAJOR_METRO_COVERAGE,
  buildCdotQuery,
  buildIllinoisQuery,
  normalizeCdotCamera,
  normalizeIllinoisCamera,
  parseCdotPayload,
  parseIllinoisPayload,
} from './metroFeeds.js'

const BOUNDS = { west: -105.2, south: 39.5, east: -104.7, north: 40.0 }

function cdotFeature(overrides = {}) {
  return {
    attributes: {
      objectid: 7,
      cameraid: 700,
      camera_name: 'I-25 Test Cam',
      description: 'Denver traffic camera',
      url: 'https://example.org/live/test.m3u8',
      latitude: 39.74,
      longitude: -104.99,
      status: 'Enabled',
      isweatherstation: 0,
      roadname: 'I-25',
      ...overrides,
    },
    geometry: { x: -104.99, y: 39.74 },
  }
}

function illinoisFeature(overrides = {}) {
  return {
    attributes: {
      OBJECTID: 9,
      CameraLocation: 'I-90 at Test',
      CameraDirection: 'East',
      x: -87.65,
      y: 41.88,
      SnapShot: 'https://example.org/chicago/current.jpg',
      ImgPath: 'https://example.org/chicago/',
      AgeInMinutes: '4',
      TooOld: 'false',
      ...overrides,
    },
    geometry: { x: -87.65, y: 41.88 },
  }
}

test('CDOT query is viewport bounded and requests camera media fields', () => {
  const url = new URL(buildCdotQuery(BOUNDS))
  assert.equal(url.searchParams.get('geometry'), '-105.2,39.5,-104.7,40')
  assert.match(url.searchParams.get('outFields'), /camera_name/)
  assert.match(url.searchParams.get('outFields'), /url/)
  assert.equal(url.searchParams.get('resultRecordCount'), '2000')
})

test('Illinois query is viewport bounded and requests snapshot/age fields', () => {
  const url = new URL(buildIllinoisQuery({ west: -88, south: 41.6, east: -87.4, north: 42.1 }))
  assert.equal(url.searchParams.get('geometry'), '-88,41.6,-87.4,42.1')
  assert.match(url.searchParams.get('outFields'), /SnapShot/)
  assert.match(url.searchParams.get('outFields'), /AgeInMinutes/)
})

test('CDOT normalization preserves source status and explicit media kind', () => {
  const cam = normalizeCdotCamera(cdotFeature())
  assert.equal(cam.id, 'official/cdot-streaming/7')
  assert.equal(cam.sourceClass, 'official-public-feed')
  assert.equal(cam.mediaKind, 'hls')
  assert.equal(cam.hasVideo, true)
  assert.equal(cam.inlineEligible, true)
  assert.equal(cam.status.key, 'active')
})

test('CDOT refuses unsafe/private URLs and missing coordinates', () => {
  assert.equal(normalizeCdotCamera(cdotFeature({ url: 'http://127.0.0.1/cam.jpg' })), null)
  assert.equal(normalizeCdotCamera({ attributes: { objectid: 1, url: 'https://example.org/a.jpg' }, geometry: {} }), null)
})

test('Illinois normalization uses explicit snapshot and source age without inventing video', () => {
  const cam = normalizeIllinoisCamera(illinoisFeature())
  assert.equal(cam.id, 'official/illinois-dot-cctv/9')
  assert.equal(cam.hasImage, true)
  assert.equal(cam.hasVideo, false)
  assert.equal(cam.inlineEligible, true)
  assert.equal(cam.ageInMinutes, 4)
  assert.equal(cam.tooOld, false)
})

test('Illinois refuses records without safe published media', () => {
  assert.equal(normalizeIllinoisCamera(illinoisFeature({ SnapShot: 'javascript:alert(1)', ImgPath: null })), null)
})

test('ArcGIS truncation survives source-specific parsing', () => {
  assert.equal(parseCdotPayload({ features: [cdotFeature()], exceededTransferLimit: true }).truncated, true)
  assert.equal(parseIllinoisPayload({ features: [illinoisFeature()], exceededTransferLimit: true }).truncated, true)
})

test('source parsers deterministically dedupe repeated camera IDs', () => {
  assert.equal(parseCdotPayload({ features: [cdotFeature(), cdotFeature()] }).items.length, 1)
  assert.equal(parseIllinoisPayload({ features: [illinoisFeature(), illinoisFeature()] }).items.length, 1)
})

test('major metro registry explicitly distinguishes integrated and constrained sources', () => {
  const byCity = Object.fromEntries(MAJOR_METRO_COVERAGE.map((item) => [item.city, item]))
  assert.equal(byCity['Los Angeles'].status, 'in-app')
  assert.equal(byCity.Denver.status, 'in-app')
  assert.equal(byCity.Chicago.status, 'in-app')
  assert.equal(byCity['New York City'].status, 'key-required')
  assert.equal(byCity.Tucson.status, 'key-required')
  assert.equal(byCity.Miami.status, 'official-viewer')
  assert.equal(byCity.Detroit.status, 'official-viewer')
  assert.equal(byCity.Austin.status, 'official-viewer')
})
