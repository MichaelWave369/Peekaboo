const EARTH_RADIUS_M = 6378137
const TILE_SIZE = 256

function safeText(value) {
  return String(value ?? '').trim()
}

function present(value, missingValues = []) {
  const text = safeText(value)
  if (!text) return false
  const lowered = text.toLowerCase()
  return !missingValues.includes(lowered)
}

export function metadataProfile(item = {}) {
  const checks = [
    ['source identity', Boolean(item.osmType && item.osmId !== null && item.osmId !== undefined), 15],
    ['classification', present(item.category, ['other']), 15],
    ['record timestamp', present(item.timestamp), 10],
    ['observed zone', present(item.zone, ['unspecified']), 10],
    ['operator', present(item.operator, ['unknown']), 10],
    ['camera type', present(item.cameraType, ['unspecified']), 10],
    ['direction', present(item.direction), 10],
    ['manufacturer', present(item.manufacturer), 10],
    ['model', present(item.model), 10],
  ]

  const score = checks.reduce((sum, [, ok, weight]) => sum + (ok ? weight : 0), 0)
  const missing = checks.filter(([, ok]) => !ok).map(([label]) => label)
  let level = 'low'
  let label = 'LOW DETAIL'
  if (score >= 75) {
    level = 'high'
    label = 'HIGH DETAIL'
  } else if (score >= 45) {
    level = 'medium'
    label = 'MEDIUM DETAIL'
  }

  const notes = []
  if (item.category === 'other') notes.push('classification is generic')
  if (item.vendorEvidence?.strength === 'legacy') notes.push('vendor attribution uses legacy/alternate OSM evidence')
  if (item.vendorEvidence?.strength === 'textual') notes.push('vendor attribution is textual OSM evidence')

  return { score, level, label, missing, notes }
}

export function metadataSummary(items = []) {
  const summary = { high: 0, medium: 0, low: 0, averageScore: 0 }
  if (!items.length) return summary
  let total = 0
  items.forEach((item) => {
    const profile = metadataProfile(item)
    summary[profile.level] += 1
    total += profile.score
  })
  summary.averageScore = Math.round(total / items.length)
  return summary
}

function worldPixel(lat, lon, zoom) {
  const size = TILE_SIZE * (2 ** zoom)
  const x = ((lon + 180) / 360) * size
  const boundedLat = Math.max(-85.05112878, Math.min(85.05112878, lat))
  const sin = Math.sin((boundedLat * Math.PI) / 180)
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size
  return [x, y]
}

export function clusterRecords(items = [], zoom = 13, options = {}) {
  const threshold = options.threshold ?? 120
  const minClusterSize = options.minClusterSize ?? 2
  if (items.length < threshold || zoom >= 18) {
    return items.map((item) => ({ kind: 'record', id: item.id, item, lat: item.lat, lon: item.lon, count: 1 }))
  }

  const cellPx = options.cellPx ?? (zoom <= 10 ? 64 : zoom <= 13 ? 52 : zoom <= 15 ? 44 : 36)
  const buckets = new Map()

  items.forEach((item) => {
    const [x, y] = worldPixel(item.lat, item.lon, zoom)
    const key = `${Math.floor(x / cellPx)}:${Math.floor(y / cellPx)}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(item)
  })

  const rendered = []
  for (const [key, group] of buckets) {
    if (group.length < minClusterSize) {
      group.forEach((item) => rendered.push({ kind: 'record', id: item.id, item, lat: item.lat, lon: item.lon, count: 1 }))
      continue
    }

    const categories = {}
    let lat = 0
    let lon = 0
    group.forEach((item) => {
      lat += item.lat
      lon += item.lon
      categories[item.category] = (categories[item.category] || 0) + 1
    })
    rendered.push({
      kind: 'cluster',
      id: `cluster:${zoom}:${key}`,
      lat: lat / group.length,
      lon: lon / group.length,
      count: group.length,
      categories,
      items: group,
    })
  }

  return rendered
}

function mercatorMeters(lat, lon) {
  const boundedLat = Math.max(-85.05112878, Math.min(85.05112878, lat))
  const x = EARTH_RADIUS_M * lon * Math.PI / 180
  const y = EARTH_RADIUS_M * Math.log(Math.tan(Math.PI / 4 + boundedLat * Math.PI / 360))
  return [x, y]
}

export function proximityDiagnostics(items = [], thresholdMeters = 12) {
  const cellSize = Math.max(1, thresholdMeters)
  const buckets = new Map()
  const points = new Map()

  items.forEach((item) => {
    const [x, y] = mercatorMeters(item.lat, item.lon)
    const gx = Math.floor(x / cellSize)
    const gy = Math.floor(y / cellSize)
    points.set(item.id, { item, x, y, gx, gy })
    const key = `${gx}:${gy}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(item.id)
  })

  const neighbors = new Map(items.map((item) => [item.id, []]))
  const pairs = []
  const seenPairs = new Set()

  for (const [id, point] of points) {
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const candidates = buckets.get(`${point.gx + dx}:${point.gy + dy}`) || []
        for (const otherId of candidates) {
          if (otherId === id) continue
          const pairKey = id < otherId ? `${id}|${otherId}` : `${otherId}|${id}`
          if (seenPairs.has(pairKey)) continue
          const other = points.get(otherId)
          const distance = Math.hypot(point.x - other.x, point.y - other.y)
          if (distance <= thresholdMeters) {
            seenPairs.add(pairKey)
            pairs.push({ a: id, b: otherId, distanceMeters: Math.round(distance * 10) / 10 })
            neighbors.get(id).push({ id: otherId, distanceMeters: distance })
            neighbors.get(otherId).push({ id, distanceMeters: distance })
          }
        }
      }
    }
  }

  let recordsWithNeighbors = 0
  neighbors.forEach((list) => { if (list.length) recordsWithNeighbors += 1 })
  return { thresholdMeters, pairCount: pairs.length, recordsWithNeighbors, neighbors, pairs }
}

export function diagnosticsManifest(items = [], query = {}) {
  const metadata = metadataSummary(items)
  const proximity = proximityDiagnostics(items)
  return {
    metadataDetail: metadata,
    proximity: {
      thresholdMeters: proximity.thresholdMeters,
      pairCount: proximity.pairCount,
      recordsWithNeighbors: proximity.recordsWithNeighbors,
      interpretation: 'Co-located mapped-record candidates only. These are not automatically duplicates.',
    },
    rendering: {
      filteredRecordCount: items.length,
      zoom: query.zoom ?? null,
    },
  }
}
