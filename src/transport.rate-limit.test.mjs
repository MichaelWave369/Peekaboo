import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchSurveillance } from './data.js'
import { boundsAdapter } from './sharding.js'

function rateLimitedResponse() {
  return {
    ok: false,
    status: 429,
    headers: { get: (name) => name.toLowerCase() === 'retry-after' ? '120' : null },
    json: async () => ({ elements: [] }),
  }
}

test('429 responses never shard and immediate retries make zero network requests during hard cooldown', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    return rateLimitedResponse()
  }

  const bounds = boundsAdapter({ south: 38, west: -122, north: 39, east: -121 })

  try {
    await assert.rejects(fetchSurveillance(bounds, null, { force: true }), /HTTP 429/i)
    assert.equal(calls, 2)

    await assert.rejects(fetchSurveillance(bounds, null, { force: true }), /cooling down/i)
    assert.equal(calls, 2)
  } finally {
    globalThis.fetch = originalFetch
  }
})
