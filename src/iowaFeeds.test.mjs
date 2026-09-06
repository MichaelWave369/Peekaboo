import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildIowaCameraQuery,
  iowaBoundsFingerprint,
  normalizeIowaCamera,
  parseIowaCameraPayload,
} from './iowaFeeds.js'

const BOUNDS = { west: -94, south: 41, east: -93, north: 42 }

function feature(overrides = {}) {
  return {
    attributes: {
      FID: 7,
      device_id: 7007,
      Desc_: 'I-80 at Test Interchange',
      Route: 'I-80',
      ImageName: 'I-80 Test Cam',
      ImageURL: 'https://images.iowadot.gov/test/current.jpg',
      VideoURL: 'https://video.iowadot.gov/test/playlist.m3u8',
      ORG: 'Iowa DOT',
      latitude: 41.61,
      longitude: -93.61,
      Type: 'CCTV',
      REGION: 'Central',
      RECORDED: 'Y',
      COMMON_ID: 'CAM-7',
      FUNCTION: 'Traffic monitoring',
      ...overrides,
    },
    geometry: { x: -93.61, y: 41.61 },
  }
}

test('builds a viewport-bounded Iowa DOT camera query', () => {
  const url = new URL(buildIowaCameraQuery(BOUNDS))
  assert.equal(url.hostname, 'services.arcgis.com')
  assert.equal(url.searchParams.get('geometry'), '-94,41,-93,42')
  assert.equal(url.searchParams.get('resultRecordCount'), '2000')
  assert.match(url.searchParams.get('outFields'), /ImageURL/)
  assert.match(url.searchParams.get('outFields'), /VideoURL/)
})

test('Iowa viewport fingerprint is deterministic', () => {
  assert.equal(iowaBoundsFingerprint(BOUNDS), '-94.0000,41.0000,-93.0000,42.0000')
})

test('normalizes Iowa DOT image and HLS evidence into official source lane', () => {
  const cam = normalizeIowaCamera(feature())
  assert.equal(cam.id, 'official/iowa-dot-cctv/7')
  assert.equal(cam.sourceClass, 'official-public-feed')
  assert.equal(cam.sourceKey, 'iowa-dot-cctv')
  assert.equal(cam.hasImage, true)
  assert.equal(cam.hasVideo, true)
  assert.equal(cam.videoKind, 'hls')
  assert.equal(cam.inlineImageEligible, true)
  assert.equal(cam.inlineVideoEligible, true)
  assert.equal(cam.recorded, true)
  assert.equal(cam.route, 'I-80')
})

test('recorded field is a source claim and unknown values remain unknown', () => {
  assert.equal(normalizeIowaCamera(feature({ RECORDED: 'N' })).recorded, false)
  assert.equal(normalizeIowaCamera(feature({ RECORDED: 'maybe' })).recorded, null)
})

test('unsafe/local URLs are rejected and records without public media disappear', () => {
  assert.equal(normalizeIowaCamera(feature({ ImageURL: 'http://127.0.0.1/test.jpg', VideoURL: null })), null)
  assert.equal(normalizeIowaCamera(feature({ ImageURL: null, VideoURL: null })), null)
})

test('HTTP media may remain an external published link but is never inline eligible', () => {
  const cam = normalizeIowaCamera(feature({
    ImageURL: 'http://example.org/cam.jpg',
    VideoURL: 'http://example.org/live.m3u8',
  }))
  assert.equal(cam.hasImage, true)
  assert.equal(cam.hasVideo, true)
  assert.equal(cam.inlineImageEligible, false)
  assert.equal(cam.inlineVideoEligible, false)
})

test('payload parser deduplicates source IDs and exposes transfer truncation', () => {
  const parsed = parseIowaCameraPayload({
    features: [feature(), feature(), feature({ FID: 8, ImageName: 'Second Cam' })],
    exceededTransferLimit: true,
  })
  assert.equal(parsed.items.length, 2)
  assert.equal(parsed.truncated, true)
})

test('ArcGIS errors propagate instead of becoming empty camera maps', () => {
  assert.throws(
    () => parseIowaCameraPayload({ error: { message: 'Invalid query', details: ['No geometry'] } }),
    /Invalid query No geometry/,
  )
})
