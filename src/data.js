const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

export const DATA_SCHEMA_VERSION = '0.4'
const CACHE_PREFIX = 'peekaboo:overpass:v4:'
const CACHE_TTL_MS = 5 * 60 * 1000
const REQUEST_TIMEOUT_MS = 22 * 1000
const MAX_RENDER_OBJECTS = 6000
const FLOCK_WIKIDATA = 'Q108485435'
const DAY_MS = 24 * 60 * 60 * 1000

export const CATEGORY_META = {
  flock: { label: 'Flock Safety ALPR', glyph: 'F' },
  camera: { label: 'Camera', glyph: '◉' },
  alpr: { label: 'ALPR / plate reader', glyph: '▣' },
  guard: { label: 'Guard / watched area', glyph: '◆' },
  gunshot_detector: { label: 'Gunshot detector', glyph: '✦' },
  other: { label: 'Other surveillance', glyph: '•' },
}

function normalized(value) {
  return String(value || '').trim().toLowerCase()
}

function isAlprLike(tags = {}) {
  const raw = `${tags['surveillance:type'] || ''} ${tags.surveillance || ''} ${tags.camera || ''}`.toLowerCase()
  const model = normalized(tags.model)
  return raw.includes('alpr') || raw.includes('anpr') || raw.includes('plate') || model.includes('falcon')
}

export function flockEvidence(tags = {}) {
  const manufacturer = normalized(tags.manufacturer)
  const manufacturerWikidata = String(tags['manufacturer:wikidata'] || '').trim()
  const brand = normalized(tags.brand)
  const operator = normalized(tags.operator)
  const model = normalized(tags.model)
  const name = normalized(tags.name)

  if (manufacturer.includes('flock safety') || manufacturer === 'flock' || manufacturerWikidata === FLOCK_WIKIDATA) {
    return {
      matched: true,
      strength: 'explicit',
      label: 'Explicit OSM manufacturer claim',
      basis: manufacturerWikidata === FLOCK_WIKIDATA ? `manufacturer:wikidata=${FLOCK_WIKIDATA}` : `manufacturer=${tags.manufacturer}`,
    }
  }

  if (brand.includes('flock safety') || brand === 'flock') {
    return {
      matched: true,
      strength: 'legacy',
      label: 'Legacy / alternate OSM brand claim',
      basis: `brand=${tags.brand}`,
    }
  }

  if (operator.includes('flock safety') || operator === 'flock') {
    return {
      matched: true,
      strength: 'legacy',
      label: 'Legacy / alternate OSM operator claim',
      basis: `operator=${tags.operator}`,
    }
  }

  if (model.includes('flock') || name.includes('flock falcon')) {
    return {
      matched: true,
      strength: 'textual',
      label: 'Textual OSM model/name claim',
      basis: model.includes('flock') ? `model=${tags.model}` : `name=${tags.name}`,
    }
  }

  return { matched: false, strength: null, label: null, basis: null }
}

export function classify(tags = {}) {
  const raw = `${tags['surveillance:type'] || ''} ${tags.surveillance || ''} ${tags.camera || ''}`.toLowerCase()
  const flock = flockEvidence(tags)

  if (raw.includes('gunshot')) return 'gunshot_detector'
  if (flock.matched && isAlprLike(tags)) return 'flock'
  if (raw.includes('alpr') || raw.includes('anpr') || raw.includes('plate')) return 'alpr'
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
  const vendorEvidence = flockEvidence(tags)
  const manufacturer = tags.manufacturer || (vendorEvidence.matched ? 'Flock Safety (OSM claim)' : null)
  const model = tags.model || null
  const descriptiveName = [manufacturer && !manufacturer.includes('(OSM claim)') ? manufacturer : null, model].filter(Boolean).join(' ')

  return {
    id: `${element.type}/${element.id}`,
    osmType: element.type,
    osmId: element.id,
    lat: point[0],
    lon: point[1],
    tags,
    category: classify(tags),
    name: tags.name || descriptiveName || tags.operator || 'Mapped surveillance object',
    zone: tags['surveillance:zone'] || tags.zone || 'unspecified',
    operator: tags.operator || 'unknown',
    manufacturer,
    manufacturerWikidata: tags['manufacturer:wikidata'] || null,
    model,
    modelWikidata: tags['model:wikidata'] || null,
    vendorEvidence: vendorEvidence.matched ? vendorEvidence : null,
    cameraType: tags['camera:type'] || 'unspecified',
    direction: tags['camera:direction'] || tags.direction || null,
    indoor: tags.indoor || null,
    version: element.version || null,
    timestamp: element.timestamp || null,
    changeset: element.changeset || null,
  }
}

export function recordAge(timestamp, now = Date.now()) {
  if (!timestamp) return { status: 'unknown', label: 'UNKNOWN', ageDays: null }
  const time = new Date(timestamp).getTime()
  if (!Number.isFinite(time)) return { status: 'unknown', label: 'UNKNOWN', ageDays: null }
  const ageDays = Math.floor((now - time) / DAY_MS)
  if (ageDays < -1) return { status: 'unknown', label: 'FUTURE DATE', ageDays }
  if (ageDays < 365) return { status: 'current', label: '< 1 YEAR', ageDays: Math.max(0, ageDays) }
  if (ageDays < 1095) return { status: 'aging', label: '1–3 YEARS', ageDays }
  return { status: 'stale', label: '3+ YEARS', ageDays }
}

export function ageSummary(items, now = Date.now()) {
  const counts = { current: 0, aging: 0, stale: 0, unknown: 0 }
  items.forEach((item) => {
    const age = recordAge(item.timestamp, now)
    counts[age.status] = (counts[age.status] || 0) + 1
  })
  return counts
}

export function matchesSearch(item, query) {
  const tokens = normalized(query).split(/\s+/).filter(Boolean)
  if (!tokens.length) return true
  const tagText = Object.entries(item.tags || {}).map(([key, value]) => `${key} ${value}`).join(' ')
  const haystack = normalized([
    item.id,
    item.name,
    item.category,
    item.zone,
    item.operator,
    item.manufacturer,
    item.model,
    item.cameraType,
    item.direction,
    tagText,
  ].filter(Boolean).join(' '))
  return tokens.every((token) => haystack.includes(token))
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

function abortableDelay(ms, signal) {
  if (!ms) return Promise.resolve()
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

    let json
    try {
      json = await response.json()
    } catch {
      throw new Error('invalid JSON response')
    }

    if (json?.remark) {
      const remark = String(json.remark).replace(/\s+/g, ' ').trim().slice(0, 220)
      throw new Error(`Overpass remark: ${remark}`)
    }
    if (!Array.isArray(json?.elements)) throw new Error('response did not contain an elements array')
    return json
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
        failures: cached.failures || [],
      }
    }
  }

  const query = buildOverpassQuery(bounds)
  const body = new URLSearchParams({ data: query })
  const errors = []

  for (let index = 0; index < OVERPASS_ENDPOINTS.length; index += 1) {
    const endpoint = OVERPASS_ENDPOINTS[index]
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    if (index > 0) await abortableDelay(Math.min(400 * index, 1200), signal)

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

      if (items.length > MAX_RENDER_OBJECTS) {
        throw new Error(`result set contains ${items.length.toLocaleString()} objects; zoom in to keep browser rendering bounded`)
      }

      const result = {
        items,
        endpoint,
        cached: false,
        fetchedAt: Date.now(),
        fingerprint,
        attempts: errors.length + 1,
        failures: [...errors],
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

function exportProperties(item) {
  return {
    osmType: item.osmType,
    osmId: item.osmId,
    category: item.category,
    name: item.name,
    zone: item.zone,
    operator: item.operator,
    manufacturer: item.manufacturer,
    manufacturerWikidata: item.manufacturerWikidata,
    model: item.model,
    modelWikidata: item.modelWikidata,
    vendorEvidence: item.vendorEvidence,
    cameraType: item.cameraType,
    direction: item.direction,
    indoor: item.indoor,
    version: item.version,
    timestamp: item.timestamp,
    changeset: item.changeset,
  }
}

export function toGeoJSON(items) {
  return {
    type: 'FeatureCollection',
    properties: {
      generator: 'Peekaboo',
      schemaVersion: DATA_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      note: 'Public OpenStreetMap surveillance records. Vendor identity is an OSM claim, not independent verification. Absence of a record does not imply absence of surveillance.',
    },
    features: items.map((item) => ({
      type: 'Feature',
      id: item.id,
      geometry: { type: 'Point', coordinates: [item.lon, item.lat] },
      properties: { ...exportProperties(item), tags: item.tags },
    })),
  }
}

function csvCell(value) {
  let text = value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function toCSV(items) {
  const headers = [
    'osm_type', 'osm_id', 'category', 'name', 'zone', 'operator', 'manufacturer', 'model',
    'vendor_evidence', 'camera_type', 'direction', 'indoor', 'record_updated', 'osm_version',
    'changeset', 'latitude', 'longitude', 'osm_url',
  ]
  const rows = items.map((item) => [
    item.osmType,
    item.osmId,
    item.category,
    item.name,
    item.zone,
    item.operator,
    item.manufacturer,
    item.model,
    item.vendorEvidence?.strength || '',
    item.cameraType,
    item.direction,
    item.indoor,
    item.timestamp,
    item.version,
    item.changeset,
    item.lat,
    item.lon,
    `https://www.openstreetmap.org/${item.osmType}/${item.osmId}`,
  ])
  return [headers.map(csvCell).join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\n')
}

export function buildManifest(items, query = {}) {
  const countsByCategory = Object.fromEntries(Object.keys(CATEGORY_META).map((key) => [key, 0]))
  items.forEach((item) => { countsByCategory[item.category] = (countsByCategory[item.category] || 0) + 1 })
  return {
    generator: 'Peekaboo',
    schemaVersion: DATA_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: 'OpenStreetMap via Overpass',
    disclaimer: 'This manifest describes public OSM records, not verified real-world surveillance coverage or device status.',
    recordCount: items.length,
    countsByCategory,
    recordAge: ageSummary(items),
    query: {
      endpoint: query.endpoint || null,
      fetchedAt: query.fetchedAt || null,
      fingerprint: query.fingerprint || null,
      cached: Boolean(query.cached),
      attempts: query.attempts ?? null,
      failures: query.failures || [],
      durationMs: query.durationMs ?? null,
      loadedAreaKm2: query.loadedAreaKm2 ?? null,
    },
  }
}
