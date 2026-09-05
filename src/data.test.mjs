import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ageSummary,
  buildManifest,
  classify,
  flockEvidence,
  matchesSearch,
  normalizeElement,
  recordAge,
  toCSV,
} from './data.js'

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

test('record age labels describe OSM record age without claiming device status', () => {
  const now = Date.parse('2026-09-05T00:00:00Z')
  assert.equal(recordAge('2026-08-01T00:00:00Z', now).status, 'current')
  assert.equal(recordAge('2025-01-01T00:00:00Z', now).status, 'aging')
  assert.equal(recordAge('2022-01-01T00:00:00Z', now).status, 'stale')
  assert.equal(recordAge(null, now).status, 'unknown')
  assert.equal(recordAge('2030-01-01T00:00:00Z', now).status, 'unknown')
})

test('age summary partitions all loaded records', () => {
  const now = Date.parse('2026-09-05T00:00:00Z')
  const summary = ageSummary([
    { timestamp: '2026-08-01T00:00:00Z' },
    { timestamp: '2025-01-01T00:00:00Z' },
    { timestamp: '2022-01-01T00:00:00Z' },
    { timestamp: null },
  ], now)
  assert.deepEqual(summary, { current: 1, aging: 1, stale: 1, unknown: 1 })
})

test('loaded-record search matches normalized fields and raw tag metadata', () => {
  const item = normalizeElement({
    type: 'node',
    id: 99,
    lat: 38,
    lon: -121,
    tags: {
      'surveillance:type': 'ALPR',
      manufacturer: 'Flock Safety',
      model: 'Falcon V2',
      operator: 'Example Police Department',
      note: 'north entrance',
    },
  })
  assert.equal(matchesSearch(item, 'flock falcon'), true)
  assert.equal(matchesSearch(item, 'north entrance'), true)
  assert.equal(matchesSearch(item, 'different vendor'), false)
})

test('CSV export neutralizes spreadsheet formula-leading cells', () => {
  const item = normalizeElement({
    type: 'node',
    id: 7,
    lat: 1,
    lon: 2,
    tags: {
      'surveillance:type': 'camera',
      name: '=HYPERLINK("https://example.invalid","click")',
      operator: '@danger',
    },
  })
  const csv = toCSV([item])
  assert.match(csv, /"'=HYPERLINK/)
  assert.match(csv, /"'@danger"/)
  assert.doesNotMatch(csv, /,"=HYPERLINK/)
})

test('manifest carries provenance, category totals, and record-age summary', () => {
  const item = normalizeElement({
    type: 'node',
    id: 42,
    lat: 38.5,
    lon: -121.5,
    timestamp: '2026-09-01T00:00:00Z',
    tags: { 'surveillance:type': 'ALPR', manufacturer: 'Flock Safety', model: 'Falcon' },
  })
  const manifest = buildManifest([item], {
    endpoint: 'https://overpass.example/api/interpreter',
    fingerprint: 'a,b,c,d',
    cached: false,
    attempts: 1,
    loadedAreaKm2: 10,
  })
  assert.equal(manifest.recordCount, 1)
  assert.equal(manifest.countsByCategory.flock, 1)
  assert.equal(manifest.query.attempts, 1)
  assert.match(manifest.disclaimer, /not verified real-world surveillance coverage/i)
})
