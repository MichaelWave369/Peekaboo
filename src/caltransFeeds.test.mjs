import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCaltransQuery,
  caltransBoundsFingerprint,
  caltransServiceStatus,
  normalizeCaltransFeature,
  parseCaltransPayload,
} from './caltransFeeds.js'

const BOUNDS = { west: -122.6, south: 37.6, east: -122.2, north: 37.9 }

function feature(overrides = {}) {
  return {
    attributes: {
      OBJECTID: 42,
      locationName: 'I-80 Test Camera',
      nearbyPlace: 'Oakland',
      longitude: -122.31,
      latitude: 37.81,
      inService: 'true',
      route: 'I-80',
      county: 'Alameda',
      direction: 'East',
      currentImageURL: 'https://cwwp2.dot.ca.gov/data/d4/cctv/image/test.jpg',
      streamingVideoURL: 'https://wzmedia.dot.ca.gov/D4/test/test.stream/playlist.m3u8',
      currentImageUpdateFrequency: '5',
      recordDate: 1788600000000,
      ...overrides,
    },
    geometry: { x: -122.31, y: 37.81 },
  }
}

test('builds a bounded ArcGIS query with explicit output fields and transfer cap', () => {
  const url = new URL(buildCaltransQuery(BOUNDS))
  assert.equal(url.hostname, 'caltrans-gis.dot.ca.gov')
  assert.equal(url.searchParams.get('geometry'), '-122.6,37.6,-122.2,37.9')
  assert.equal(url.searchParams.get('geometryType'), 'esriGeometryEnvelope')
  assert.equal(url.searchParams.get('inSR'), '4326')
  assert.equal(url.searchParams.get('resultRecordCount'), '2000')
  assert.match(url.searchParams.get('outFields'), /streamingVideoURL/)
  assert.match(url.searchParams.get('outFields'), /currentImageURL/)
})

test('viewport fingerprints are deterministic and reject invalid bounds', () => {
  assert.equal(caltransBoundsFingerprint(BOUNDS), '-122.6000,37.6000,-122.2000,37.9000')
  assert.equal(caltransBoundsFingerprint({ west: -122, east: -123, south: 37, north: 38 }), null)
})

test('normalizes official Caltrans snapshot and HLS evidence separately from OSM', () => {
  const cam = normalizeCaltransFeature(feature())
  assert.equal(cam.id, 'official/caltrans-cctv/42')
  assert.equal(cam.sourceClass, 'official-public-feed')
  assert.equal(cam.sourceKey, 'caltrans-cctv')
  assert.equal(cam.hasImage, true)
  assert.equal(cam.hasStream, true)
  assert.equal(cam.streamKind, 'hls')
  assert.equal(cam.inlineImageEligible, true)
  assert.equal(cam.inlineStreamEligible, true)
  assert.equal(cam.service.key, 'in-service')
})

test('http media may remain a published link but is never inline eligible on the HTTPS app', () => {
  const cam = normalizeCaltransFeature(feature({
    currentImageURL: 'http://example.org/cam.jpg',
    streamingVideoURL: 'http://example.org/live.m3u8',
  }))
  assert.equal(cam.hasImage, true)
  assert.equal(cam.hasStream, true)
  assert.equal(cam.inlineImageEligible, false)
  assert.equal(cam.inlineStreamEligible, false)
})

test('unsafe media URLs and camera records with no viewable public URL are rejected', () => {
  assert.equal(normalizeCaltransFeature(feature({ currentImageURL: 'http://127.0.0.1/cam.jpg', streamingVideoURL: null })), null)
  assert.equal(normalizeCaltransFeature(feature({ currentImageURL: null, streamingVideoURL: null })), null)
  assert.equal(normalizeCaltransFeature({ attributes: { OBJECTID: 1, currentImageURL: 'https://example.org/cam.jpg' }, geometry: {} }), null)
})

test('service status mapping is explicit and conservative', () => {
  assert.equal(caltransServiceStatus('true').key, 'in-service')
  assert.equal(caltransServiceStatus('out of service').key, 'out-of-service')
  assert.equal(caltransServiceStatus('sometimes').key, 'unknown')
})

test('payload parser deduplicates object IDs and exposes ArcGIS transfer truncation', () => {
  const duplicate = feature()
  const second = feature({ OBJECTID: 43, locationName: 'Second camera' })
  const parsed = parseCaltransPayload({ features: [duplicate, duplicate, second], exceededTransferLimit: true })
  assert.equal(parsed.items.length, 2)
  assert.equal(parsed.truncated, true)
})

test('ArcGIS service errors are surfaced instead of converted to empty camera results', () => {
  assert.throws(
    () => parseCaltransPayload({ error: { message: 'Invalid query', details: ['Bad geometry'] } }),
    /Invalid query Bad geometry/,
  )
})
