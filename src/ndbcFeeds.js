export const NDBC_BUOYCAM_BASE = 'https://www.ndbc.noaa.gov/buoycam.php?station='
export const NDBC_STATION_BASE = 'https://www.ndbc.noaa.gov/station_page.php?station='
export const NDBC_BUOYCAM_MAP = 'https://www.ndbc.noaa.gov/buoycams.shtml'

export const NDBC_BUOYCAMS = [
  { station: '41002', name: 'South Hatteras', detail: '225 NM south of Cape Hatteras', lat: 31.743, lon: -74.955 },
  { station: '41004', name: 'Edisto', detail: '41 NM southeast of Charleston, SC', lat: 32.502, lon: -79.099 },
  { station: '41009', name: 'Canaveral', detail: '20 NM east of Cape Canaveral, FL', lat: 28.508, lon: -80.185 },
  { station: '41010', name: 'Canaveral East', detail: '120 NM east of Cape Canaveral', lat: 28.860, lon: -78.478 },
  { station: '41013', name: 'Frying Pan Shoals', detail: 'off North Carolina', lat: 33.436, lon: -77.764 },
  { station: '41025', name: 'Diamond Shoals', detail: 'off Cape Hatteras, NC', lat: 35.026, lon: -75.380 },
  { station: '41040', name: 'North Equatorial One', detail: 'east of Martinique', lat: 14.568, lon: -53.037 },
  { station: '41041', name: 'North Equatorial Two', detail: 'east of Martinique', lat: 14.259, lon: -46.052 },
  { station: '41043', name: 'NE Puerto Rico', detail: '170 NM NNE of San Juan, PR', lat: 21.090, lon: -64.864 },
  { station: '41044', name: 'NE St Martin', detail: '330 NM northeast of St Martin', lat: 21.582, lon: -58.630 },
  { station: '44013', name: 'Boston', detail: '16 NM east of Boston, MA', lat: 42.346, lon: -70.651 },
]

function validStation(value) {
  const station = String(value || '').trim().toUpperCase()
  return /^[A-Z0-9]{4,8}$/.test(station) ? station : null
}

function finiteCoordinate(value, min, max) {
  const number = Number(value)
  return Number.isFinite(number) && number >= min && number <= max ? number : null
}

export function normalizeNdbcStation(entry = {}) {
  const station = validStation(entry.station)
  const lat = finiteCoordinate(entry.lat, -90, 90)
  const lon = finiteCoordinate(entry.lon, -180, 180)
  if (!station || lat === null || lon === null || !String(entry.name || '').trim()) return null

  return {
    id: `official/ndbc-buoycam/${station}`,
    station,
    name: String(entry.name).trim(),
    detail: String(entry.detail || '').trim() || null,
    lat,
    lon,
    sourceClass: 'government-official',
    sourceKey: 'noaa-ndbc-buoycam',
    sourceLabel: 'NOAA National Data Buoy Center / BuoyCAM',
    imageUrl: `${NDBC_BUOYCAM_BASE}${encodeURIComponent(station)}`,
    stationUrl: `${NDBC_STATION_BASE}${encodeURIComponent(station)}`,
    mapUrl: NDBC_BUOYCAM_MAP,
    media: 'current-image',
    freshnessPolicy: 'ndbc-under-16-hours-or-error',
  }
}

export function ndbcRegistry(entries = NDBC_BUOYCAMS) {
  const seen = new Set()
  return entries
    .map(normalizeNdbcStation)
    .filter(Boolean)
    .filter((station) => {
      if (seen.has(station.station)) return false
      seen.add(station.station)
      return true
    })
}

export function visibleNdbcStations(bounds, entries = ndbcRegistry()) {
  if (!bounds) return entries
  const contains = typeof bounds.contains === 'function'
    ? (entry) => bounds.contains([entry.lat, entry.lon])
    : (entry) => entry.lat >= bounds.south && entry.lat <= bounds.north && entry.lon >= bounds.west && entry.lon <= bounds.east
  return entries.filter(contains)
}

export function ndbcImageUrl(station, token = null) {
  const normalized = validStation(station)
  if (!normalized) return null
  const base = `${NDBC_BUOYCAM_BASE}${encodeURIComponent(normalized)}`
  if (token === null || token === undefined) return base
  return `${base}&peekaboo_frame=${encodeURIComponent(String(token))}`
}
