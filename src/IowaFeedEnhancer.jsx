import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import L from 'leaflet'
import {
  fetchIowaDotCameras,
  IOWA_511_URL,
  IOWA_DOT_FEEDS_URL,
  iowaBoundsFingerprint,
} from './iowaFeeds.js'
import { getPeekabooMap } from './leafletRegistry.js'

const MAX_MAP_MARKERS = 300

function iowaIcon(cam) {
  const mode = cam.hasVideo ? 'video' : 'snapshot'
  return L.divIcon({
    className: '',
    html: `<div class="iowa-feed-marker ${mode}" aria-label="Iowa DOT public traffic camera"><span>I</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
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

function supportsNativeHls() {
  try {
    const video = document.createElement('video')
    return Boolean(video.canPlayType('application/vnd.apple.mpegurl') || video.canPlayType('application/x-mpegURL'))
  } catch {
    return false
  }
}

function recordingLabel(value) {
  if (value === true) return 'SOURCE SAYS RECORDING CAPABLE'
  if (value === false) return 'SOURCE SAYS NOT RECORDED'
  return 'RECORDING FIELD UNKNOWN'
}

function IowaDrawer({ cam, onClose }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [token, setToken] = useState(0)
  const nativeHls = useMemo(supportsNativeHls, [])
  const imageUrl = cam.imageUrl ? addCacheBuster(cam.imageUrl, token) : null
  const inlineVideoSupported = cam.inlineVideoEligible && (cam.videoKind !== 'hls' || nativeHls)

  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
    setVideoLoaded(false)
    setVideoError(false)
    setToken(0)
  }, [cam.id])

  return (
    <aside className="detail-drawer iowa-feed-drawer open">
      <button className="close-button" onClick={onClose} aria-label="Close Iowa DOT camera details">×</button>
      <div className="eyebrow">OFFICIAL SOURCE / IOWA DOT 511</div>
      <h2>{cam.name}</h2>
      <div className={`iowa-source-pill ${cam.hasVideo ? 'video' : 'snapshot'}`}>
        {cam.hasVideo ? 'IOWA DOT VIDEO + IMAGE' : 'IOWA DOT IMAGE'}
      </div>

      <div className="iowa-source-note">
        <strong>SOURCE RECEIPT</strong>
        <span>Iowa Department of Transportation / Iowa 511</span>
        <code>ArcGIS FeatureServer FID {cam.fid}</code>
        <p>Iowa DOT publishes this traffic-camera record through its credential-free 511 GIS data feed. It is separate from OpenStreetMap and excluded from Peekaboo's OSM change ledger.</p>
      </div>

      <div className="iowa-recording-note">
        <strong>RECORDING FIELD</strong>
        <span>{recordingLabel(cam.recorded)}</span>
        <p>This is the public source field, not a claim by Peekaboo about current recording, retention, or camera health.</p>
      </div>

      {cam.hasVideo && inlineVideoSupported && !videoLoaded && (
        <button className="iowa-feed-load video" type="button" onClick={() => { setVideoError(false); setVideoLoaded(true) }}>
          LOAD IOWA DOT VIDEO
        </button>
      )}

      {cam.hasVideo && !inlineVideoSupported && (
        <a className="iowa-feed-open video" href={cam.videoUrl} target="_blank" rel="noopener noreferrer">
          OPEN IOWA DOT VIDEO ↗
        </a>
      )}

      {videoLoaded && !videoError && inlineVideoSupported && (
        <div className="iowa-feed-media">
          <video src={cam.videoUrl} controls playsInline preload="metadata" onError={() => setVideoError(true)} />
          {cam.videoKind === 'hls' && <small>This browser reports native HLS support. Playback still depends on the current Iowa DOT stream.</small>}
        </div>
      )}

      {videoError && (
        <div className="official-feed-error" role="alert">
          <strong>IOWA DOT VIDEO COULD NOT BE LOADED</strong>
          <span>The published stream may be unavailable or incompatible with this browser. Peekaboo does not guess alternate stream paths.</span>
          <a href={cam.videoUrl} target="_blank" rel="noopener noreferrer">OPEN PUBLISHED VIDEO ↗</a>
        </div>
      )}

      {cam.hasImage && cam.inlineImageEligible && !imageLoaded && (
        <button className="iowa-feed-load image" type="button" onClick={() => { setImageError(false); setImageLoaded(true) }}>
          LOAD CURRENT CAMERA IMAGE
        </button>
      )}

      {cam.hasImage && !cam.inlineImageEligible && (
        <a className="iowa-feed-open image" href={cam.imageUrl} target="_blank" rel="noopener noreferrer">
          OPEN IOWA DOT IMAGE ↗
        </a>
      )}

      {imageLoaded && !imageError && cam.inlineImageEligible && (
        <div className="iowa-feed-media">
          <img src={imageUrl} alt={cam.name} onError={() => setImageError(true)} />
          <button type="button" onClick={() => { setImageError(false); setToken(Date.now()) }}>REFRESH CAMERA IMAGE</button>
        </div>
      )}

      {imageError && (
        <div className="official-feed-error" role="alert">
          <strong>IOWA DOT IMAGE COULD NOT BE LOADED</strong>
          <span>The published image may be temporarily unavailable or blocked by the provider. Peekaboo does not probe for replacements.</span>
        </div>
      )}

      <div className="field-list official-feed-fields">
        <div className="field-row"><span>Source</span><strong>Iowa DOT / Iowa 511</strong></div>
        {cam.commonId && <div className="field-row"><span>Common camera ID</span><strong>{cam.commonId}</strong></div>}
        {cam.route && <div className="field-row"><span>Route</span><strong>{cam.route}</strong></div>}
        {cam.region && <div className="field-row"><span>Region</span><strong>{cam.region}</strong></div>}
        {cam.organization && <div className="field-row"><span>Organization</span><strong>{cam.organization}</strong></div>}
        {cam.type && <div className="field-row"><span>Type</span><strong>{cam.type}</strong></div>}
        {cam.function && <div className="field-row"><span>Function</span><strong>{cam.function}</strong></div>}
        <div className="field-row"><span>Coordinates</span><strong>{cam.lat.toFixed(5)}, {cam.lon.toFixed(5)}</strong></div>
      </div>

      <a className="osm-link official-feed-link" href={IOWA_511_URL} target="_blank" rel="noopener noreferrer">OPEN IOWA 511 ↗</a>
      <a className="osm-link secondary-link official-feed-link" href={IOWA_DOT_FEEDS_URL} target="_blank" rel="noopener noreferrer">IOWA DOT DATA FEEDS ↗</a>

      <p className="official-feed-disclaimer">Iowa DOT publishes camera images and video URLs through its public 511 data feeds. Peekaboo uses only those explicit public fields and does not scan cameras, derive stream paths, or bypass access controls.</p>
    </aside>
  )
}

function SourcePanel({ enabled, loading, error, count, videos, images, recorded, dirty, sourceInfo, onToggle, onRefresh }) {
  return (
    <section className="panel iowa-source-panel">
      <div className="panel-heading"><span>OFFICIAL TRAFFIC CAMS</span><span>IOWA DOT</span></div>
      <p className="microcopy">Queries Iowa DOT's credential-free 511 ArcGIS camera feed for the current map viewport. These records are independent of OSM and are not included in the OSM change ledger.</p>
      <div className="official-source-grid iowa-source-grid">
        <div><span>Current view</span><strong>{dirty ? 'STALE' : count || '—'}</strong></div>
        <div><span>Video URLs</span><strong>{dirty ? '—' : videos}</strong></div>
        <div><span>Images</span><strong>{dirty ? '—' : images}</strong></div>
        <div><span>Recorded = yes</span><strong>{dirty ? '—' : recorded}</strong></div>
      </div>
      {dirty && <div className="iowa-stale-note"><strong>VIEW MOVED</strong><span>Refresh the current viewport before treating the loaded Iowa DOT camera count as local.</span></div>}
      {error && <div className="official-source-error"><strong>IOWA DOT SOURCE UNAVAILABLE</strong><span>{error}</span></div>}
      {sourceInfo?.fetchedAt && !dirty && <div className="official-source-meta">{sourceInfo.cached ? 'SESSION CACHE' : 'LIVE IOWA DOT API'} • {new Date(sourceInfo.fetchedAt).toLocaleTimeString()}</div>}
      <div className="official-source-actions">
        <button type="button" className={enabled ? 'active' : ''} onClick={onToggle}>{dirty && enabled ? 'REFRESH IOWA DOT' : enabled ? 'HIDE IOWA DOT CAMS' : loading ? 'LOADING IOWA…' : 'SHOW IOWA DOT CAMS'}</button>
        <button type="button" onClick={onRefresh} disabled={loading}>{loading ? 'REFRESHING…' : 'REFRESH CURRENT VIEW'}</button>
      </div>
      <a href={IOWA_DOT_FEEDS_URL} target="_blank" rel="noopener noreferrer" className="official-source-external">IOWA DOT 511 DATA FEEDS ↗</a>
    </section>
  )
}

export default function IowaFeedEnhancer() {
  const [map, setMap] = useState(() => getPeekabooMap())
  const [enabled, setEnabled] = useState(false)
  const [items, setItems] = useState([])
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
        chip = document.getElementById('peekaboo-iowa-chip-host')
        if (!chip) {
          chip = document.createElement('span')
          chip.id = 'peekaboo-iowa-chip-host'
          chip.className = 'iowa-chip-host'
          chips.appendChild(chip)
        }
        setChipHost((current) => current === chip ? current : chip)
      }

      const sidebar = document.querySelector('.sidebar')
      if (sidebar) {
        panel = document.getElementById('peekaboo-iowa-panel-host')
        if (!panel) {
          panel = document.createElement('div')
          panel.id = 'peekaboo-iowa-panel-host'
          const caltrans = document.getElementById('peekaboo-caltrans-panel-host')
          if (caltrans?.nextSibling) sidebar.insertBefore(panel, caltrans.nextSibling)
          else sidebar.appendChild(panel)
        }
        setPanelHost((current) => current === panel ? current : panel)
      }

      const stage = document.querySelector('.map-stage')
      if (stage) {
        drawer = document.getElementById('peekaboo-iowa-drawer-host')
        if (!drawer) {
          drawer = document.createElement('div')
          drawer.id = 'peekaboo-iowa-drawer-host'
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

  const currentFingerprint = useMemo(() => {
    void mapTick
    return map ? iowaBoundsFingerprint(map.getBounds()) : null
  }, [map, mapTick])
  const dirty = Boolean(sourceInfo?.fingerprint && currentFingerprint && sourceInfo.fingerprint !== currentFingerprint)

  const loadSource = async (force = false) => {
    if (!map) return
    const bounds = map.getBounds()
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError('')
    try {
      const result = await fetchIowaDotCameras(bounds, controller.signal, { force })
      setItems(result.items)
      setSourceInfo(result)
      setSelected(null)
    } catch (err) {
      if (err?.name !== 'AbortError') setError(err?.message || 'Could not load Iowa DOT public traffic cameras.')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  useEffect(() => () => abortRef.current?.abort(), [])

  const renderedItems = useMemo(() => {
    if (!enabled || dirty) return []
    if (!map || items.length <= MAX_MAP_MARKERS) return items
    const center = map.getCenter()
    return [...items]
      .sort((a, b) => ((a.lat - center.lat) ** 2 + (a.lon - center.lng) ** 2) - ((b.lat - center.lat) ** 2 + (b.lon - center.lng) ** 2))
      .slice(0, MAX_MAP_MARKERS)
  }, [enabled, dirty, map, items])

  const summary = useMemo(() => ({
    videos: items.filter((item) => item.hasVideo).length,
    images: items.filter((item) => item.hasImage).length,
    recorded: items.filter((item) => item.recorded === true).length,
  }), [items])

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
    if (!enabled || dirty) return

    renderedItems.forEach((cam) => {
      const marker = L.marker([cam.lat, cam.lon], { icon: iowaIcon(cam), keyboard: true })
      const mode = cam.hasVideo ? 'VIDEO' : 'IMAGE'
      marker.bindTooltip(`${cam.name} • IOWA DOT ${mode}`, { direction: 'top', offset: [0, -12] })
      marker.on('click', () => {
        document.querySelectorAll('.detail-drawer.open .close-button').forEach((button) => button.click())
        setSelected(cam)
      })
      marker.addTo(layer)
    })
  }, [enabled, dirty, renderedItems])

  useEffect(() => {
    if (selected && (!enabled || dirty || !items.some((cam) => cam.id === selected.id))) setSelected(null)
  }, [enabled, dirty, items, selected])

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (selected && document.querySelector('.detail-drawer.open:not(.iowa-feed-drawer)')) setSelected(null)
    })
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [selected])

  const toggle = () => {
    if (enabled && dirty) {
      loadSource(false)
      return
    }
    const next = !enabled
    setEnabled(next)
    if (next && (!items.length || dirty) && !loading) loadSource(false)
  }

  return (
    <>
      {chipHost && createPortal(
        <button
          type="button"
          className={`${enabled ? 'active ' : ''}${dirty ? 'stale ' : ''}iowa-chip`.trim()}
          aria-pressed={enabled}
          title={dirty ? 'Map moved since the Iowa DOT query. Refresh the current view.' : 'Official Iowa DOT / Iowa 511 traffic cameras for the current viewport.'}
          onClick={toggle}
        >
          IOWA DOT <strong>{loading ? '…' : dirty ? 'REFRESH' : items.length || ''}</strong>
        </button>,
        chipHost,
      )}

      {panelHost && createPortal(
        <SourcePanel
          enabled={enabled}
          loading={loading}
          error={error}
          count={items.length}
          videos={summary.videos}
          images={summary.images}
          recorded={summary.recorded}
          dirty={dirty}
          sourceInfo={sourceInfo}
          onToggle={toggle}
          onRefresh={() => loadSource(true)}
        />,
        panelHost,
      )}

      {drawerHost && selected && createPortal(<IowaDrawer cam={selected} onClose={() => setSelected(null)} />, drawerHost)}

      {panelHost && enabled && !dirty && items.length > MAX_MAP_MARKERS && createPortal(
        <div className="official-marker-cap-note">{items.length} Iowa DOT cameras are in this queried view; only the nearest {MAX_MAP_MARKERS} are rendered. Zoom in and refresh to inspect the rest.</div>,
        panelHost,
      )}
    </>
  )
}
