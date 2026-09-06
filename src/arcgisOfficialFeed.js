function finite(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function normalizeEnvelopeBounds(bounds) {
  if (!bounds) return null
  const west = finite(typeof bounds.getWest === 'function' ? bounds.getWest() : bounds.west)
  const south = finite(typeof bounds.getSouth === 'function' ? bounds.getSouth() : bounds.south)
  const east = finite(typeof bounds.getEast === 'function' ? bounds.getEast() : bounds.east)
  const north = finite(typeof bounds.getNorth === 'function' ? bounds.getNorth() : bounds.north)
  if ([west, south, east, north].some((value) => value === null)) return null
  if (west < -180 || east > 180 || south < -90 || north > 90 || west >= east || south >= north) return null
  return { west, south, east, north }
}

export function envelopeFingerprint(bounds, precision = 4) {
  const values = normalizeEnvelopeBounds(bounds)
  if (!values) return null
  return [values.west, values.south, values.east, values.north]
    .map((value) => value.toFixed(precision))
    .join(',')
}

export function buildArcgisEnvelopeQuery({
  endpoint,
  bounds,
  outFields = '*',
  where = '1=1',
  maxRecords = 2000,
  inSR = '4326',
  outSR = '4326',
  extraParams = {},
}) {
  const values = normalizeEnvelopeBounds(bounds)
  if (!values || !endpoint) return null
  const params = new URLSearchParams({
    where,
    outFields: Array.isArray(outFields) ? outFields.join(',') : String(outFields),
    geometry: `${values.west},${values.south},${values.east},${values.north}`,
    geometryType: 'esriGeometryEnvelope',
    inSR: String(inSR),
    spatialRel: 'esriSpatialRelIntersects',
    returnGeometry: 'true',
    outSR: String(outSR),
    resultRecordCount: String(maxRecords),
    f: 'json',
    ...Object.fromEntries(Object.entries(extraParams).map(([key, value]) => [key, String(value)])),
  })
  return `${endpoint}?${params.toString()}`
}

export function parseArcgisFeaturePayload(payload, { sourceLabel = 'ArcGIS source' } = {}) {
  if (payload?.error) {
    const message = payload.error.message || `${sourceLabel} returned an error.`
    const details = Array.isArray(payload.error.details) ? payload.error.details.filter(Boolean).join(' ') : ''
    throw new Error(details ? `${message} ${details}` : message)
  }
  if (!Array.isArray(payload?.features)) throw new Error(`${sourceLabel} response did not contain a feature array.`)
  return {
    features: payload.features,
    truncated: Boolean(payload.exceededTransferLimit),
  }
}

export function coordinatesFromFeature(feature = {}, { latitudeField = 'latitude', longitudeField = 'longitude' } = {}) {
  const attributes = feature.attributes || feature.properties || {}
  const geometry = feature.geometry || {}
  const coordinates = Array.isArray(geometry.coordinates) ? geometry.coordinates : null
  const lon = finite(geometry.x ?? coordinates?.[0] ?? attributes[longitudeField])
  const lat = finite(geometry.y ?? coordinates?.[1] ?? attributes[latitudeField])
  if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  return { lat, lon }
}

export function dedupeById(items = []) {
  const seen = new Set()
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}
