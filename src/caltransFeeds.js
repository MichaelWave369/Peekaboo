import { mediaKind, safePublicCamUrl } from './publicCam.js'

export const CALTRANS_CCTV_ENDPOINT = 'https://caltrans-gis.dot.ca.gov/arcgis/rest/services/CHhighway/CCTV/FeatureServer/0/query'
export const CALTRANS_QUICKMAP_URL = 'https://quickmap.dot.ca.gov/'

const CACHE_PREFIX = 'peekaboo:official:caltrans:v1:'
const CACHE_TTL_MS = 2 * 60 * 1000
const REQUEST_TIMEOUT_MS = 12 * 1000
const MAX_RECORDS = 2000
const OUT_FIELDS = [
  'OBJECTID',
  'index_',
  'recordDate',
  'recordTime',
  'recordEpoch',
  'district',
  'locationName',
  'nearbyPlace',
  'longitude',
  'latitude',
  'elevation',
  'direction',
  'county',
  'route',
  'routeSuffix',
  'postmilePrefix',
  'postmile',
  'Postmile_Suffix',
  'inService',
  'imageDescription',
  'streamingVideoURL',
  'currentImageUpdateFrequency',
  'currentImageURL',
].join(',')

function storage() {
  try { return globalThis.sessionStorage || null } catch { return null }
}

function finite(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function finiteCoordinate(value, min, max) {
  const number = finite(value)
  return number !== null && number >= min && number <= max ? number : null
}

function boundsValues(bounds) {
  if (!bounds) return null
  const west = finite(typeof bounds.getWest === 'function' ? bounds.getWest() : bounds.west)
  const south = finite(typeof bounds.getSouth === 'function' ? bounds.getSouth() : bounds.south)
  const east = finite(typeof bounds.getEast === 'function' ? bounds.getEast() : bounds.east)
  const north = finite(typeof bounds.getNorth === 'function' ? bounds.getNorth() : bounds.north)
  if ([west, south, east, north].some((value) => value === null)) return null
  if (west < -180 || east > 180 || south < -90 || north > 90 || west >= east || south >= north) return null
  return { west, south, east, north }
}

export function caltransBoundsFingerprint(bounds) {
  const values = boundsValues(bounds)
  if (!values) return null
  return [values.west, values.south, values.east, values.north].map((value) => value.toFixed(4)).join(',')
}

export function buildCaltransQuery(bounds) {
  const values = boundsValues(bounds)
  if (!values) return null
  const params = new URLSearchParams({
    where: '1=1',
    outFields: OUT_FIELDS,
    geometry: `${values.west},${values.south},${values.east},${values.north}`,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    returnGeometry: 'true',
    outSR: '4326',
    resultRecordCount: String(MAX_RECORDS),
    f: 'json',
  })
  return `${CALTRANS_CCTV_ENDPOINT}?${params.toString()}`
}

export function caltransServiceStatus(value) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (['true', '1', 'yes', 'y', 'active', 'in service', 'in-service'].includes(raw)) {
    return { key: 'in-service', label: 'IN SERVICE' }
  }
  if (['false', '0', 'no', 'n', 'inactive', 'out of service', 'out-of-service'].includes(raw)) {
    return { key: 'out-of-service', label: 'OUT OF SERVICE' }
  }
  return { key: 'unknown', label: 'SERVICE STATUS UNKNOWN' }
}

function timestampMs(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' || /^\d+(?:\.\d+)?$/.test(String(value).trim())) {
    const number = Number(value)
    if (!Number.isFinite(number) || number <= 0) return null
    return number < 100_000_000_000 ? number * 1000 : number
  }
  const parsed = Date.parse(String(value))
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizeCaltransFeature(feature = {}) {
  const attributes = feature.attributes || feature.properties || {}
  const geometry = feature.geometry || {}
  const coordinates = Array.isArray(geometry.coordinates) ? geometry.coordinates : null
  const lon = finiteCoordinate(geometry.x ?? coordinates?.[0] ?? attributes.longitude, -180, 180)
  const lat = finiteCoordinate(geometry.y ?? coordinates?.[1] ?? attributes.latitude, -90, 90)
  const objectId = attributes.OBJECTID ?? attributes.index_
  if (objectId === null || objectId === undefined || objectId === '' || lat === null || lon === null) return null

  const imageUrl = safePublicCamUrl(attributes.currentImageURL)
  const streamUrl = safePublicCamUrl(attributes.streamingVideoURL)
  if (!imageUrl && !streamUrl) return null

  const streamKind = mediaKind(streamUrl)
  const sourceRecordTimestamp = timestampMs(attributes.recordDate) ?? timestampMs(attributes.recordEpoch)
  const service = caltransServiceStatus(attributes.inService)

  return {
    id: `official/caltrans-cctv/${objectId}`,
    sourceClass: 'official-public-feed',
    sourceKey: 'caltrans-cctv',
    sourceLabel: 'Caltrans CCTV / California Department of Transportation',
    sourceRole: 'official transportation agency',
    objectId: String(objectId),
    name: String(attributes.locationName || attributes.nearbyPlace || `Caltrans CCTV ${objectId}`).trim(),
    nearbyPlace: attributes.nearbyPlace || null,
    lat,
    lon,
    district: attributes.district ?? null,
    county: attributes.county || null,
    route: attributes.route || null,
    direction: attributes.direction || null,
    postmile: attributes.postmile ?? null,
    elevation: attributes.elevation ?? null,
    imageDescription: attributes.imageDescription || null,
    imageUpdateFrequency: attributes.currentImageUpdateFrequency || null,
    imageUrl,
    streamUrl,
    streamKind,
    hasImage: Boolean(imageUrl),
    hasStream: Boolean(streamUrl),
    inlineImageEligible: Boolean(imageUrl?.startsWith('https://')),
    inlineStreamEligible: Boolean(streamUrl?.startsWith('https://') && ['video', 'hls'].includes(streamKind)),
    service,
    sourceRecordTimestamp,
    sourceRecordAt: sourceRecordTimestamp ? new Date(sourceRecordTimestamp).toISOString() : null,
    quickMapUrl: CALTRANS_QUICKMAP_URL,
  }
}

export function parseCaltransPayload(payload = {}) {
  if (payload?.error) {
    const message = payload.error.message || 'Caltrans ArcGIS service returned an error.'
    const details = Array.isArray(payload.error.details) ? payload.error.details.filter(Boolean).join(' ') : ''
    throw new Error(details ? `${message} ${details}` : message)
  }
  if (!Array.isArray(payload.features)) throw new Error('Caltrans CCTV response did not contain a feature array.')

  const seen = new Set()
  const items = payload.features
    .map(normalizeCaltransFeature)
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })

  return {
    items,
    truncated: Boolean(payload.exceededTransferLimit),
  }
}

function cacheKey(bounds) {
  const fingerprint = caltransBoundsFingerprint(bounds)
  return fingerprint ? `${CACHE_PREFIX}${fingerprint}` : null
}

function readCache(bounds) {
  const key = cacheKey(bounds)
  if (!key) return null
  try {
    const raw = storage()?.getItem(key)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (!cached?.savedAt || Date.now() - cached.savedAt > CACHE_TTL_MS || !Array.isArray(cached.items)) return null
    return cached
  } catch {
    return null
  }
}

function writeCache(bounds, result) {
  const key = cacheKey(bounds)
  if (!key) return
  try { storage()?.setItem(key, JSON.stringify({ ...result, savedAt: Date.now() })) } catch { /* optional cache */ }
}

export async function fetchCaltransCctv(bounds, signal, { force = false } = {}) {
  const url = buildCaltransQuery(bounds)
  const fingerprint = caltransBoundsFingerprint(bounds)
  if (!url || !fingerprint) throw new Error('Caltrans camera query requires valid map bounds.')

  if (!force) {
    const cached = readCache(bounds)
    if (cached) return { ...cached, cached: true }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const abortFromOutside = () => controller.abort()
  signal?.addEventListener('abort', abortFromOutside, { once: true })

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`Caltrans CCTV HTTP ${response.status}`)
    const payload = await response.json()
    const parsed = parseCaltransPayload(payload)
    if (parsed.truncated) {
      throw new Error(`Caltrans returned more than ${MAX_RECORDS.toLocaleString()} CCTV records for this view. Zoom in before accepting the dataset; Peekaboo refuses truncated camera results.`)
    }

    const result = {
      items: parsed.items,
      endpoint: CALTRANS_CCTV_ENDPOINT,
      fetchedAt: Date.now(),
      cached: false,
      fingerprint,
      sourceLabel: 'Caltrans CCTV / California Department of Transportation',
    }
    writeCache(bounds, result)
    return result
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    if (controller.signal.aborted) throw new Error('Caltrans CCTV request timed out.')
    throw error
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abortFromOutside)
  }
}
