const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const CACHE_PREFIX = 'peekaboo:overpass:v2:'
const CACHE_TTL_MS = 5 * 60 * 1000
const REQUEST_TIMEOUT_MS = 22 * 1000

export const CATEGORY_META = {
  camera: { label: 'Camera', glyph: '◉' },
  alpr: { label: 'ALPR / plate reader', glyph: '▣' },
  guard: { label: 'Guard / watched area', glyph: '◆' },
  gunshot_detector: { label: 'Gunshot detector', glyph: '✦' },
  other: { label: 'Other surveillance', glyph: '•' },
}

export function classify(tags = {}) {
  const raw = `${tags['surveillance:type'] || ''} ${tags.surveillance || ''} ${tags.camera || ''}`.toLowerCase()
  if (raw.includes('alpr') || raw.includes('anpr') || raw.includes('plate')) return 'alpr'
  if (raw.includes('gunshot')) return 'gunshot_detector'
  if (raw.includes('guard')) return 'guard'
  if (raw.includes('camera') || tags['camera:type']) return 'camera'
  return 'other'
}

function pointFor(element) {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') return [element.lat, element.lon]
  if (element.center && typeof element.center.lat === 'number' && typeof element.center.lon === 'number') {
    return [element.center.lat, element.center.lon]
  }
  return null
}

export function normalizeElement(element) {
  const point = pointFor(element)
  if (!point) return null
  const tags = element.tags || {}
  return {
    id: `${element.type}/${element.id}`,
    osmType: element.type,
    osmId: element.id,
    lat: point[0],
    lon: point[1],
    tags,
    category: classify(tags),
    name: tags.name || tags.operator || 'Mapped surveillance object',
    zone: tags['surveillance:zone'] || tags.zone || 'unspecified',
    operator: tags.operator || 'unknown',
    cameraType: tags['camera:type'] || 'unspecified',
    direction: tags['camera:direction'] || tags.direction || null,
    indoor: tags.indoor || null,
    version: element.version || null,
    timestamp: element.timestamp || null,
    changeset: element.changeset || null,
  }
}

export function boundsFingerprint(bounds) {
  if (!bounds) return ''
  return [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()]
    .map((value) => Number(value).toFixed(4))
    .join(',')
}

export function buildOverpassQuery(bounds) {
  const south = bounds.getSouth().toFixed(6)
  const west = bounds.getWest().toFixed(6)
  const north = bounds.getNorth().toFixed(6)
  const east = bounds.getEast().toFixed(6)
  const bbox = `${south},${west},${north},${east}`
  return `[out:json][timeout:20];\n(\n  nwr[\"man_made\"=\"surveillance\"](${bbox});\n  nwr[\"surveillance:type\"](${bbox});\n);\nout meta center;`
}

function readCache(key) {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (!cached?.savedAt || Date.now() - cached.savedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_PREFIX + key)
      return null
    }
    return cached
  } catch {
    return null
  }
}

function writeCache(key, value) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ ...value, savedAt: Date.now() }))
  } catch {
    // Storage can be unavailable in privacy modes. Caching is optional.
  }
}

async function requestEndpoint(url, body, externalSignal) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const abortFromOutside = () => controller.abort()
  externalSignal?.addEventListener('abort', abortFromOutside, { once: true })

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body,
      signal: controller.signal,
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    try {
      return await response.json()
    } catch {
      throw new Error('invalid JSON response')
    }
  } catch (error) {
    if (externalSignal?.aborted) throw new DOMException('Aborted', 'AbortError')
    if (controller.signal.aborted) throw new Error('request timed out')
    throw error
  } finally {
    clearTimeout(timer)
    externalSignal?.removeEventListener('abort', abortFromOutside)
  }
}

export async function fetchSurveillance(bounds, signal, { force = false } = {}) {
  const fingerprint = boundsFingerprint(bounds)
  if (!force) {
    const cached = readCache(fingerprint)
    if (cached?.items) {
      return {
        items: cached.items,
        endpoint: cached.endpoint || 'session cache',
        cached: true,
        fetchedAt: cached.fetchedAt || cached.savedAt,
        fingerprint,
        attempts: 0,
      }
    }
  }

  const query = buildOverpassQuery(bounds)
  const body = new URLSearchParams({ data: query })
  const errors = []

  for (const endpoint of OVERPASS_ENDPOINTS) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    try {
      const json = await requestEndpoint(endpoint, body, signal)
      const seen = new Set()
      const items = (json.elements || [])
        .map(normalizeElement)
        .filter(Boolean)
        .filter((item) => {
          if (seen.has(item.id)) return false
          seen.add(item.id)
          return true
        })

      const result = {
        items,
        endpoint,
        cached: false,
        fetchedAt: Date.now(),
        fingerprint,
        attempts: errors.length + 1,
      }
      writeCache(fingerprint, result)
      return result
    } catch (error) {
      if (error.name === 'AbortError') throw error
      errors.push(`${new URL(endpoint).hostname}: ${error.message}`)
    }
  }

  throw new Error(`All Overpass endpoints failed. ${errors.join(' • ')}`)
}

export function boundsAreaKm2(bounds) {
  if (!bounds) return 0
  const centerLat = (bounds.getNorth() + bounds.getSouth()) / 2
  const latKm = Math.abs(bounds.getNorth() - bounds.getSouth()) * 111.32
  const lonKm = Math.abs(bounds.getEast() - bounds.getWest()) * 111.32 * Math.cos((centerLat * Math.PI) / 180)
  return Math.max(0, latKm * lonKm)
}

export function mappingSignal(items, areaKm2) {
  const count = items.length
  const density = areaKm2 > 0 ? count / areaKm2 : 0
  const completeness = count
    ? items.reduce((sum, item) => {
        const fields = [item.zone !== 'unspecified', item.operator !== 'unknown', item.cameraType !== 'unspecified', Boolean(item.direction)]
        return sum + fields.filter(Boolean).length / fields.length
      }, 0) / count
    : 0

  let densityLabel = 'LOW'
  if (density >= 1) densityLabel = 'HIGH'
  else if (density >= 0.15) densityLabel = 'MEDIUM'

  let detailLabel = 'LOW'
  if (completeness >= 0.6) detailLabel = 'HIGH'
  else if (completeness >= 0.3) detailLabel = 'MEDIUM'

  return { density, densityLabel, completeness, detailLabel }
}

export function toGeoJSON(items) {
  return {
    type: 'FeatureCollection',
    properties: {
      generator: 'Peekaboo',
      generatedAt: new Date().toISOString(),
      note: 'Public OpenStreetMap surveillance records. Absence of a record does not imply absence of surveillance.',
    },
    features: items.map((item) => ({
      type: 'Feature',
      id: item.id,
      geometry: { type: 'Point', coordinates: [item.lon, item.lat] },
      properties: {
        osmType: item.osmType,
        osmId: item.osmId,
        category: item.category,
        name: item.name,
        zone: item.zone,
        operator: item.operator,
        cameraType: item.cameraType,
        direction: item.direction,
        indoor: item.indoor,
        version: item.version,
        timestamp: item.timestamp,
        changeset: item.changeset,
        tags: item.tags,
      },
    })),
  }
}
