import { mediaKind, safePublicCamUrl } from './publicCam.js'
import {
  buildArcgisEnvelopeQuery,
  coordinatesFromFeature,
  dedupeById,
  envelopeFingerprint,
  parseArcgisFeaturePayload,
} from './arcgisOfficialFeed.js'

export const CDOT_CAMERA_ENDPOINT = 'https://test.maps.codot.gov/server/rest/services/Hosted/CDOT_Streaming_Cameras/FeatureServer/0/query'
export const CDOT_VIEWER_URL = 'https://www.cotrip.org/'
export const ILLINOIS_CAMERA_ENDPOINT = 'https://services2.arcgis.com/aIrBD8yn1TDTEXoz/arcgis/rest/services/TrafficCamerasTM_Public/FeatureServer/0/query'
export const ILLINOIS_VIEWER_URL = 'https://www.gettingaroundillinois.com/'

const REQUEST_TIMEOUT_MS = 12 * 1000
const CACHE_TTL_MS = 2 * 60 * 1000
const MAX_RECORDS = 2000

const CDOT_FIELDS = [
  'objectid',
  'camera_name',
  'description',
  'type',
  'url',
  'latitude',
  'longitude',
  'cameraid',
  'status',
  'isweatherstation',
  'source',
  'roadname',
  'milemarker',
  'routeid',
]

const ILLINOIS_FIELDS = [
  'OBJECTID',
  'ImgPath',
  'CameraLocation',
  'CameraDirection',
  'y',
  'x',
  'SnapShot',
  'WarningAge',
  'TooOld',
  'AgeInMinutes',
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

function integerOrNull(value) {
  const number = Number.parseInt(String(value ?? '').trim(), 10)
  return Number.isFinite(number) ? number : null
}

function genericStatus(value) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw) return { key: 'unknown', label: 'STATUS UNKNOWN' }
  if (/(active|enabled|online|operational|working|available|ok)/.test(raw) && !/(inactive|disabled|offline|unavailable|not working)/.test(raw)) {
    return { key: 'active', label: 'SOURCE SAYS ACTIVE' }
  }
  if (/(inactive|disabled|offline|unavailable|out of service|not working)/.test(raw)) {
    return { key: 'inactive', label: 'SOURCE SAYS INACTIVE' }
  }
  return { key: 'unknown', label: String(value).trim().toUpperCase() || 'STATUS UNKNOWN' }
}

function cacheKey(prefix, bounds) {
  const fingerprint = envelopeFingerprint(bounds)
  return fingerprint ? `${prefix}${fingerprint}` : null
}

function readCache(prefix, bounds) {
  const key = cacheKey(prefix, bounds)
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

function writeCache(prefix, bounds, result) {
  const key = cacheKey(prefix, bounds)
  if (!key) return
  try { storage()?.setItem(key, JSON.stringify({ ...result, savedAt: Date.now() })) } catch { /* optional cache */ }
}

async function fetchArcgisSource({ endpoint, bounds, signal, force, fields, sourceLabel, cachePrefix, normalize }) {
  const url = buildArcgisEnvelopeQuery({ endpoint, bounds, outFields: fields, maxRecords: MAX_RECORDS })
  const fingerprint = envelopeFingerprint(bounds)
  if (!url || !fingerprint) throw new Error(`${sourceLabel} query requires valid map bounds.`)

  if (!force) {
    const cached = readCache(cachePrefix, bounds)
    if (cached) return { ...cached, cached: true }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const abortFromOutside = () => controller.abort()
  signal?.addEventListener('abort', abortFromOutside, { once: true })

  try {
    const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' }, signal: controller.signal })
    if (!response.ok) throw new Error(`${sourceLabel} HTTP ${response.status}`)
    const payload = await response.json()
    const parsed = parseArcgisFeaturePayload(payload, { sourceLabel })
    if (parsed.truncated) {
      throw new Error(`${sourceLabel} returned more than ${MAX_RECORDS.toLocaleString()} records for this view. Zoom in before accepting the dataset; Peekaboo refuses truncated camera results.`)
    }
    const items = dedupeById(parsed.features.map(normalize).filter(Boolean))
    const result = { items, endpoint, fetchedAt: Date.now(), cached: false, fingerprint, sourceLabel }
    writeCache(cachePrefix, bounds, result)
    return result
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    if (controller.signal.aborted) throw new Error(`${sourceLabel} request timed out.`)
    throw error
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abortFromOutside)
  }
}

export function normalizeCdotCamera(feature = {}) {
  const attributes = feature.attributes || feature.properties || {}
  const coords = coordinatesFromFeature(feature)
  const objectId = attributes.objectid ?? attributes.cameraid
  if (!coords || objectId === null || objectId === undefined || objectId === '') return null

  const publishedUrl = safePublicCamUrl(attributes.url)
  if (!publishedUrl) return null
  const kind = mediaKind(publishedUrl)
  const weatherStation = booleanClaim(attributes.isweatherstation)

  return {
    id: `official/cdot-streaming/${objectId}`,
    sourceClass: 'official-public-feed',
    sourceKey: 'cdot-streaming-cameras',
    sourceLabel: 'Colorado Department of Transportation / COtrip',
    sourceRole: 'official transportation agency',
    objectId: String(objectId),
    cameraId: attributes.cameraid ?? null,
    name: clean(attributes.camera_name) || clean(attributes.description) || `CDOT Camera ${objectId}`,
    description: clean(attributes.description),
    lat: coords.lat,
    lon: coords.lon,
    road: clean(attributes.roadname),
    routeId: clean(attributes.routeid),
    mileMarker: attributes.milemarker ?? null,
    sourceSystem: clean(attributes.source),
    type: clean(attributes.type),
    weatherStation,
    status: genericStatus(attributes.status),
    publishedUrl,
    mediaKind: kind,
    hasImage: kind === 'image',
    hasVideo: ['video', 'hls'].includes(kind),
    inlineEligible: Boolean(publishedUrl.startsWith('https://') && ['image', 'video', 'hls'].includes(kind)),
    viewerUrl: CDOT_VIEWER_URL,
    sourceEndpointClass: 'official-cdot-gis-test-host',
  }
}

export function normalizeIllinoisCamera(feature = {}) {
  const attributes = feature.attributes || feature.properties || {}
  const coords = coordinatesFromFeature(feature, { latitudeField: 'y', longitudeField: 'x' })
  const objectId = attributes.OBJECTID
  if (!coords || objectId === null || objectId === undefined || objectId === '') return null

  const snapshotUrl = safePublicCamUrl(attributes.SnapShot)
  const publishedUrl = safePublicCamUrl(attributes.ImgPath)
  if (!snapshotUrl && !publishedUrl) return null
  const ageInMinutes = integerOrNull(attributes.AgeInMinutes)
  const tooOld = booleanClaim(attributes.TooOld)

  return {
    id: `official/illinois-dot-cctv/${objectId}`,
    sourceClass: 'official-public-feed',
    sourceKey: 'illinois-public-traffic-cameras',
    sourceLabel: 'Illinois public traffic-camera ArcGIS service',
    sourceRole: 'public transportation camera service',
    objectId: String(objectId),
    name: clean(attributes.CameraLocation) || `Illinois Traffic Camera ${objectId}`,
    direction: clean(attributes.CameraDirection),
    lat: coords.lat,
    lon: coords.lon,
    snapshotUrl,
    publishedUrl,
    hasImage: Boolean(snapshotUrl),
    hasVideo: false,
    inlineEligible: Boolean(snapshotUrl?.startsWith('https://') && mediaKind(snapshotUrl) === 'image'),
    warningAge: clean(attributes.WarningAge),
    tooOld,
    ageInMinutes,
    viewerUrl: ILLINOIS_VIEWER_URL,
  }
}

export function parseCdotPayload(payload = {}) {
  const parsed = parseArcgisFeaturePayload(payload, { sourceLabel: 'CDOT streaming-camera source' })
  return { items: dedupeById(parsed.features.map(normalizeCdotCamera).filter(Boolean)), truncated: parsed.truncated }
}

export function parseIllinoisPayload(payload = {}) {
  const parsed = parseArcgisFeaturePayload(payload, { sourceLabel: 'Illinois public traffic-camera source' })
  return { items: dedupeById(parsed.features.map(normalizeIllinoisCamera).filter(Boolean)), truncated: parsed.truncated }
}

export function buildCdotQuery(bounds) {
  return buildArcgisEnvelopeQuery({ endpoint: CDOT_CAMERA_ENDPOINT, bounds, outFields: CDOT_FIELDS, maxRecords: MAX_RECORDS })
}

export function buildIllinoisQuery(bounds) {
  return buildArcgisEnvelopeQuery({ endpoint: ILLINOIS_CAMERA_ENDPOINT, bounds, outFields: ILLINOIS_FIELDS, maxRecords: MAX_RECORDS })
}

export function fetchCdotCameras(bounds, signal, { force = false } = {}) {
  return fetchArcgisSource({ endpoint: CDOT_CAMERA_ENDPOINT, bounds, signal, force, fields: CDOT_FIELDS, sourceLabel: 'CDOT streaming-camera source', cachePrefix: 'peekaboo:official:cdot:v1:', normalize: normalizeCdotCamera })
}

export function fetchIllinoisCameras(bounds, signal, { force = false } = {}) {
  return fetchArcgisSource({ endpoint: ILLINOIS_CAMERA_ENDPOINT, bounds, signal, force, fields: ILLINOIS_FIELDS, sourceLabel: 'Illinois public traffic-camera source', cachePrefix: 'peekaboo:official:illinois:v1:', normalize: normalizeIllinoisCamera })
}

export const MAJOR_METRO_COVERAGE = [
  { city: 'Los Angeles', region: 'CA', status: 'in-app', source: 'Caltrans CCTV', viewerUrl: 'https://quickmap.dot.ca.gov/' },
  { city: 'Denver', region: 'CO', status: 'in-app', source: 'CDOT / COtrip', viewerUrl: CDOT_VIEWER_URL },
  { city: 'Chicago', region: 'IL', status: 'in-app', source: 'Illinois public traffic cameras', viewerUrl: ILLINOIS_VIEWER_URL },
  { city: 'New York City', region: 'NY', status: 'key-required', source: '511NY', viewerUrl: 'https://www.511ny.org/cctv' },
  { city: 'Miami', region: 'FL', status: 'official-viewer', source: 'FL511', viewerUrl: 'https://www.fl511.com/cctv' },
  { city: 'Detroit', region: 'MI', status: 'official-viewer', source: 'MDOT Mi Drive', viewerUrl: 'https://mdotjboss.state.mi.us/MiDrive/cameras' },
  { city: 'Tucson', region: 'AZ', status: 'key-required', source: 'AZ511', viewerUrl: 'https://www.az511.gov/cctv' },
  { city: 'Austin', region: 'TX', status: 'official-viewer', source: 'TxDOT / DriveTexas', viewerUrl: 'https://www.txdot.gov/discover/live-traffic-cameras.html' },
]
