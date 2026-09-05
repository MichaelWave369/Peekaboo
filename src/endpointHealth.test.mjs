import test from 'node:test'
import assert from 'node:assert/strict'
import { createEndpointHealthManager, parseRetryAfter } from './endpointHealth.js'

function memoryStorage() {
  const map = new Map()
  return {
    getItem: (key) => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  }
}

const endpoint = 'https://overpass.example/api/interpreter'

test('Retry-After supports seconds and HTTP dates', () => {
  const now = Date.parse('2026-09-05T21:00:00Z')
  assert.equal(parseRetryAfter('12', now), 12_000)
  assert.equal(parseRetryAfter('Sat, 05 Sep 2026 21:00:30 GMT', now), 30_000)
  assert.equal(parseRetryAfter('nonsense', now), null)
})

test('ordinary failure creates a soft cooldown that adaptive shards may bypass', () => {
  let clock = 1_000
  const manager = createEndpointHealthManager({ storage: memoryStorage(), now: () => clock })
  manager.recordFailure(endpoint, { message: 'request timed out' })

  const normal = manager.canTry(endpoint)
  const adaptive = manager.canTry(endpoint, { allowSoftCooldown: true })
  assert.equal(normal.allowed, false)
  assert.equal(normal.state.cooldownKind, 'soft')
  assert.equal(adaptive.allowed, true)
  assert.equal(adaptive.bypassedSoftCooldown, true)
})

test('429 creates a hard cooldown that adaptive shards cannot bypass', () => {
  let clock = 2_000
  const manager = createEndpointHealthManager({ storage: memoryStorage(), now: () => clock })
  manager.recordFailure(endpoint, { status: 429, retryAfter: '120', message: 'HTTP 429' })

  const adaptive = manager.canTry(endpoint, { allowSoftCooldown: true })
  assert.equal(adaptive.allowed, false)
  assert.equal(adaptive.state.cooldownKind, 'hard')
  assert.ok(adaptive.remainingMs >= 120_000)
})

test('success closes the circuit and clears consecutive failures', () => {
  let clock = 3_000
  const manager = createEndpointHealthManager({ storage: memoryStorage(), now: () => clock })
  manager.recordFailure(endpoint, { message: 'HTTP 503' })
  clock += 10_000
  manager.recordSuccess(endpoint)

  const health = manager.snapshot([endpoint])[0]
  assert.equal(health.state, 'ready')
  assert.equal(health.consecutiveFailures, 0)
  assert.equal(health.lastError, null)
})

test('endpoint health persists through the supplied session storage', () => {
  const storage = memoryStorage()
  let clock = 4_000
  const first = createEndpointHealthManager({ storage, now: () => clock })
  first.recordFailure(endpoint, { status: 429, message: 'HTTP 429' })

  const second = createEndpointHealthManager({ storage, now: () => clock })
  const health = second.snapshot([endpoint])[0]
  assert.equal(health.state, 'cooldown')
  assert.equal(health.cooldownKind, 'hard')
})
