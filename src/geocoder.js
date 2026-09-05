const DEFAULT_GEOCODER_URL = 'https://nominatim.openstreetmap.org/search'
const CACHE_PREFIX = 'peekaboo:geocode:v1:'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const MIN_REQUEST_INTERVAL_MS = 1000
const REQUEST_TIMEOUT_MS = 12000
const memoryCache = new Map()
let lastRequestStartedAt = 0

export function normalizePlaceQuery(value) {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function geocoderUrl() {
  const configured = globalThis?.PEEKABOO_CONFIG?.geocoderUrl
  return typeof configured === 'string' && configured.startsWith('https://') ? configured : DEFAULT_GEOCODER_URL
}

function parseNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function normalizeGeocoderResult(result = {}) {
  const lat = parseNumber(result.lat)
  const lon = parseNumber(result.lon)
  if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null

  let bounds = null
  if (Array.isArray(result.boundingbox) && result.boundingbox.length === 4) {
    const [south, north, west, east] = result.boundingbox.map(parseNumber)
    if ([south, north, west, east].every((value) => value !== null) && south <= north && west <= east) {
      bounds = { south, north, west, east }
    }
  }

  return {
    id: `${result.osm_type || 'place'}:${result.osm_id || `${lat}:${lon}`}`,
    lat,
    lon,
    bounds,
    label: String(result.display_name || result.name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`),
    type: String(result.type || result.addresstype || 'place'),
    category: String(result.category || result.class || ''),
    osmType: result.osm_type || null,
    osmId: result.osm_id || null,
  }
}

function storageForSearch() {
  try {
    return globalThis.sessionStorage || null
  } catch {
    return null
  }
}

function cacheKey(query) {
  return normalizePlaceQuery(query).toLocaleLowerCase('en-US')
}

function readCache(query, now = Date.now()) {
  const key = cacheKey(query)
  const memory = memoryCache.get(key)
  if (memory && now - memory.savedAt <= CACHE_TTL_MS) return memory.results

  const storage = storageForSearch()
  if (!storage) return null
  try {
    const raw = storage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (!cached?.savedAt || now - cached.savedAt > CACHE_TTL_MS || !Array.isArray(cached.results)) {
      storage.removeItem(CACHE_PREFIX + key)
      return null
    }
    memoryCache.set(key, cached)
    return cached.results
  } catch {
    return null
  }
}

function writeCache(query, results, now = Date.now()) {
  const key = cacheKey(query)
  const value = { savedAt: now, results }
  memoryCache.set(key, value)
  const storage = storageForSearch()
  if (!storage) return
  try {
    storage.setItem(CACHE_PREFIX + key, JSON.stringify(value))
  } catch {
    // Search caching is an optimization. Private browsing may disable storage.
  }
}

function abortableDelay(ms, signal) {
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    if (signal?.aborted) onAbort()
    else signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export function buildGeocoderRequestUrl(query) {
  const url = new URL(geocoderUrl())
  url.searchParams.set('q', normalizePlaceQuery(query))
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '5')
  url.searchParams.set('addressdetails', '0')
  return url.toString()
}

export async function searchPlaces(rawQuery, signal, options = {}) {
  const query = normalizePlaceQuery(rawQuery)
  if (query.length < 2) throw new Error('Enter at least 2 characters.')
  if (query.length > 160) throw new Error('Search text is too long.')

  const now = options.now?.() ?? Date.now()
  const cached = readCache(query, now)
  if (cached) return { results: cached, cached: true }

  const fetchImpl = options.fetchImpl || globalThis.fetch
  if (typeof fetchImpl !== 'function') throw new Error('Search is unavailable in this browser.')

  const waitMs = Math.max(0, MIN_REQUEST_INTERVAL_MS - (now - lastRequestStartedAt))
  await abortableDelay(waitMs, signal)
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  lastRequestStartedAt = options.now?.() ?? Date.now()

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const abortFromOutside = () => controller.abort()
  signal?.addEventListener('abort', abortFromOutside, { once: true })

  try {
    const response = await fetchImpl(buildGeocoderRequestUrl(query), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`Place search returned HTTP ${response.status}.`)
    const payload = await response.json()
    if (!Array.isArray(payload)) throw new Error('Place search returned an unexpected response.')
    const results = payload.map(normalizeGeocoderResult).filter(Boolean).slice(0, 5)
    writeCache(query, results, options.now?.() ?? Date.now())
    return { results, cached: false }
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    if (controller.signal.aborted) throw new Error('Place search timed out.')
    throw error
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abortFromOutside)
  }
}
