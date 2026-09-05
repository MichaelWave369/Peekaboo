const STORAGE_KEY = 'peekaboo:overpass:endpoint-health:v1'
const SOFT_BASE_MS = 5_000
const SOFT_MAX_MS = 60_000
const HARD_BASE_MS = 15_000
const RATE_LIMIT_MIN_MS = 60_000
const HARD_MAX_MS = 10 * 60_000

function safeSessionStorage() {
  try {
    return globalThis.sessionStorage || null
  } catch {
    return null
  }
}

function endpointHost(endpoint) {
  try {
    return new URL(endpoint).hostname
  } catch {
    return String(endpoint || 'unknown')
  }
}

export function parseRetryAfter(value, now = Date.now()) {
  if (value === null || value === undefined || value === '') return null
  const text = String(value).trim()
  if (/^\d+(?:\.\d+)?$/.test(text)) return Math.max(0, Math.round(Number(text) * 1000))
  const date = Date.parse(text)
  if (!Number.isFinite(date)) return null
  return Math.max(0, date - now)
}

function defaultState() {
  return {
    consecutiveFailures: 0,
    cooldownUntil: 0,
    cooldownKind: null,
    lastError: null,
    lastStatus: null,
    lastFailureAt: null,
    lastSuccessAt: null,
  }
}

export function createEndpointHealthManager(options = {}) {
  const storage = options.storage === undefined ? safeSessionStorage() : options.storage
  const now = typeof options.now === 'function' ? options.now : () => Date.now()
  let states = {}

  try {
    const raw = storage?.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) states = parsed
  } catch {
    states = {}
  }

  const persist = () => {
    if (!storage) return
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(states))
    } catch {
      // Endpoint health is advisory. Private browsing/storage failure must not break scanning.
    }
  }

  const stateFor = (endpoint) => ({ ...defaultState(), ...(states[endpoint] || {}) })

  const canTry = (endpoint, settings = {}) => {
    const at = Number.isFinite(settings.at) ? settings.at : now()
    const state = stateFor(endpoint)
    const remainingMs = Math.max(0, Number(state.cooldownUntil || 0) - at)
    if (!remainingMs) return { allowed: true, bypassedSoftCooldown: false, remainingMs: 0, state }
    if (state.cooldownKind === 'soft' && settings.allowSoftCooldown) {
      return { allowed: true, bypassedSoftCooldown: true, remainingMs, state }
    }
    return { allowed: false, bypassedSoftCooldown: false, remainingMs, state }
  }

  const recordFailure = (endpoint, failure = {}) => {
    const at = Number.isFinite(failure.at) ? failure.at : now()
    const previous = stateFor(endpoint)
    const consecutiveFailures = Math.max(1, Number(previous.consecutiveFailures || 0) + 1)
    const status = Number.isFinite(Number(failure.status)) ? Number(failure.status) : null
    const retryAfterMs = parseRetryAfter(failure.retryAfter, at)
    const hard = status === 429 || retryAfterMs !== null
    const base = hard ? (status === 429 ? RATE_LIMIT_MIN_MS : HARD_BASE_MS) : SOFT_BASE_MS
    const max = hard ? HARD_MAX_MS : SOFT_MAX_MS
    const exponential = Math.min(max, base * (2 ** Math.min(consecutiveFailures - 1, 5)))
    const cooldownMs = Math.min(max, Math.max(exponential, retryAfterMs || 0))

    states[endpoint] = {
      ...previous,
      consecutiveFailures,
      cooldownUntil: at + cooldownMs,
      cooldownKind: hard ? 'hard' : 'soft',
      lastError: String(failure.message || 'endpoint failure').slice(0, 240),
      lastStatus: status,
      lastFailureAt: at,
    }
    persist()
    return { ...states[endpoint], cooldownMs, retryAfterMs }
  }

  const recordSuccess = (endpoint, settings = {}) => {
    const at = Number.isFinite(settings.at) ? settings.at : now()
    const previous = stateFor(endpoint)
    states[endpoint] = {
      ...previous,
      consecutiveFailures: 0,
      cooldownUntil: 0,
      cooldownKind: null,
      lastError: null,
      lastStatus: null,
      lastSuccessAt: at,
    }
    persist()
    return { ...states[endpoint] }
  }

  const snapshot = (endpoints, at = now()) => (endpoints || []).map((endpoint) => {
    const state = stateFor(endpoint)
    const remainingMs = Math.max(0, Number(state.cooldownUntil || 0) - at)
    return {
      endpoint,
      host: endpointHost(endpoint),
      state: remainingMs ? 'cooldown' : 'ready',
      cooldownKind: remainingMs ? state.cooldownKind : null,
      remainingMs,
      consecutiveFailures: Number(state.consecutiveFailures || 0),
      lastStatus: state.lastStatus,
      lastError: state.lastError,
      lastFailureAt: state.lastFailureAt,
      lastSuccessAt: state.lastSuccessAt,
    }
  })

  const reset = () => {
    states = {}
    try {
      storage?.removeItem(STORAGE_KEY)
    } catch {
      // Test/debug helper only.
    }
  }

  return { canTry, recordFailure, recordSuccess, snapshot, reset }
}
