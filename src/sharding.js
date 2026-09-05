function readBound(bounds, method, key) {
  if (bounds && typeof bounds[method] === 'function') return Number(bounds[method]())
  return Number(bounds?.[key])
}

export function plainBounds(bounds) {
  const south = readBound(bounds, 'getSouth', 'south')
  const west = readBound(bounds, 'getWest', 'west')
  const north = readBound(bounds, 'getNorth', 'north')
  const east = readBound(bounds, 'getEast', 'east')
  if (![south, west, north, east].every(Number.isFinite)) throw new Error('Invalid bounds for sharding.')
  if (south > north || west > east) throw new Error('Inverted bounds for sharding.')
  return { south, west, north, east }
}

export function boundsAdapter(bounds) {
  const value = plainBounds(bounds)
  return {
    ...value,
    getSouth: () => value.south,
    getWest: () => value.west,
    getNorth: () => value.north,
    getEast: () => value.east,
  }
}

export function splitBoundsIntoQuadrants(bounds) {
  const { south, west, north, east } = plainBounds(bounds)
  const midLat = south + (north - south) / 2
  const midLon = west + (east - west) / 2
  return [
    { id: 'NW', south: midLat, west, north, east: midLon },
    { id: 'NE', south: midLat, west: midLon, north, east },
    { id: 'SW', south, west, north: midLat, east: midLon },
    { id: 'SE', south, west: midLon, north: midLat, east },
  ]
}

export function isShardableOverpassFailure(message) {
  const text = String(message || '').toLowerCase()
  return [
    'timed out',
    'timeout',
    'runtime error',
    'out of memory',
    'too many requests',
    'http 429',
    'http 502',
    'http 503',
    'http 504',
  ].some((needle) => text.includes(needle))
}

export function combineCompleteShardResults(results, options = {}) {
  const expectedShardCount = options.expectedShardCount ?? 4
  const maxItems = options.maxItems ?? 6000
  if (!Array.isArray(results) || results.length !== expectedShardCount) {
    throw new Error(`Incomplete shard scan: expected ${expectedShardCount} successful shards, received ${Array.isArray(results) ? results.length : 0}.`)
  }

  const byId = new Map()
  results.forEach((result, index) => {
    if (!result?.complete || !Array.isArray(result.items)) {
      throw new Error(`Incomplete shard scan: shard ${index + 1} was not marked complete.`)
    }
    result.items.forEach((item) => {
      if (item?.id && !byId.has(item.id)) byId.set(item.id, item)
    })
  })

  const items = [...byId.values()]
  if (items.length > maxItems) {
    throw new Error(`Merged shard result contains ${items.length.toLocaleString()} objects; zoom in to keep browser rendering bounded.`)
  }
  return items
}
