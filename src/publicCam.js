const MAX_URL_LENGTH = 2048

function normalized(value) {
  return String(value || '').trim().toLowerCase()
}

function isPrivateIpv4(hostname) {
  const parts = hostname.split('.').map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false
  const [a, b] = parts
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  )
}

function isPrivateIpv6(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  return host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe8') || host.startsWith('fe9') || host.startsWith('fea') || host.startsWith('feb')
}

function isLocalHostname(hostname) {
  const host = hostname.toLowerCase()
  return host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || isPrivateIpv4(host) || isPrivateIpv6(host)
}

export function safePublicCamUrl(raw) {
  const value = String(raw || '').trim()
  if (!value || value.length > MAX_URL_LENGTH) return null

  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    if (url.username || url.password) return null
    if (!url.hostname || isLocalHostname(url.hostname)) return null
    return url.toString()
  } catch {
    return null
  }
}

export function mediaKind(url) {
  if (!url) return 'none'
  const pathname = (() => {
    try { return new URL(url).pathname.toLowerCase() } catch { return '' }
  })()
  if (/\.(?:jpe?g|png|webp|gif)$/.test(pathname)) return 'image'
  if (/\.(?:mp4|webm|ogg|ogv)$/.test(pathname)) return 'video'
  if (/\.m3u8$/.test(pathname)) return 'hls'
  return 'page'
}

export function publicCamEvidence(tags = {}) {
  const raw = tags['contact:webcam']
  const url = safePublicCamUrl(raw)
  if (!url) return null

  let hostname = ''
  try { hostname = new URL(url).hostname } catch { hostname = '' }

  return {
    matched: true,
    strength: 'explicit',
    label: 'Explicit OSM public-webcam link',
    basis: `contact:webcam=${raw}`,
    url,
    hostname,
    mediaKind: mediaKind(url),
    inlineEligible: url.startsWith('https://') && ['image', 'video', 'hls'].includes(mediaKind(url)),
  }
}

export function publicCamKind(tags = {}) {
  if (!publicCamEvidence(tags)) return null

  const zone = normalized(tags['surveillance:zone'])
  const surveillance = normalized(tags.surveillance)
  const leisure = normalized(tags.leisure)
  const landuse = normalized(tags.landuse)
  const text = normalized([
    tags.name,
    tags.description,
    tags.note,
    tags.operator,
    zone,
    surveillance,
    leisure,
    landuse,
  ].filter(Boolean).join(' '))

  if (zone === 'traffic' || text.includes('traffic') || text.includes('highway') || text.includes('road conditions')) {
    return { key: 'traffic', label: 'Traffic / road conditions', strength: zone === 'traffic' ? 'explicit' : 'textual' }
  }

  if (
    ['park', 'playground', 'recreation_ground', 'sports_centre'].includes(zone) ||
    ['park', 'playground', 'recreation_ground', 'sports_centre'].includes(leisure) ||
    landuse === 'recreation_ground'
  ) {
    return { key: 'park', label: 'Park / recreation', strength: 'explicit' }
  }

  if (/weather|conditions|snow|surf|wave|beach|harbor|harbour|river|volcano|sky|mountain|storm|tide/.test(text)) {
    return { key: 'weather', label: 'Weather / conditions', strength: 'textual' }
  }

  if (surveillance === 'public' || ['public', 'town', 'street'].includes(zone)) {
    return { key: 'city', label: 'City / public space', strength: 'explicit' }
  }

  return { key: 'webcam', label: 'Public webcam', strength: 'explicit' }
}

export function publicCamSummary(items = []) {
  const counts = { total: 0, inlineEligible: 0, image: 0, video: 0, hls: 0, page: 0 }
  items.forEach((item) => {
    const evidence = publicCamEvidence(item?.tags || {})
    if (!evidence) return
    counts.total += 1
    counts[evidence.mediaKind] = (counts[evidence.mediaKind] || 0) + 1
    if (evidence.inlineEligible) counts.inlineEligible += 1
  })
  return counts
}
