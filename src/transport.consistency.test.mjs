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

function surveillanceNode(version, operator) {
  return {
    type: 'node',
    id: 42,
    lat: 38.5,
    lon: -121.5,
    version,
    timestamp: `2026-09-05T20:0${version}:00Z`,
    changeset: 100 + version,
    tags: {
      man_made: 'surveillance',
      camera: 'yes',
      operator,
    },
  }
}

test('adaptive scan rejects conflicting boundary revisions instead of choosing one', async () => {
  const originalFetch = globalThis.fetch
  let calls = 0

  globalThis.fetch = async () => {
    calls += 1
    if (calls <= 2) throw new Error('network timeout')
    if (calls === 3) return okResponse([surveillanceNode(7, 'Agency A')])
    if (calls === 4) return okResponse([surveillanceNode(8, 'Agency B')])
    return okResponse([])
  }

  try {
    const bounds = boundsAdapter({ south: 38, west: -122, north: 39, east: -121 })
    await assert.rejects(
      fetchSurveillance(bounds, null, { force: true }),
      (error) => {
        assert.equal(error.code, 'SHARD_CONSISTENCY_CONFLICT')
        assert.equal(error.conflict.id, 'node/42')
        assert.equal(error.conflict.first.shard, 'NW')
        assert.equal(error.conflict.second.shard, 'NE')
        assert.match(error.message, /No merged dataset was accepted/i)
        return true
      },
    )
    assert.equal(calls, 6)
  } finally {
    globalThis.fetch = originalFetch
  }
})
