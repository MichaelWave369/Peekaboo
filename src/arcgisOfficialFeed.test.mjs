import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildArcgisEnvelopeQuery,
  coordinatesFromFeature,
  dedupeById,
  envelopeFingerprint,
  normalizeEnvelopeBounds,
  parseArcgisFeaturePayload,
} from './arcgisOfficialFeed.js'

const BOUNDS = { west: -94, south: 41, east: -93, north: 42 }

test('normalizes valid envelope bounds and rejects invalid order/ranges', () => {
  assert.deepEqual(normalizeEnvelopeBounds(BOUNDS), BOUNDS)
  assert.equal(normalizeEnvelopeBounds({ west: -93, east: -94, south: 41, north: 42 }), null)
  assert.equal(normalizeEnvelopeBounds({ west: -94, east: -93, south: -91, north: 42 }), null)
})

test('envelope fingerprints are deterministic', () => {
  assert.equal(envelopeFingerprint(BOUNDS), '-94.0000,41.0000,-93.0000,42.0000')
})

test('builds ArcGIS envelope query with bounded record count', () => {
  const url = new URL(buildArcgisEnvelopeQuery({
    endpoint: 'https://example.org/FeatureServer/0/query',
    bounds: BOUNDS,
    outFields: ['FID', 'ImageURL'],
    maxRecords: 123,
  }))
  assert.equal(url.searchParams.get('geometry'), '-94,41,-93,42')
  assert.equal(url.searchParams.get('outFields'), 'FID,ImageURL')
  assert.equal(url.searchParams.get('geometryType'), 'esriGeometryEnvelope')
  assert.equal(url.searchParams.get('resultRecordCount'), '123')
  assert.equal(url.searchParams.get('f'), 'json')
})

test('ArcGIS feature payload surfaces source errors and transfer-limit flag', () => {
  assert.deepEqual(parseArcgisFeaturePayload({ features: [{ attributes: { id: 1 } }], exceededTransferLimit: true }), {
    features: [{ attributes: { id: 1 } }],
    truncated: true,
  })
  assert.throws(() => parseArcgisFeaturePayload({ error: { message: 'Nope', details: ['bad query'] } }), /Nope bad query/)
  assert.throws(() => parseArcgisFeaturePayload({ hello: 'world' }, { sourceLabel: 'Iowa DOT' }), /Iowa DOT response did not contain a feature array/)
})

test('coordinate extraction accepts geometry or attribute coordinates and rejects invalid values', () => {
  assert.deepEqual(coordinatesFromFeature({ geometry: { x: -93.6, y: 41.6 } }), { lat: 41.6, lon: -93.6 })
  assert.deepEqual(coordinatesFromFeature({ attributes: { latitude: 41.5, longitude: -93.5 } }), { lat: 41.5, lon: -93.5 })
  assert.equal(coordinatesFromFeature({ geometry: { x: 400, y: 41 } }), null)
})

test('dedupeById preserves first occurrence and drops missing IDs', () => {
  const items = [{ id: 'a', value: 1 }, { id: 'a', value: 2 }, { id: 'b', value: 3 }, { value: 4 }]
  assert.deepEqual(dedupeById(items), [{ id: 'a', value: 1 }, { id: 'b', value: 3 }])
})
