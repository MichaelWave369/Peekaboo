import test from 'node:test'
import assert from 'node:assert/strict'
import { classify, flockEvidence, normalizeElement } from './data.js'

test('explicit Flock manufacturer plus ALPR becomes Flock layer', () => {
  const tags = {
    'surveillance:type': 'ALPR',
    manufacturer: 'Flock Safety',
    model: 'Falcon',
  }
  assert.equal(classify(tags), 'flock')
  assert.equal(flockEvidence(tags).strength, 'explicit')
})

test('Flock manufacturer Wikidata is accepted as explicit vendor evidence', () => {
  const tags = {
    'surveillance:type': 'ALPR',
    'manufacturer:wikidata': 'Q108485435',
  }
  const evidence = flockEvidence(tags)
  assert.equal(evidence.matched, true)
  assert.equal(evidence.strength, 'explicit')
  assert.equal(classify(tags), 'flock')
})

test('Flock Raven remains a gunshot detector instead of becoming Flock ALPR', () => {
  const tags = {
    'surveillance:type': 'gunshot_detector',
    manufacturer: 'Flock Safety',
    model: 'Flock Raven',
  }
  assert.equal(classify(tags), 'gunshot_detector')
})

test('generic ALPR remains generic ALPR', () => {
  assert.equal(classify({ 'surveillance:type': 'ALPR', manufacturer: 'Other Vendor' }), 'alpr')
})

test('Flock manufacturer without ALPR/Falcon evidence is not promoted to Flock ALPR', () => {
  const tags = {
    manufacturer: 'Flock Safety',
    'camera:type': 'fixed',
  }
  assert.equal(classify(tags), 'camera')
})

test('legacy Flock operator claim is preserved as legacy evidence', () => {
  const tags = {
    'surveillance:type': 'ALPR',
    operator: 'Flock Safety',
  }
  const evidence = flockEvidence(tags)
  assert.equal(evidence.matched, true)
  assert.equal(evidence.strength, 'legacy')
  assert.equal(classify(tags), 'flock')
})

test('normalized element carries manufacturer, model, and vendor provenance', () => {
  const item = normalizeElement({
    type: 'node',
    id: 42,
    lat: 38.5,
    lon: -121.5,
    version: 3,
    timestamp: '2026-09-01T00:00:00Z',
    changeset: 123,
    tags: {
      'surveillance:type': 'ALPR',
      manufacturer: 'Flock Safety',
      model: 'Falcon V2',
      operator: 'Example Police Department',
    },
  })

  assert.equal(item.category, 'flock')
  assert.equal(item.manufacturer, 'Flock Safety')
  assert.equal(item.model, 'Falcon V2')
  assert.equal(item.vendorEvidence.strength, 'explicit')
  assert.equal(item.version, 3)
})
