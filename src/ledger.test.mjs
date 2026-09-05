import test from 'node:test'
import assert from 'node:assert/strict'
import {
  baselineStorageKey,
  buildChangeReport,
  compareSnapshots,
  comparisonFingerprint,
  createSnapshot,
  loadBaseline,
  removeBaseline,
  saveBaseline,
  stableStringify,
  validateSnapshot,
} from './ledger.js'

function item(id, overrides = {}) {
  return {
    id,
    osmType: 'node',
    osmId: Number(id.split('/')[1] || 1),
    lat: 38.5,
    lon: -121.5,
    category: 'camera',
    name: 'Mapped camera',
    zone: 'traffic',
    operator: 'Example City',
    manufacturer: null,
    manufacturerWikidata: null,
    model: null,
    modelWikidata: null,
    vendorEvidence: null,
    cameraType: 'fixed',
    direction: '90',
    indoor: 'no',
    version: 1,
    timestamp: '2026-09-01T00:00:00Z',
    changeset: 10,
    tags: { man_made: 'surveillance', 'surveillance:type': 'camera' },
    ...overrides,
  }
}

function snapshot(items, fingerprint = '38.4000,-121.6000,38.6000,-121.4000') {
  return createSnapshot(items, {
    fingerprint,
    loadedAreaKm2: 123,
    endpoint: 'https://overpass-api.de/api/interpreter',
    fetchedAt: 1788200000000,
    cached: false,
    attempts: 1,
    failures: [],
    durationMs: 250,
    capturedAt: '2026-09-05T20:00:00.000Z',
  })
}

test('stableStringify and comparisonFingerprint ignore object key order', () => {
  const a = { b: 2, a: { z: 3, y: 1 } }
  const b = { a: { y: 1, z: 3 }, b: 2 }
  assert.equal(stableStringify(a), stableStringify(b))
  assert.equal(comparisonFingerprint(a), comparisonFingerprint(b))
})

test('snapshot fingerprint is deterministic across input ordering and tag key ordering', () => {
  const a = snapshot([
    item('node/2', { tags: { b: '2', a: '1' } }),
    item('node/1'),
  ])
  const b = snapshot([
    item('node/1'),
    item('node/2', { tags: { a: '1', b: '2' } }),
  ])
  assert.equal(a.snapshotFingerprint, b.snapshotFingerprint)
})

test('snapshot validation detects tampering', () => {
  const snap = snapshot([item('node/1')])
  const altered = structuredClone(snap)
  altered.records[0].operator = 'Altered operator'
  const result = validateSnapshot(altered)
  assert.equal(result.ok, false)
  assert.match(result.error, /semantic fingerprint/i)
})

test('identical snapshots compare as unchanged', () => {
  const before = snapshot([item('node/1'), item('node/2')])
  const after = snapshot([item('node/1'), item('node/2')])
  const diff = compareSnapshots(before, after)
  assert.equal(diff.compatible, true)
  assert.deepEqual(diff.summary, { added: 0, removed: 0, changed: 0, unchanged: 2, totalDelta: 0 })
})

test('comparison separates added, removed, and changed OSM records', () => {
  const before = snapshot([
    item('node/1'),
    item('node/2'),
    item('node/3'),
  ])
  const after = snapshot([
    item('node/1'),
    item('node/2', { operator: 'Different City', tags: { man_made: 'surveillance', operator: 'Different City' } }),
    item('node/4'),
  ])
  const diff = compareSnapshots(before, after)
  assert.equal(diff.summary.added, 1)
  assert.equal(diff.summary.removed, 1)
  assert.equal(diff.summary.changed, 1)
  assert.equal(diff.summary.unchanged, 1)
  assert.equal(diff.added[0].id, 'node/4')
  assert.equal(diff.removed[0].id, 'node/3')
  assert.equal(diff.changed[0].id, 'node/2')
  assert.ok(diff.changed[0].fields.includes('operator'))
  assert.ok(diff.changed[0].fields.includes('raw OSM tags'))
})

test('source revision metadata alone does not fabricate a semantic change', () => {
  const before = snapshot([item('node/1', { version: 1, timestamp: '2026-01-01T00:00:00Z', changeset: 1 })])
  const after = snapshot([item('node/1', { version: 2, timestamp: '2026-02-01T00:00:00Z', changeset: 2 })])
  const diff = compareSnapshots(before, after)
  assert.equal(diff.summary.changed, 0)
  assert.equal(diff.summary.unchanged, 1)
})

test('geometry changes are reported as location changes', () => {
  const before = snapshot([item('node/1')])
  const after = snapshot([item('node/1', { lat: 38.5005 })])
  const diff = compareSnapshots(before, after)
  assert.deepEqual(diff.changed[0].fields, ['location'])
})

test('different viewport fingerprints are incompatible', () => {
  const before = snapshot([item('node/1')], 'a')
  const after = snapshot([item('node/1')], 'b')
  const diff = compareSnapshots(before, after)
  assert.equal(diff.compatible, false)
  assert.match(diff.reason, /different query areas/i)
})

test('change report carries explicit physical-world disclaimer', () => {
  const before = snapshot([item('node/1')])
  const after = snapshot([item('node/1'), item('node/2')])
  const report = buildChangeReport(before, after)
  assert.equal(report.compatible, true)
  assert.equal(report.summary.added, 1)
  assert.match(report.disclaimer, /do not independently prove/i)
})

test('baseline storage round-trips and can be removed', () => {
  const backing = new Map()
  const storage = {
    setItem(key, value) { backing.set(key, value) },
    getItem(key) { return backing.has(key) ? backing.get(key) : null },
    removeItem(key) { backing.delete(key) },
  }
  const snap = snapshot([item('node/1')])
  const saved = saveBaseline(storage, snap)
  assert.equal(saved.ok, true)
  assert.equal(saved.key, baselineStorageKey(snap.scopeFingerprint))
  const loaded = loadBaseline(storage, snap.scopeFingerprint)
  assert.equal(loaded.ok, true)
  assert.equal(loaded.snapshot.snapshotFingerprint, snap.snapshotFingerprint)
  assert.equal(removeBaseline(storage, snap.scopeFingerprint).ok, true)
  assert.equal(loadBaseline(storage, snap.scopeFingerprint).snapshot, null)
})

test('baseline storage failures are contained instead of thrown', () => {
  const storage = { setItem() { throw new Error('quota exceeded') } }
  const result = saveBaseline(storage, snapshot([item('node/1')]))
  assert.equal(result.ok, false)
  assert.match(result.error, /quota exceeded/i)
})
