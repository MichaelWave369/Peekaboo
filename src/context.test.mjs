import test from 'node:test'
import assert from 'node:assert/strict'
import {
  contextEvidence,
  contextSummary,
  hasContext,
  matchesContextFilters,
} from './context.js'

test('surveillance=public is explicit public-space evidence', () => {
  const result = contextEvidence({ surveillance: 'public', 'surveillance:type': 'camera' })
  assert.equal(result.public.strength, 'explicit')
  assert.equal(result.public.basis, 'surveillance=public')
})

test('town and street surveillance zones support public-space context', () => {
  assert.equal(contextEvidence({ 'surveillance:zone': 'town' }).public.strength, 'zone')
  assert.equal(contextEvidence({ 'surveillance:zone': 'street' }).public.strength, 'zone')
})

test('a government-sounding operator alone does not infer public context', () => {
  const result = contextEvidence({ operator: 'City Police Department', 'surveillance:type': 'camera' })
  assert.equal(result.public, undefined)
})

test('park and recreation tags produce park context', () => {
  assert.equal(contextEvidence({ 'surveillance:zone': 'park' }).park.basis, 'surveillance:zone=park')
  assert.equal(contextEvidence({ leisure: 'playground' }).park.basis, 'leisure=playground')
  assert.equal(contextEvidence({ landuse: 'recreation_ground' }).park.basis, 'landuse=recreation_ground')
  assert.equal(contextEvidence({ location: 'park' }).park.basis, 'location=park')
})

test('park-looking free text alone does not fabricate park context', () => {
  const result = contextEvidence({ name: 'Central Park Camera', description: 'camera by park entrance' })
  assert.equal(result.park, undefined)
})

test('contact:webcam creates explicit public-live-cam context', () => {
  const result = contextEvidence({ 'contact:webcam': 'https://cams.example.org/live.jpg' })
  assert.equal(result.webcam.strength, 'explicit')
  assert.match(result.webcam.basis, /^contact:webcam=/)
})

test('weather context requires a valid public webcam before using descriptive hints', () => {
  assert.equal(contextEvidence({ name: 'Mountain weather conditions' }).weather, undefined)
  const result = contextEvidence({
    'contact:webcam': 'https://cams.example.org/mountain.jpg',
    name: 'Mountain Weather Conditions',
  })
  assert.equal(result.weather.strength, 'textual')
})

test('context filters use OR semantics across active contexts', () => {
  const publicItem = { tags: { surveillance: 'public' } }
  const parkItem = { tags: { 'surveillance:zone': 'park' } }
  const webcamItem = { tags: { 'contact:webcam': 'https://cams.example.org/live.jpg' } }
  const privateItem = { tags: { surveillance: 'outdoor', 'surveillance:zone': 'entrance' } }

  assert.equal(matchesContextFilters(publicItem, { public: true, park: true, webcam: false, weather: false }), true)
  assert.equal(matchesContextFilters(parkItem, { public: true, park: true, webcam: false, weather: false }), true)
  assert.equal(matchesContextFilters(webcamItem, { public: false, park: false, webcam: true, weather: false }), true)
  assert.equal(matchesContextFilters(privateItem, { public: true, park: true, webcam: false, weather: false }), false)
  assert.equal(matchesContextFilters(privateItem, { public: false, park: false, webcam: false, weather: false }), true)
  assert.equal(hasContext(publicItem, 'public'), true)
})

test('context summary counts overlapping evidence independently', () => {
  const items = [
    { tags: { surveillance: 'public' } },
    { tags: { 'surveillance:zone': 'park' } },
    { tags: { surveillance: 'public', leisure: 'park' } },
    { tags: { 'contact:webcam': 'https://cams.example.org/weather.jpg', name: 'Weather Conditions' } },
  ]
  assert.deepEqual(contextSummary(items), { webcam: 1, weather: 1, public: 2, park: 2 })
})
