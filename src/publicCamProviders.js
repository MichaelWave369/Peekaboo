const PROVIDERS = [
  {
    id: 'nevada-511',
    name: 'Nevada 511',
    hosts: new Set(['nvroads.com', 'www.nvroads.com']),
    officialDirectoryUrl: 'https://www.nvroads.com/cctv',
    currentPath: /^\/cctv(?:\/|$)/i,
    note: 'Nevada DOT currently publishes its public traffic-camera directory at /cctv.',
  },
]

function normalizedHost(hostname) {
  return String(hostname || '').trim().toLowerCase()
}

export function publicCamProvider(url) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  const provider = PROVIDERS.find((entry) => entry.hosts.has(normalizedHost(parsed.hostname)))
  if (!provider) return null

  const currentRoute = provider.currentPath.test(parsed.pathname)
  return {
    id: provider.id,
    name: provider.name,
    officialDirectoryUrl: provider.officialDirectoryUrl,
    publishedRouteCurrent: currentRoute,
    publishedRouteStatus: currentRoute ? 'known-current-route' : 'legacy-or-unverified-route',
    recommendedUrl: currentRoute ? parsed.toString() : provider.officialDirectoryUrl,
    note: provider.note,
  }
}

export function providerFallbackFor(url) {
  const provider = publicCamProvider(url)
  if (!provider || provider.publishedRouteCurrent) return null
  return {
    providerId: provider.id,
    providerName: provider.name,
    url: provider.officialDirectoryUrl,
    label: `OPEN CURRENT ${provider.name.toUpperCase()} CAMERAS`,
    reason: 'The OSM-published provider URL does not use the provider’s current documented camera-directory route.',
  }
}
