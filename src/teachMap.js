export const LAST_VIEW_KEY = 'peekaboo:last-map:v21'
export const ONBOARDING_KEY = 'peekaboo:onboarding:v21'

export const METRO_HINTS = [
  {
    id: 'caltrans',
    label: 'Caltrans CCTV',
    status: 'IN APP',
    note: 'Official California traffic cameras can be loaded from the Caltrans source layer.',
    region: { west: -124.6, south: 32.3, east: -114.0, north: 42.1 },
  },
  {
    id: 'iowa-dot',
    label: 'Iowa DOT / 511',
    status: 'IN APP',
    note: 'Official Iowa traffic-camera image/video records are available in this region.',
    region: { west: -96.8, south: 40.3, east: -90.0, north: 43.6 },
  },
  {
    id: 'denver-cdot',
    label: 'Denver / CDOT',
    status: 'IN APP',
    note: 'Peekaboo has a CDOT/COtrip-backed public-camera integration for the Denver region.',
    region: { west: -105.35, south: 39.35, east: -104.45, north: 40.15 },
  },
  {
    id: 'chicago-il',
    label: 'Chicago / Illinois',
    status: 'IN APP',
    note: 'Illinois public traffic-camera snapshots are integrated for the Chicago region.',
    region: { west: -88.25, south: 41.35, east: -87.35, north: 42.25 },
  },
  {
    id: 'nyc-511ny',
    label: '511NY',
    status: 'KEY REQUIRED',
    note: 'The documented 511NY camera API requires a developer key. OSM surveillance and public-view sources still work here.',
    region: { west: -74.35, south: 40.45, east: -73.60, north: 41.00 },
  },
  {
    id: 'miami-fl511',
    label: 'FL511',
    status: 'OFFICIAL VIEWER',
    note: 'Florida publishes public traffic cameras, but Peekaboo does not yet have a stable no-secret native camera adapter here.',
    region: { west: -80.65, south: 25.35, east: -79.90, north: 26.25 },
  },
  {
    id: 'detroit-midrive',
    label: 'MDOT Mi Drive',
    status: 'OFFICIAL VIEWER',
    note: 'Michigan publishes public roadway camera viewers; native machine-readable integration is not yet part of Peekaboo.',
    region: { west: -83.65, south: 42.05, east: -82.75, north: 42.75 },
  },
  {
    id: 'tucson-az511',
    label: 'AZ511',
    status: 'KEY REQUIRED',
    note: 'The documented AZ511 camera API requires a developer key. Peekaboo keeps that secret out of the public client.',
    region: { west: -111.35, south: 31.85, east: -110.55, north: 32.65 },
  },
  {
    id: 'austin-drivetexas',
    label: 'DriveTexas',
    status: 'OFFICIAL VIEWER',
    note: 'TxDOT publishes official traveler information, but its documented public API does not provide a native camera feed for Peekaboo.',
    region: { west: -98.10, south: 29.95, east: -97.35, north: 30.70 },
  },
]

export function normalizeSavedView(value) {
  const lat = Number(value?.lat)
  const lon = Number(value?.lon)
  const zoom = Number(value?.zoom)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || !Number.isFinite(zoom)) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  if (zoom < 3 || zoom > 19) return null
  return { lat, lon, zoom }
}

export function readSavedView(storage) {
  try {
    const raw = storage?.getItem(LAST_VIEW_KEY)
    if (!raw) return null
    return normalizeSavedView(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeSavedView(storage, view) {
  const normalized = normalizeSavedView(view)
  if (!normalized) return false
  try {
    storage?.setItem(LAST_VIEW_KEY, JSON.stringify(normalized))
    return true
  } catch {
    return false
  }
}

export function onboardingSeen(storage) {
  try { return storage?.getItem(ONBOARDING_KEY) === 'seen' } catch { return false }
}

export function markOnboardingSeen(storage) {
  try {
    storage?.setItem(ONBOARDING_KEY, 'seen')
    return true
  } catch {
    return false
  }
}

export function hashHasExplicitMap(hash = '') {
  try {
    const params = new URLSearchParams(String(hash).replace(/^#/, ''))
    return Boolean(params.get('map'))
  } catch {
    return false
  }
}

export function pointInRegion(lat, lon, region) {
  return Number.isFinite(lat) && Number.isFinite(lon) &&
    lat >= region.south && lat <= region.north && lon >= region.west && lon <= region.east
}

export function regionalSourceHints(lat, lon, hints = METRO_HINTS) {
  return hints.filter((hint) => pointInRegion(lat, lon, hint.region))
}
