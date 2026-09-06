import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import L from 'leaflet'
import { fetchUsgsAshcam, officialFeedFreshness, USGS_ASHCAM_VIEWER } from './officialFeeds.js'
import { getPeekabooMap } from './leafletRegistry.js'

const MAX_MAP_MARKERS = 250

function officialIcon(freshness) {
  return L.divIcon({
    className: '',
    html: `<div class="official-feed-marker ${freshness?.key || 'unknown'}" aria-label="USGS public camera"><span>U</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

function freshnessSummary(items) {
  const counts = { fresh: 0, recent: 0, aging: 0, stale: 0, unknown: 0 }
  items.forEach((item) => {
    const freshness = officialFeedFreshness(item.lastImageTimestamp)
    counts[freshness.key] = (counts[freshness.key] || 0) + 1
  })
  return counts
}

function addCacheBuster(url, token) {
  try {
    const next = new URL(url)
    next.searchParams.set('peekaboo_frame', String(token))
    return next.toString()
  } catch {
    return url
  }
}

function OfficialFeedDrawer({ cam, onClose }) {
  const [loaded, setLoaded] = useState(false)
  const [mediaError, setMediaError] = useState(false)
  const [token, setToken] = useState(0)
  const freshness = officialFeedFreshness(cam.lastImageTimestamp)
  const imageUrl = addCacheBuster(cam.mediumImageUrl || cam.currentImageUrl, token)

  useEffect(() => {
    setLoaded(false)
    setMediaError(false)
    setToken(0)
  }, [cam.id])

  return (
    <aside className="detail-drawer official-feed-drawer open">
      <button className="close-button" onClick={onClose} aria-label="Close official camera details">×</button>
      <div className="eyebrow">OFFICIAL SOURCE / USGS ASHCAM</div>
      <h2>{cam.name}</h2>
      <div className="official-source-pill">USGS CURRENT IMAGE</div>

      <div className={`official-freshness ${freshness.key}`}>
        <strong>IMAGE FRESHNESS</strong>
        <span>{freshness.label}</span>
        <p>{cam.lastImageAt ? `Latest image timestamp reported by Ashcam: ${new Date(cam.lastImageAt).toLocaleString()}.` : 'Ashcam did not provide a usable image timestamp.'}</p>
      </div>

      <div className="official-source-note">
        <strong>SOURCE RECEIPT</strong>
        <span>USGS Volcano Hazards Program / Ashcam</span>
        <code>{cam.webcamCode}</code>
        <p>This is an official public-source camera record mirrored or published through USGS Ashcam. It is separate from OpenStreetMap and excluded from Peekaboo's OSM change ledger.</p>
      </div>

      {!loaded && (
        <button className="official-feed-load" type="button" onClick={() => { setMediaError(false); setLoaded(true) }}>
          LOAD CURRENT USGS IMAGE
        </button>
      )}

      {loaded && !mediaError && (
        <div className="official-feed-media">
          <img src={imageUrl} alt={cam.name} onError={() => setMediaError(true)} />
          <button type="button" onClick={() => { setMediaError(false); setToken(Date.now()) }}>REFRESH CURRENT IMAGE</button>
        </div>
      )}

      {mediaError && (
        <div className="official-feed-error" role="alert">
          <strong>CURRENT IMAGE COULD NOT BE LOADED</strong>
          <span>The USGS-hosted image may be temporarily unavailable. Peekaboo does not guess alternate image or stream paths.</span>
        </div>
      )}

      <div className="field-list official-feed-fields">
        <div className="field-row"><span>Source</span><strong>USGS Ashcam</strong></div>
        <div className="field-row"><span>Camera code</span><strong>{cam.webcamCode}</strong></div>
        {cam.volcanoName && <div className="field-row"><span>Volcano</span><strong>{cam.volcanoName}</strong></div>}
        {cam.bearingDeg !== null && <div className="field-row"><span>Bearing</span><strong>{cam.bearingDeg}°</strong></div>}
        <div className="field-row"><span>Coordinates</span><strong>{cam.lat.toFixed(5)}, {cam.lon.toFixed(5)}</strong></div>
      </div>

      <a className="osm-link official-feed-link" href={cam.viewerUrl} target="_blank" rel="noopener noreferrer">OPEN USGS ASHCAM HISTORY ↗</a>
      {cam.externalUrl && <a className="osm-link secondary-link official-feed-link" href={cam.externalUrl} target="_blank" rel="noopener noreferrer">OPEN ORIGINAL PROVIDER ↗</a>}

      <p className="official-feed-disclaimer">Ashcam's current image is a near-real-time public snapshot, not necessarily continuous video. Freshness describes the timestamp supplied by the official source, not physical camera health.</p>
    </aside>
  )
}

function OfficialSourcePanel({ enabled, loading, error, allCount, visible, fetchedAt, cached, summary, onToggle, onRefresh }) {
  return (
    <section className="panel official-source-panel">
      <div className="panel-heading"><span>OFFICIAL PUBLIC CAMS</span><span>USGS</span></div>
      <p className="microcopy">Adds public current-image cameras from the USGS Volcano Hazards Program Ashcam service. This source is independent of OSM and is not included in the OSM change ledger.</p>
      <div className="official-source-grid">
        <div><span>Current view</span><strong>{visible}</strong></div>
        <div><span>Loaded source</span><strong>{allCount || '—'}</strong></div>
        <div><span>&lt; 1 hour</span><strong>{summary.fresh}</strong></div>
        <div><span>&lt; 24 hours</span><strong>{summary.recent}</strong></div>
      </div>
      {error && <div className="official-source-error"><strong>USGS SOURCE UNAVAILABLE</strong><span>{error}</span></div>}
      {fetchedAt && <div className="official-source-meta">{cached ? 'SESSION CACHE' : 'LIVE USGS API'} • {new Date(fetchedAt).toLocaleTimeString()}</div>}
      <div className="official-source-actions">
        <button type="button" className={enabled ? 'active' : ''} onClick={onToggle}>{enabled ? 'HIDE USGS CAMS' : loading ? 'LOADING USGS…' : 'SHOW USGS CAMS'}</button>
        <button type="button" onClick={onRefresh} disabled={loading}>{loading ? 'REFRESHING…' : 'REFRESH SOURCE'}</button>
      </div>
      <a href={USGS_ASHCAM_VIEWER} target="_blank" rel="noopener noreferrer" className="official-source-external">USGS ASHCAM ↗</a>
    </section>
  )
}

export default function OfficialFeedEnhancer() {
  const [map, setMap] = useState(() => getPeekabooMap())
  const [enabled, setEnabled] = useState(false)
  const [allCams, setAllCams] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sourceInfo, setSourceInfo] = useState(null)
  const [selected, setSelected] = useState(null)
  const [mapTick, setMapTick] = useState(0)
  const [chipHost, setChipHost] = useState(null)
  const [panelHost, setPanelHost] = useState(null)
  const [drawerHost, setDrawerHost] = useState(null)
  const layerRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    const receiveMap = () => setMap(getPeekabooMap())
    receiveMap()
    window.addEventListener('peekaboo:leaflet-map-ready', receiveMap)
    return () => window.removeEventListener('peekaboo:leaflet-map-ready', receiveMap)
  }, [])

  useEffect(() => {
    if (!map) return undefined
    const update = () => setMapTick((value) => value + 1)
    map.on('moveend zoomend', update)
    return () => map.off('moveend zoomend', update)
  }, [map])

  useEffect(() => {
    let chip = null
    let panel = null
    let drawer = null

    const attach = () => {
      const chips = document.querySelector('.map-filter-chips')
      if (chips) {
        chip = document.getElementById('peekaboo-official-cam-chip-host')
        if (!chip) {
          chip = document.createElement('span')
          chip.id = 'peekaboo-official-cam-chip-host'
          chip.className = 'official-cam-chip-host'
          chips.appendChild(chip)
        }
        setChipHost((current) => current === chip ? current : chip)
      }

      const sidebar = document.querySelector('.sidebar')
      if (sidebar) {
        panel = document.getElementById('peekaboo-official-source-panel-host')
        if (!panel) {
          panel = document.createElement('div')
          panel.id = 'peekaboo-official-source-panel-host'
          const release = sidebar.querySelector('.release-panel')
          if (release?.nextSibling) sidebar.insertBefore(panel, release.nextSibling)
          else sidebar.appendChild(panel)
        }
        setPanelHost((current) => current === panel ? current : panel)
      }

      const stage = document.querySelector('.map-stage')
      if (stage) {
        drawer = document.getElementById('peekaboo-official-feed-drawer-host')
        if (!drawer) {
          drawer = document.createElement('div')
          drawer.id = 'peekaboo-official-feed-drawer-host'
          stage.appendChild(drawer)
        }
        setDrawerHost((current) => current === drawer ? current : drawer)
      }
    }

    attach()
    const observer = new MutationObserver(attach)
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      if (chip?.isConnected) chip.remove()
      if (panel?.isConnected) panel.remove()
      if (drawer?.isConnected) drawer.remove()
    }
  }, [])

  const loadSource = async (force = false) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError('')
    try {
      const result = await fetchUsgsAshcam(controller.signal, { force })
      setAllCams(result.items)
      setSourceInfo(result)
    } catch (err) {
      if (err?.name !== 'AbortError') setError(err?.message || 'Could not load USGS Ashcam public cameras.')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  useEffect(() => () => abortRef.current?.abort(), [])

  const visibleCams = useMemo(() => {
    void mapTick
    if (!map || !allCams.length) return []
    const bounds = map.getBounds()
    return allCams.filter((cam) => bounds.contains([cam.lat, cam.lon]))
  }, [map, allCams, mapTick])

  const markerCams = useMemo(() => {
    if (!map || visibleCams.length <= MAX_MAP_MARKERS) return visibleCams
    const center = map.getCenter()
    return [...visibleCams]
      .sort((a, b) => ((a.lat - center.lat) ** 2 + (a.lon - center.lng) ** 2) - ((b.lat - center.lat) ** 2 + (b.lon - center.lng) ** 2))
      .slice(0, MAX_MAP_MARKERS)
  }, [map, visibleCams])

  const visibleSummary = useMemo(() => freshnessSummary(visibleCams), [visibleCams])

  useEffect(() => {
    if (!map) return undefined
    const layer = L.layerGroup().addTo(map)
    layerRef.current = layer
    return () => {
      layer.clearLayers()
      map.removeLayer(layer)
      layerRef.current = null
    }
  }, [map])

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) return
    layer.clearLayers()
    if (!enabled) return

    markerCams.forEach((cam) => {
      const freshness = officialFeedFreshness(cam.lastImageTimestamp)
      const marker = L.marker([cam.lat, cam.lon], { icon: officialIcon(freshness), keyboard: true })
      marker.bindTooltip(`${cam.name} • USGS • ${freshness.label}`, { direction: 'top', offset: [0, -12] })
      marker.on('click', () => {
        document.querySelector('.detail-drawer.open:not(.official-feed-drawer) .close-button')?.click()
        setSelected(cam)
      })
      marker.addTo(layer)
    })
  }, [enabled, markerCams])

  useEffect(() => {
    if (selected && (!enabled || !visibleCams.some((cam) => cam.id === selected.id))) setSelected(null)
  }, [enabled, visibleCams, selected])

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (selected && document.querySelector('.detail-drawer.open:not(.official-feed-drawer)')) setSelected(null)
    })
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [selected])

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    if (next && !allCams.length && !loading) loadSource(false)
  }

  return (
    <>
      {chipHost && createPortal(
        <button
          type="button"
          className={enabled ? 'active official-usgs-chip' : 'official-usgs-chip'}
          aria-pressed={enabled}
          title="Official public current-image cameras from USGS Ashcam. Separate from OSM."
          onClick={toggle}
        >
          USGS CAMS <strong>{loading ? '…' : allCams.length ? visibleCams.length : ''}</strong>
        </button>,
        chipHost,
      )}

      {panelHost && createPortal(
        <OfficialSourcePanel
          enabled={enabled}
          loading={loading}
          error={error}
          allCount={allCams.length}
          visible={visibleCams.length}
          fetchedAt={sourceInfo?.fetchedAt}
          cached={sourceInfo?.cached}
          summary={visibleSummary}
          onToggle={toggle}
          onRefresh={() => loadSource(true)}
        />,
        panelHost,
      )}

      {drawerHost && selected && createPortal(<OfficialFeedDrawer cam={selected} onClose={() => setSelected(null)} />, drawerHost)}

      {panelHost && enabled && visibleCams.length > MAX_MAP_MARKERS && createPortal(
        <div className="official-marker-cap-note">{visibleCams.length} USGS cameras are in view; only the nearest {MAX_MAP_MARKERS} are rendered. Zoom in to inspect the rest.</div>,
        panelHost,
      )}
    </>
  )
}
