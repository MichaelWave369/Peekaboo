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
    'http 502',
    'http 503',
    'http 504',
  ].some((needle) => text.includes(needle))
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((key) => value[key] !== undefined)
        .map((key) => [key, canonicalValue(value[key])]),
    )
  }
  return value
}

export function canonicalRecordString(record) {
  return JSON.stringify(canonicalValue(record))
}

function recordReceipt(record, shardId) {
  return {
    shard: shardId || null,
    id: record?.id || null,
    version: record?.version ?? null,
    timestamp: record?.timestamp ?? null,
    changeset: record?.changeset ?? null,
    lat: record?.lat ?? null,
    lon: record?.lon ?? null,
  }
}

function consistencyError(id, first, second, firstShard, secondShard) {
  const error = new Error(
    `Shard consistency conflict for ${id}: overlapping shard results returned different payloads. No merged dataset was accepted.`,
  )
  error.code = 'SHARD_CONSISTENCY_CONFLICT'
  error.conflict = {
    id,
    first: recordReceipt(first, firstShard),
    second: recordReceipt(second, secondShard),
  }
  return error
}

export function combineCompleteShardResults(results, options = {}) {
  const expectedShardCount = options.expectedShardCount ?? 4
  const maxItems = options.maxItems ?? 6000
  if (!Array.isArray(results) || results.length !== expectedShardCount) {
    throw new Error(`Incomplete shard scan: expected ${expectedShardCount} successful shards, received ${Array.isArray(results) ? results.length : 0}.`)
  }

  const byId = new Map()
  const canonicalById = new Map()
  const shardById = new Map()

  results.forEach((result, index) => {
    if (!result?.complete || !Array.isArray(result.items)) {
      throw new Error(`Incomplete shard scan: shard ${index + 1} was not marked complete.`)
    }
    const shardId = result.id || `shard-${index + 1}`

    result.items.forEach((item) => {
      if (!item?.id) return
      const canonical = canonicalRecordString(item)
      if (!byId.has(item.id)) {
        byId.set(item.id, item)
        canonicalById.set(item.id, canonical)
        shardById.set(item.id, shardId)
        return
      }

      if (canonicalById.get(item.id) !== canonical) {
        throw consistencyError(item.id, byId.get(item.id), item, shardById.get(item.id), shardId)
      }
    })
  })

  const items = [...byId.values()]
  if (items.length > maxItems) {
    throw new Error(`Merged shard result contains ${items.length.toLocaleString()} objects; zoom in to keep browser rendering bounded.`)
  }
  return items
}
