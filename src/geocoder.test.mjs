import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGeocoderRequestUrl,
  normalizeGeocoderResult,
  normalizePlaceQuery,
} from './geocoder.js'

test('normalizes place query whitespace', () => {
  assert.equal(normalizePlaceQuery('  123   Main St  '), '123 Main St')
})

test('normalizes a valid Nominatim result and bounding box', () => {
  const result = normalizeGeocoderResult({
    osm_type: 'node',
    osm_id: 42,
    lat: '38.3326',
    lon: '-82.9485',
    display_name: 'Grayson, Carter County, Kentucky, United States',
    type: 'town',
    boundingbox: ['38.28', '38.39', '-83.04', '-82.87'],
  })
  assert.equal(result.id, 'node:42')
  assert.equal(result.lat, 38.3326)
  assert.equal(result.lon, -82.9485)
  assert.deepEqual(result.bounds, { south: 38.28, north: 38.39, west: -83.04, east: -82.87 })
})

test('rejects invalid coordinates', () => {
  assert.equal(normalizeGeocoderResult({ lat: '999', lon: '0' }), null)
  assert.equal(normalizeGeocoderResult({ lat: 'abc', lon: '-82' }), null)
})

test('builds explicit-submit search request with bounded result count', () => {
  const url = new URL(buildGeocoderRequestUrl('Grayson, KY'))
  assert.equal(url.hostname, 'nominatim.openstreetmap.org')
  assert.equal(url.searchParams.get('q'), 'Grayson, KY')
  assert.equal(url.searchParams.get('format'), 'jsonv2')
  assert.equal(url.searchParams.get('limit'), '5')
  assert.equal(url.searchParams.get('addressdetails'), '0')
})
