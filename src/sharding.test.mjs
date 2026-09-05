import test from 'node:test'
import assert from 'node:assert/strict'
import {
  boundsAdapter,
  canonicalRecordString,
  combineCompleteShardResults,
  isShardableOverpassFailure,
  plainBounds,
  splitBoundsIntoQuadrants,
} from './sharding.js'

test('quadrants exactly cover the original bounds', () => {
  const bounds = boundsAdapter({ south: 0, west: 0, north: 10, east: 20 })
  const shards = splitBoundsIntoQuadrants(bounds)
  assert.equal(shards.length, 4)
  assert.deepEqual(shards.map((s) => s.id), ['NW', 'NE', 'SW', 'SE'])
  assert.deepEqual(shards[0], { id: 'NW', south: 5, west: 0, north: 10, east: 10 })
  assert.deepEqual(shards[3], { id: 'SE', south: 0, west: 10, north: 5, east: 20 })
})

test('plain bounds accepts Leaflet-like or plain objects', () => {
  assert.deepEqual(plainBounds({ south: 1, west: 2, north: 3, east: 4 }), { south: 1, west: 2, north: 3, east: 4 })
  assert.deepEqual(plainBounds(boundsAdapter({ south: 1, west: 2, north: 3, east: 4 })), { south: 1, west: 2, north: 3, east: 4 })
})

test('canonical record comparison ignores object key order', () => {
  const a = { id: 'node/1', tags: { z: 'last', a: 'first' }, vendorEvidence: { strength: 'explicit', matched: true } }
  const b = { vendorEvidence: { matched: true, strength: 'explicit' }, tags: { a: 'first', z: 'last' }, id: 'node/1' }
  assert.equal(canonicalRecordString(a), canonicalRecordString(b))
})

test('shard combiner deduplicates identical records on shared boundaries', () => {
  const a = { id: 'node/1', version: 2, tags: { camera: 'yes', operator: 'Example' } }
  const sameAWithDifferentKeyOrder = { tags: { operator: 'Example', camera: 'yes' }, version: 2, id: 'node/1' }
  const b = { id: 'node/2' }
  const items = combineCompleteShardResults([
    { id: 'NW', complete: true, items: [a] },
    { id: 'NE', complete: true, items: [sameAWithDifferentKeyOrder, b] },
    { id: 'SW', complete: true, items: [] },
    { id: 'SE', complete: true, items: [] },
  ])
  assert.deepEqual(items.map((item) => item.id), ['node/1', 'node/2'])
})

test('shard combiner fails closed when overlapping shards disagree about one OSM object', () => {
  const before = {
    id: 'node/42',
    version: 7,
    timestamp: '2026-09-05T20:00:00Z',
    changeset: 100,
    lat: 38.5,
    lon: -121.5,
    tags: { operator: 'Agency A', camera: 'yes' },
  }
  const after = {
    ...before,
    version: 8,
    timestamp: '2026-09-05T20:01:00Z',
    changeset: 101,
    tags: { operator: 'Agency B', camera: 'yes' },
  }

  assert.throws(
    () => combineCompleteShardResults([
      { id: 'NW', complete: true, items: [before] },
      { id: 'NE', complete: true, items: [after] },
      { id: 'SW', complete: true, items: [] },
      { id: 'SE', complete: true, items: [] },
    ]),
    (error) => {
      assert.equal(error.code, 'SHARD_CONSISTENCY_CONFLICT')
      assert.equal(error.conflict.id, 'node/42')
      assert.equal(error.conflict.first.shard, 'NW')
      assert.equal(error.conflict.second.shard, 'NE')
      assert.match(error.message, /No merged dataset was accepted/i)
      return true
    },
  )
})

test('shard combiner refuses partial scans', () => {
  assert.throws(() => combineCompleteShardResults([
    { complete: true, items: [] },
    { complete: true, items: [] },
    { complete: true, items: [] },
  ]), /Incomplete shard scan/)

  assert.throws(() => combineCompleteShardResults([
    { complete: true, items: [] },
    { complete: false, items: [] },
    { complete: true, items: [] },
    { complete: true, items: [] },
  ]), /not marked complete/)
})

test('shard combiner preserves browser object ceiling', () => {
  assert.throws(() => combineCompleteShardResults([
    { complete: true, items: [{ id: '1' }, { id: '2' }] },
    { complete: true, items: [{ id: '3' }] },
    { complete: true, items: [] },
    { complete: true, items: [] },
  ], { maxItems: 2 }), /zoom in/i)
})

test('only congestion-like failures are candidates for sharding', () => {
  assert.equal(isShardableOverpassFailure('request timed out'), true)
  assert.equal(isShardableOverpassFailure('HTTP 504'), true)
  assert.equal(isShardableOverpassFailure('Overpass remark: runtime error: Query timed out'), true)
  assert.equal(isShardableOverpassFailure('HTTP 429'), false)
  assert.equal(isShardableOverpassFailure('too many requests'), false)
  assert.equal(isShardableOverpassFailure('invalid JSON response'), false)
  assert.equal(isShardableOverpassFailure('HTTP 400'), false)
})
