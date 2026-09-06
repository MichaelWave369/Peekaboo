import { safePublicCamUrl } from './publicCam.js'

export const USGS_ASHCAM_ENDPOINT = 'https://volcview.wr.usgs.gov/ashcam-api/webcamApi/webcams'
export const USGS_ASHCAM_VIEWER = 'https://volcview.wr.usgs.gov/ashcam-gui/webcam.html'

const CACHE_KEY = 'peekaboo:official:usgs-ashcam:v1'
const CACHE_TTL_MS = 10 * 60 * 1000
const REQUEST_TIMEOUT_MS = 12 * 1000

function storage() {
  try { return globalThis.sessionStorage || null } catch { return null }
}

function finiteCoordinate(value, min, max) {
  const number = Number(value)
  return Number.isFinite(number) && number >= min && number <= max ? number : null
}

export function officialFeedFreshness(timestampMs, now = Date.now()) {
  const time = Number(timestampMs)
  if (!Number.isFinite(time) || time <= 0) return { key: 'unknown', label: 'UPDATE TIME UNKNOWN', ageMinutes: null }
  const ageMs = Math.max(0, now - time)
  const ageMinutes = Math.floor(ageMs / 60000)
  if (ageMinutes < 60) return { key: 'fresh', label: '< 1 HOUR', ageMinutes }
  if (ageMinutes < 24 * 60) return { key: 'recent', label: '< 24 HOURS', ageMinutes }
  if (ageMinutes < 7 * 24 * 60) return { key: 'aging', label: '< 7 DAYS', ageMinutes }
  return { key: 'stale', label: '7+ DAYS', ageMinutes }
}

export function normalizeAshcamWebcam(raw = {}, now = Date.now()) {
  const code = String(raw.webcamCode || '').trim()
  const lat = finiteCoordinate(raw.latitude, -90, 90)
  const lon = finiteCoordinate(raw.longitude, -180, 180)
  if (!code || lat === null || lon === null) return null
  // Ashcam occasionally carries placeholder 0,0 records. Do not put those on Null Island.
  if (lat === 0 && lon === 0) return null

  const currentImageUrl = safePublicCamUrl(raw.currentImageUrl)
  if (!currentImageUrl || !currentImageUrl.startsWith('https://')) return null

  const thumbUrl = safePublicCamUrl(raw.currentThumbImageUrl)
  const mediumUrl = safePublicCamUrl(raw.currentMediumImageUrl)
  const externalUrl = safePublicCamUrl(raw.externalUrl)
  const timestampSeconds = Number(raw.lastImageTimestamp || raw.newestImage?.imageTimestamp || 0)
  const timestampMs = Number.isFinite(timestampSeconds) && timestampSeconds > 0 ? timestampSeconds * 1000 : null
  const freshness = officialFeedFreshness(timestampMs, now)

  return {
    id: `official/usgs-ashcam/${code}`,
    sourceClass: 'official-public-feed',
    sourceKey: 'usgs-ashcam',
    sourceLabel: 'USGS Volcano Hazards Program / Ashcam',
    sourceRole: 'official aggregator',
    webcamCode: code,
    name: String(raw.webcamName || code).trim(),
    lat,
    lon,
    elevationM: Number.isFinite(Number(raw.elevationM)) ? Number(raw.elevationM) : null,
    bearingDeg: Number.isFinite(Number(raw.bearingDeg)) ? Number(raw.bearingDeg) : null,
    volcanoName: raw.vName || null,
    volcanoNumber: raw.vnum || null,
    faaIndicator: raw.faaInd || null,
    currentImageUrl,
    mediumImageUrl: mediumUrl?.startsWith('https://') ? mediumUrl : null,
    thumbImageUrl: thumbUrl?.startsWith('https://') ? thumbUrl : null,
    externalUrl,
    lastImageTimestamp: timestampMs,
    lastImageAt: timestampMs ? new Date(timestampMs).toISOString() : null,
    freshness,
    viewerUrl: `${USGS_ASHCAM_VIEWER}?webcam=${encodeURIComponent(code)}`,
  }
}

export function parseAshcamPayload(payload, now = Date.now()) {
  const records = Array.isArray(payload) ? payload : Array.isArray(payload?.webcams) ? payload.webcams : []
  const seen = new Set()
  return records
    .map((record) => normalizeAshcamWebcam(record, now))
    .filter(Boolean)
    .filter((record) => {
      if (seen.has(record.id)) return false
      seen.add(record.id)
      return true
    })
}

function readCache() {
  try {
    const raw = storage()?.getItem(CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (!cached?.savedAt || Date.now() - cached.savedAt > CACHE_TTL_MS || !Array.isArray(cached.items)) return null
    return cached
  } catch {
    return null
  }
}

function writeCache(result) {
  try { storage()?.setItem(CACHE_KEY, JSON.stringify({ ...result, savedAt: Date.now() })) } catch { /* optional cache */ }
}

export async function fetchUsgsAshcam(signal, { force = false } = {}) {
  if (!force) {
    const cached = readCache()
    if (cached) return { ...cached, cached: true }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const abortFromOutside = () => controller.abort()
  signal?.addEventListener('abort', abortFromOutside, { once: true })

  try {
    const response = await fetch(USGS_ASHCAM_ENDPOINT, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`USGS Ashcam HTTP ${response.status}`)
    const payload = await response.json()
    const items = parseAshcamPayload(payload)
    if (!items.length) throw new Error('USGS Ashcam returned no usable public camera records.')
    const result = {
      items,
      endpoint: USGS_ASHCAM_ENDPOINT,
      fetchedAt: Date.now(),
      cached: false,
      sourceLabel: 'USGS Volcano Hazards Program / Ashcam',
    }
    writeCache(result)
    return result
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    if (controller.signal.aborted) throw new Error('USGS Ashcam request timed out.')
    throw error
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abortFromOutside)
  }
}
