import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchSurveillanceAdaptive } from './adaptiveFetch.js'
import { boundsAdapter } from './sharding.js'

const viewport = boundsAdapter({ south: 0, west: 0, north: 10, east: 20 })

test('successful full-view fetch remains a single scan', async () => {
  const fetcher = async () => ({
    items: [{ id: 'node/1' }], endpoint: 'https://one.example', cached: false,
    fetchedAt: 100, fingerprint: '0,0,10,20', attempts: 1, failures: [],
  })
  const result = await fetchSurveillanceAdaptive(viewport, null, { fetcher })
  assert.equal(result.scanMode, 'single')
  assert.equal(result.shardCount, 1)
  assert.equal(result.items.length, 1)
})

test('timeout-like full failure falls back to four complete shards and deduplicates', async () => {
  let calls = 0
  const fetcher = async (bounds) => {
    calls += 1
    if (calls === 1) throw new Error('All Overpass endpoints failed. request timed out')
    const south = bounds.getSouth()
    const west = bounds.getWest()
    const common = { id: 'node/shared' }
    return {
      items: calls === 2 ? [common, { id: `node/${south}-${west}` }] : [common],
      endpoint: 'https://one.example', cached: false, fetchedAt: 100 + calls,
      attempts: 1, failures: [],
    }
  }

  const result = await fetchSurveillanceAdaptive(viewport, null, { fetcher, shardDelayMs: 0 })
  assert.equal(calls, 5)
  assert.equal(result.scanMode, 'sharded')
  assert.equal(result.shardCount, 4)
  assert.equal(result.items.filter((item) => item.id === 'node/shared').length, 1)
  assert.match(result.failures[0], /FULL VIEW/)
})

test('a failed shard rejects the entire fallback rather than returning partial data', async () => {
  let calls = 0
  const fetcher = async () => {
    calls += 1
    if (calls === 1) throw new Error('request timed out')
    if (calls === 3) throw new Error('HTTP 503')
    return { items: [], endpoint: 'https://one.example', cached: false, fetchedAt: 100, attempts: 1, failures: [] }
  }

  await assert.rejects(
    fetchSurveillanceAdaptive(viewport, null, { fetcher, shardDelayMs: 0 }),
    /No partial results were accepted/,
  )
})

test('non-congestion failures do not trigger four more public requests', async () => {
  let calls = 0
  const fetcher = async () => {
    calls += 1
    throw new Error('invalid JSON response')
  }
  await assert.rejects(fetchSurveillanceAdaptive(viewport, null, { fetcher, shardDelayMs: 0 }), /invalid JSON/)
  assert.equal(calls, 1)
})
