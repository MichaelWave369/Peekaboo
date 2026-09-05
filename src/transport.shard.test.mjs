import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchSurveillance } from './data.js'
import { boundsAdapter } from './sharding.js'

function okResponse(elements = []) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: async () => ({ elements }),
  }
}

test('full-view timeouts recover through four soft-cooldown-bypassing shards within budget', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    if (calls <= 2) throw new Error('network timeout')
    return okResponse([])
  }

  try {
    const bounds = boundsAdapter({ south: 38, west: -122, north: 39, east: -121 })
    const result = await fetchSurveillance(bounds, null, { force: true })

    assert.equal(result.scanMode, 'sharded')
    assert.equal(result.shardCount, 4)
    assert.equal(result.items.length, 0)
    assert.equal(calls, 6)
    assert.equal(result.requestBudget.limit, 10)
    assert.equal(result.requestBudget.used, 6)
    assert.ok(result.requestBudget.remaining >= 4)
    assert.match(result.failures[0], /FULL VIEW/i)
  } finally {
    globalThis.fetch = originalFetch
  }
})
