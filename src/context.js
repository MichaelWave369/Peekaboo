import { publicCamEvidence, publicCamKind } from './publicCam.js'

export const CONTEXT_META = {
  webcam: {
    label: 'Public live cam',
    shortLabel: 'Live cams',
    glyph: '▶',
    description: 'OSM explicitly publishes a public webcam URL using contact:webcam.',
  },
  weather: {
    label: 'Weather / conditions cam',
    shortLabel: 'Weather',
    glyph: '☁',
    description: 'A public webcam whose OSM description/name suggests weather or current-conditions use.',
  },
  public: {
    label: 'Public space',
    shortLabel: 'Public',
    glyph: 'P',
    description: 'OSM tags explicitly describe publicly accessible or town/street surveillance context.',
  },
  park: {
    label: 'Park / recreation',
    shortLabel: 'Parks',
    glyph: '♧',
    description: 'OSM tags explicitly describe a park, playground, or recreation context.',
  },
}

const evidenceCache = new WeakMap()

function normalized(value) {
  return String(value || '').trim().toLowerCase()
}

function evidence(strength, label, basis) {
  return { strength, label, basis }
}

export function contextEvidence(tags = {}) {
  if (tags && typeof tags === 'object' && evidenceCache.has(tags)) return evidenceCache.get(tags)

  const result = {}
  const surveillance = normalized(tags.surveillance)
  const zone = normalized(tags['surveillance:zone'])
  const leisure = normalized(tags.leisure)
  const landuse = normalized(tags.landuse)
  const location = normalized(tags.location)
  const webcam = publicCamEvidence(tags)

  if (webcam) {
    result.webcam = evidence('explicit', 'Explicit OSM public-webcam link', webcam.basis)
    const kind = publicCamKind(tags)
    if (kind?.key === 'weather') {
      result.weather = evidence('textual', 'Public webcam described as weather / conditions', 'contact:webcam plus OSM name/description context')
    }
  }

  if (surveillance === 'public') {
    result.public = evidence('explicit', 'Explicit OSM public-surveillance claim', 'surveillance=public')
  } else if (zone === 'public') {
    result.public = evidence('zone', 'OSM public-zone claim', 'surveillance:zone=public')
  } else if (zone === 'town' || zone === 'street') {
    result.public = evidence('zone', 'OSM town/street surveillance-zone claim', `surveillance:zone=${zone}`)
  }

  const parkZones = new Set(['park', 'playground', 'recreation_ground', 'sports_centre'])
  if (parkZones.has(zone)) {
    result.park = evidence('explicit', 'Explicit OSM surveillance-zone recreation claim', `surveillance:zone=${zone}`)
  } else if (parkZones.has(leisure)) {
    result.park = evidence('explicit', 'Explicit OSM leisure-context claim on this record', `leisure=${leisure}`)
  } else if (landuse === 'recreation_ground') {
    result.park = evidence('explicit', 'Explicit OSM recreation land-use claim on this record', 'landuse=recreation_ground')
  } else if (parkZones.has(location)) {
    result.park = evidence('explicit', 'Explicit OSM location-context claim on this record', `location=${location}`)
  }

  if (tags && typeof tags === 'object') evidenceCache.set(tags, result)
  return result
}

export function hasContext(item, key) {
  return Boolean(contextEvidence(item?.tags || {})[key])
}

export function matchesContextFilters(item, filters = {}) {
  const active = Object.entries(filters)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => key)
  if (!active.length) return true
  return active.some((key) => hasContext(item, key))
}

export function contextSummary(items = []) {
  const counts = Object.fromEntries(Object.keys(CONTEXT_META).map((key) => [key, 0]))
  items.forEach((item) => {
    const matched = contextEvidence(item?.tags || {})
    Object.keys(matched).forEach((key) => {
      if (Object.hasOwn(counts, key)) counts[key] += 1
    })
  })
  return counts
}
