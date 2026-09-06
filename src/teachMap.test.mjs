import test from 'node:test'
import assert from 'node:assert/strict'
import {
  LAST_VIEW_KEY,
  ONBOARDING_KEY,
  hashHasExplicitMap,
  markOnboardingSeen,
  normalizeSavedView,
  onboardingSeen,
  pointInRegion,
  readSavedView,
  regionalSourceHints,
  writeSavedView,
} from './teachMap.js'

function memoryStorage() {
  const data = new Map()
  return {
    getItem: (key) => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
  }
}

test('saved map view validates coordinates and zoom before persistence', () => {
  assert.deepEqual(normalizeSavedView({ lat: 38.5, lon: -121.5, zoom: 13 }), { lat: 38.5, lon: -121.5, zoom: 13 })
  assert.equal(normalizeSavedView({ lat: 99, lon: 0, zoom: 13 }), null)
  assert.equal(normalizeSavedView({ lat: 0, lon: -181, zoom: 13 }), null)
  assert.equal(normalizeSavedView({ lat: 0, lon: 0, zoom: 99 }), null)
})

test('last viewport can be stored and restored without throwing on malformed storage', () => {
  const storage = memoryStorage()
  assert.equal(writeSavedView(storage, { lat: 34.05, lon: -118.25, zoom: 12 }), true)
  assert.deepEqual(readSavedView(storage), { lat: 34.05, lon: -118.25, zoom: 12 })
  storage.setItem(LAST_VIEW_KEY, '{bad json')
  assert.equal(readSavedView(storage), null)
})

test('explicit permalink map state wins over local last-view restoration', () => {
  assert.equal(hashHasExplicitMap('#map=13%2F40.7128%2F-74.006&layers=camera'), true)
  assert.equal(hashHasExplicitMap('#layers=camera'), false)
  assert.equal(hashHasExplicitMap(''), false)
})

test('onboarding seen state is explicit and local', () => {
  const storage = memoryStorage()
  assert.equal(onboardingSeen(storage), false)
  assert.equal(markOnboardingSeen(storage), true)
  assert.equal(storage.getItem(ONBOARDING_KEY), 'seen')
  assert.equal(onboardingSeen(storage), true)
})

test('regional source hints distinguish integrated, viewer-only, and key-required metros', () => {
  const la = regionalSourceHints(34.0522, -118.2437)
  assert.ok(la.some((hint) => hint.id === 'caltrans' && hint.status === 'IN APP'))

  const nyc = regionalSourceHints(40.7128, -74.0060)
  assert.ok(nyc.some((hint) => hint.id === 'nyc-511ny' && hint.status === 'KEY REQUIRED'))

  const miami = regionalSourceHints(25.7617, -80.1918)
  assert.ok(miami.some((hint) => hint.id === 'miami-fl511' && hint.status === 'OFFICIAL VIEWER'))
})

test('region boundaries fail closed outside their documented envelope', () => {
  const region = { west: -1, south: -1, east: 1, north: 1 }
  assert.equal(pointInRegion(0, 0, region), true)
  assert.equal(pointInRegion(2, 0, region), false)
  assert.equal(pointInRegion(Number.NaN, 0, region), false)
})
