import { mediaKind, safePublicCamUrl } from './publicCam.js'
import {
  buildArcgisEnvelopeQuery,
  coordinatesFromFeature,
  dedupeById,
  envelopeFingerprint,
  parseArcgisFeaturePayload,
} from './arcgisOfficialFeed.js'

export const IOWA_DOT_CCTV_ENDPOINT = 'https://services.arcgis.com/8lRhdTsQyJpO52F1/arcgis/rest/services/Traffic_Cameras_View/FeatureServer/0/query'
export const IOWA_511_URL = 'https://511ia.org/'
export const IOWA_DOT_FEEDS_URL = 'https://iowadot.gov/travel-tools/iowa-511/511-data-feeds'

const CACHE_PREFIX = 'peekaboo:official:iowa-dot:v1:'
const CACHE_TTL_MS = 2 * 60 * 1000
const REQUEST_TIMEOUT_MS = 12 * 1000
const MAX_RECORDS = 2000
const OUT_FIELDS = [
  'FID',
  'device_id',
  'Desc_',
  'UpdateDate',
  'UpdateTime',
  'UTCoffset',
  'linear_reference',
  'Route',
  'ImageName',
  'ImageURL',
  'VideoURL',
  'ORG',
  'latitude',
  'longitude',
  'Type',
  'REGION',
  'RECORDED',
  'COMMON_ID',
  'FUNCTION',
]

function storage() {
  try { return globalThis.sessionStorage || null } catch { return null }
}

function clean(value) {
  const text = String(value ?? '').trim()
  return text || null
}

function booleanClaim(value) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (['y', 'yes', 'true', '1'].includes(raw)) return true
  if (['n', 'no', 'false', '0'].includes(raw)) return false
  return null
}

export function iowaBoundsFingerprint(bounds) {
  return envelopeFingerprint(bounds)
}

export function buildIowaCameraQuery(bounds) {
  return buildArcgisEnvelopeQuery({
    endpoint: IOWA_DOT_CCTV_ENDPOINT,
    bounds,
    outFields: OUT_FIELDS,
    maxRecords: MAX_RECORDS,
  })
}

export function normalizeIowaCamera(feature = {}) {
  const attributes = feature.attributes || feature.properties || {}
  const coords = coordinatesFromFeature(feature)
  const fid = attributes.FID ?? attributes.device_id
  if (!coords || fid === null || fid === undefined || fid === '') return null

  const imageUrl = safePublicCamUrl(attributes.ImageURL)
  const videoUrl = safePublicCamUrl(attributes.VideoURL)
  if (!imageUrl && !videoUrl) return null

  const videoKind = mediaKind(videoUrl)
  const recorded = booleanClaim(attributes.RECORDED)
  const name = clean(attributes.ImageName) || clean(attributes.Desc_) || clean(attributes.COMMON_ID) || `Iowa DOT Camera ${fid}`

  return {
    id: `official/iowa-dot-cctv/${fid}`,
    sourceClass: 'official-public-feed',
    sourceKey: 'iowa-dot-cctv',
    sourceLabel: 'Iowa Department of Transportation / Iowa 511',
    sourceRole: 'official transportation agency',
    fid: String(fid),
    deviceId: attributes.device_id ?? null,
    name,
    description: clean(attributes.Desc_),
    lat: coords.lat,
    lon: coords.lon,
    route: clean(attributes.Route),
    organization: clean(attributes.ORG),
    region: clean(attributes.REGION),
    type: clean(attributes.Type),
    function: clean(attributes.FUNCTION),
    commonId: clean(attributes.COMMON_ID),
    recorded,
    updateDateRaw: attributes.UpdateDate ?? null,
    updateTimeRaw: attributes.UpdateTime ?? null,
    utcOffsetRaw: attributes.UTCoffset ?? null,
    imageUrl,
    videoUrl,
    videoKind,
    hasImage: Boolean(imageUrl),
    hasVideo: Boolean(videoUrl),
    inlineImageEligible: Boolean(imageUrl?.startsWith('https://') && mediaKind(imageUrl) === 'image'),
    inlineVideoEligible: Boolean(videoUrl?.startsWith('https://') && ['video', 'hls'].includes(videoKind)),
    iowa511Url: IOWA_511_URL,
    feedsUrl: IOWA_DOT_FEEDS_URL,
  }
}

export function parseIowaCameraPayload(payload = {}) {
  const parsed = parseArcgisFeaturePayload(payload, { sourceLabel: 'Iowa DOT traffic-camera source' })
  const items = dedupeById(parsed.features.map(normalizeIowaCamera).filter(Boolean))
  return { items, truncated: parsed.truncated }
}

function cacheKey(bounds) {
  const fingerprint = iowaBoundsFingerprint(bounds)
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

export async function fetchIowaDotCameras(bounds, signal, { force = false } = {}) {
  const url = buildIowaCameraQuery(bounds)
  const fingerprint = iowaBoundsFingerprint(bounds)
  if (!url || !fingerprint) throw new Error('Iowa DOT camera query requires valid map bounds.')

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
    if (!response.ok) throw new Error(`Iowa DOT cameras HTTP ${response.status}`)
    const payload = await response.json()
    const parsed = parseIowaCameraPayload(payload)
    if (parsed.truncated) {
      throw new Error(`Iowa DOT returned more than ${MAX_RECORDS.toLocaleString()} camera records for this view. Zoom in before accepting the dataset; Peekaboo refuses truncated camera results.`)
    }

    const result = {
      items: parsed.items,
      endpoint: IOWA_DOT_CCTV_ENDPOINT,
      fetchedAt: Date.now(),
      cached: false,
      fingerprint,
      sourceLabel: 'Iowa Department of Transportation / Iowa 511',
    }
    writeCache(bounds, result)
    return result
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    if (controller.signal.aborted) throw new Error('Iowa DOT camera request timed out.')
    throw error
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abortFromOutside)
  }
}
