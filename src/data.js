const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

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
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return [element.lat, element.lon]
  }
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
  }
}

export function buildOverpassQuery(bounds) {
  const south = bounds.getSouth().toFixed(6)
  const west = bounds.getWest().toFixed(6)
  const north = bounds.getNorth().toFixed(6)
  const east = bounds.getEast().toFixed(6)
  const bbox = `${south},${west},${north},${east}`
  return `[out:json][timeout:25];\n(\n  nwr[\"man_made\"=\"surveillance\"](${bbox});\n  nwr[\"surveillance:type\"](${bbox});\n);\nout center tags;`
}

export async function fetchSurveillance(bounds, signal) {
  const query = buildOverpassQuery(bounds)
  const body = new URLSearchParams({ data: query })
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body,
    signal,
  })
  if (!response.ok) {
    throw new Error(`Overpass returned HTTP ${response.status}`)
  }
  const json = await response.json()
  const seen = new Set()
  return (json.elements || [])
    .map(normalizeElement)
    .filter(Boolean)
    .filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
}

export function boundsAreaKm2(bounds) {
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
