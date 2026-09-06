import test from 'node:test'
import assert from 'node:assert/strict'
import {
  NDBC_BUOYCAMS,
  ndbcImageUrl,
  ndbcRegistry,
  normalizeNdbcStation,
  visibleNdbcStations,
} from './ndbcFeeds.js'

test('normalizes NOAA/NDBC BuoyCAM stations into a separate official-source class', () => {
  const station = normalizeNdbcStation({ station: '44013', name: 'Boston', detail: '16 NM east', lat: 42.346, lon: -70.651 })
  assert.equal(station.id, 'official/ndbc-buoycam/44013')
  assert.equal(station.sourceClass, 'government-official')
  assert.equal(station.sourceKey, 'noaa-ndbc-buoycam')
  assert.equal(station.freshnessPolicy, 'ndbc-under-16-hours-or-error')
  assert.match(station.imageUrl, /buoycam\.php\?station=44013$/)
})

test('rejects invalid stations, coordinates, and nameless entries', () => {
  assert.equal(normalizeNdbcStation({ station: '../bad', name: 'Nope', lat: 1, lon: 1 }), null)
  assert.equal(normalizeNdbcStation({ station: '41009', name: '', lat: 28.5, lon: -80.1 }), null)
  assert.equal(normalizeNdbcStation({ station: '41009', name: 'Canaveral', lat: 95, lon: -80.1 }), null)
})

test('registry is deterministic and first-station-wins on duplicate IDs', () => {
  const entries = [
    { station: '41009', name: 'First', lat: 28.5, lon: -80.1 },
    { station: '41009', name: 'Second', lat: 29, lon: -81 },
  ]
  const registry = ndbcRegistry(entries)
  assert.equal(registry.length, 1)
  assert.equal(registry[0].name, 'First')
})

test('current-image URL is station-bounded and supports cache-busting refresh tokens', () => {
  assert.equal(ndbcImageUrl('41009'), 'https://www.ndbc.noaa.gov/buoycam.php?station=41009')
  assert.equal(ndbcImageUrl('41009', 123), 'https://www.ndbc.noaa.gov/buoycam.php?station=41009&peekaboo_frame=123')
  assert.equal(ndbcImageUrl('bad/thing'), null)
})

test('viewport filtering only returns BuoyCAMs inside the current map bounds', () => {
  const visible = visibleNdbcStations({ west: -81, south: 27, east: -79, north: 30 }, ndbcRegistry())
  assert.deepEqual(visible.map((entry) => entry.station), ['41009'])
})

test('seed registry contains multiple current NOAA Atlantic / coastal BuoyCAM stations', () => {
  const registry = ndbcRegistry()
  assert.equal(registry.length, NDBC_BUOYCAMS.length)
  assert.ok(registry.some((entry) => entry.station === '44013'))
  assert.ok(registry.some((entry) => entry.station === '41025'))
  assert.ok(registry.some((entry) => entry.station === '41043'))
})
