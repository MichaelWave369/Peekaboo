import test from 'node:test'
import assert from 'node:assert/strict'
import { clusterRecords, diagnosticsManifest, metadataProfile, metadataSummary, proximityDiagnostics } from './robustness.js'

function record(id, lat, lon, extras = {}) {
  return {
    id,
    osmType: 'node',
    osmId: Number(id.replace(/\D/g, '')) || 1,
    lat,
    lon,
    category: 'camera',
    name: 'Camera',
    zone: 'traffic',
    operator: 'Example City',
    cameraType: 'fixed',
    direction: '90',
    manufacturer: 'Example',
    model: 'X1',
    timestamp: '2026-01-01T00:00:00Z',
    tags: {},
    ...extras,
  }
}

test('metadata profile scores descriptive records higher than sparse records', () => {
  const rich = metadataProfile(record('node/1', 38, -121))
  const sparse = metadataProfile(record('node/2', 38, -121, {
    category: 'other', zone: 'unspecified', operator: 'unknown', cameraType: 'unspecified', direction: null,
    manufacturer: null, model: null, timestamp: null,
  }))
  assert.equal(rich.level, 'high')
  assert.ok(rich.score > sparse.score)
  assert.equal(sparse.level, 'low')
})

test('metadata summary returns deterministic counts and average score', () => {
  const summary = metadataSummary([
    record('node/1', 38, -121),
    record('node/2', 38, -121, { manufacturer: null, model: null, direction: null }),
  ])
  assert.equal(summary.high + summary.medium + summary.low, 2)
  assert.ok(summary.averageScore > 0 && summary.averageScore <= 100)
})

test('clusterRecords leaves small result sets unclustered', () => {
  const records = [record('node/1', 40.7, -74), record('node/2', 40.7001, -74.0001)]
  const rendered = clusterRecords(records, 13, { threshold: 10 })
  assert.equal(rendered.length, 2)
  assert.ok(rendered.every((entry) => entry.kind === 'record'))
})

test('clusterRecords clusters dense buckets and preserves record count', () => {
  const records = Array.from({ length: 20 }, (_, index) => record(`node/${index + 1}`, 40.7 + index * 0.00001, -74 - index * 0.00001))
  const rendered = clusterRecords(records, 12, { threshold: 5, cellPx: 80 })
  assert.ok(rendered.some((entry) => entry.kind === 'cluster'))
  const represented = rendered.reduce((sum, entry) => sum + entry.count, 0)
  assert.equal(represented, records.length)
})

test('clusterRecords restores individual records at high zoom', () => {
  const records = Array.from({ length: 20 }, (_, index) => record(`node/${index + 1}`, 40.7, -74))
  const rendered = clusterRecords(records, 18, { threshold: 5 })
  assert.equal(rendered.length, records.length)
  assert.ok(rendered.every((entry) => entry.kind === 'record'))
})

test('proximity diagnostics flag nearby records but do not delete them', () => {
  const records = [
    record('node/1', 38.5, -121.5),
    record('node/2', 38.50003, -121.50003),
    record('node/3', 38.6, -121.6),
  ]
  const result = proximityDiagnostics(records, 12)
  assert.equal(result.pairCount, 1)
  assert.equal(result.recordsWithNeighbors, 2)
  assert.equal(records.length, 3)
})

test('diagnostics manifest labels proximity as candidates, not duplicates', () => {
  const records = [record('node/1', 38.5, -121.5), record('node/2', 38.50003, -121.50003)]
  const manifest = diagnosticsManifest(records, { zoom: 14 })
  assert.equal(manifest.rendering.filteredRecordCount, 2)
  assert.match(manifest.proximity.interpretation, /not automatically duplicates/i)
})
