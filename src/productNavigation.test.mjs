import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildProductHash,
  normalizeProductMode,
  normalizeRecordId,
  parseProductHash,
  sortRecordSummaries,
} from './productNavigation.js'

test('product mode is explicit and fails back to surveillance', () => {
  assert.equal(normalizeProductMode('public'), 'public')
  assert.equal(normalizeProductMode('surveillance'), 'surveillance')
  assert.equal(normalizeProductMode('all-the-things'), 'surveillance')
})

test('record IDs are bounded and reject hash/query injection characters', () => {
  assert.equal(normalizeRecordId('node/12345'), 'node/12345')
  assert.equal(normalizeRecordId('official/usgs-ashcam/rainier-longmire'), 'official/usgs-ashcam/rainier-longmire')
  assert.equal(normalizeRecordId('node/1&mode=public'), '')
  assert.equal(normalizeRecordId('x'.repeat(161)), '')
})

test('record permalink survives the normal hash writer alongside map state', () => {
  const hash = buildProductHash({
    view: { zoom: 13, lat: 40.7128, lon: -74.006 },
    filters: { camera: true, alpr: false },
    contexts: { public: true, park: false },
    search: 'Broadway',
    mode: 'public',
    recordId: 'node/12345',
  })
  const params = new URLSearchParams(hash)
  assert.equal(params.get('map'), '13/40.71280/-74.00600')
  assert.equal(params.get('layers'), 'camera')
  assert.equal(params.get('contexts'), 'public')
  assert.equal(params.get('q'), 'Broadway')
  assert.equal(params.get('mode'), 'public')
  assert.equal(params.get('record'), 'node/12345')
})

test('default surveillance mode does not add needless mode noise to shared links', () => {
  const hash = buildProductHash({ view: { zoom: 10, lat: 1, lon: 2 }, filters: {}, mode: 'surveillance' })
  assert.equal(new URLSearchParams(hash).has('mode'), false)
})

test('product hash parser recovers only safe product state', () => {
  assert.deepEqual(parseProductHash('#map=12/1/2&mode=public&record=way/77'), { mode: 'public', recordId: 'way/77' })
  assert.deepEqual(parseProductHash('#mode=nonsense&record=bad%26mode'), { mode: 'surveillance', recordId: '' })
})

test('record summaries sort deterministically by category, name, then id', () => {
  const sorted = sortRecordSummaries([
    { id: '3', category: 'camera', name: 'Zulu' },
    { id: '2', category: 'alpr', name: 'Bravo' },
    { id: '1', category: 'camera', name: 'Alpha' },
  ])
  assert.deepEqual(sorted.map((item) => item.id), ['2', '1', '3'])
})
