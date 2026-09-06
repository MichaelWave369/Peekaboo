import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import L from 'leaflet'
import {
  CALTRANS_QUICKMAP_URL,
  caltransBoundsFingerprint,
  fetchCaltransCctv,
} from './caltransFeeds.js'
import { getPeekabooMap } from './leafletRegistry.js'

const MAX_MAP_MARKERS = 300

function caltransIcon(cam) {
  const mode = cam.hasStream ? 'stream' : 'snapshot'
  return L.divIcon({
    className: '',
    html: `<div class="caltrans-feed-marker ${mode} ${cam.service?.key || 'unknown'}" aria-label="Caltrans public traffic camera"><span>C</span></div>`,
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

function CaltransDrawer({ cam, onClose }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [streamLoaded, setStreamLoaded] = useState(false)
  const [streamError, setStreamError] = useState(false)
  const [token, setToken] = useState(0)
  const nativeHls = useMemo(supportsNativeHls, [])
  const imageUrl = cam.imageUrl ? addCacheBuster(cam.imageUrl, token) : null
  const inlineStreamSupported = cam.inlineStreamEligible && (cam.streamKind !== 'hls' || nativeHls)

  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
    setStreamLoaded(false)
    setStreamError(false)
    setToken(0)
  }, [cam.id])

  return (
    <aside className="detail-drawer caltrans-feed-drawer open">
      <button className="close-button" onClick={onClose} aria-label="Close Caltrans camera details">×</button>
      <div className="eyebrow">OFFICIAL SOURCE / CALTRANS CCTV</div>
      <h2>{cam.name}</h2>
      <div className={`caltrans-source-pill ${cam.hasStream ? 'stream' : 'snapshot'}`}>
        {cam.hasStream ? 'CALTRANS VIDEO + SNAPSHOT' : 'CALTRANS SNAPSHOT'}
      </div>

      <div className={`caltrans-service-note ${cam.service?.key || 'unknown'}`}>
        <strong>SOURCE SERVICE STATUS</strong>
        <span>{cam.service?.label || 'SERVICE STATUS UNKNOWN'}</span>
        <p>This status is published by Caltrans. It describes the source record and does not independently prove physical camera health.</p>
      </div>

      <div className="official-source-note caltrans-source-note">
        <strong>SOURCE RECEIPT</strong>
        <span>California Department of Transportation / Caltrans CCTV</span>
        <code>ArcGIS FeatureServer object {cam.objectId}</code>
        <p>This is an official transportation-agency camera record. It is separate from OpenStreetMap and excluded from Peekaboo's OSM change ledger.</p>
      </div>

      {cam.hasStream && inlineStreamSupported && !streamLoaded && (
        <button className="caltrans-feed-load stream" type="button" onClick={() => { setStreamError(false); setStreamLoaded(true) }}>
          LOAD CALTRANS VIDEO
        </button>
      )}

      {cam.hasStream && !inlineStreamSupported && (
        <a className="caltrans-feed-open stream" href={cam.streamUrl} target="_blank" rel="noopener noreferrer">
          OPEN CALTRANS VIDEO ↗
        </a>
      )}

      {streamLoaded && !streamError && inlineStreamSupported && (
        <div className="caltrans-feed-media">
          <video
            src={cam.streamUrl}
            controls
            playsInline
            preload="metadata"
            onError={() => setStreamError(true)}
          />
          {cam.streamKind === 'hls' && <small>This browser reports native HLS support. Playback still depends on the current Caltrans stream.</small>}
        </div>
      )}

      {streamError && (
        <div className="official-feed-error" role="alert">
          <strong>CALTRANS VIDEO COULD NOT BE LOADED</strong>
          <span>The published stream may be unavailable or incompatible with this browser. Peekaboo does not guess alternate stream paths.</span>
          <a href={cam.streamUrl} target="_blank" rel="noopener noreferrer">OPEN PUBLISHED STREAM ↗</a>
        </div>
      )}

      {cam.hasImage && cam.inlineImageEligible && !imageLoaded && (
        <button className="caltrans-feed-load image" type="button" onClick={() => { setImageError(false); setImageLoaded(true) }}>
          LOAD CURRENT SNAPSHOT
        </button>
      )}

      {cam.hasImage && !cam.inlineImageEligible && (
        <a className="caltrans-feed-open image" href={cam.imageUrl} target="_blank" rel="noopener noreferrer">
          OPEN CALTRANS SNAPSHOT ↗
        </a>
      )}

      {imageLoaded && !imageError && cam.inlineImageEligible && (
        <div className="caltrans-feed-media">
          <img src={imageUrl} alt={cam.name} onError={() => setImageError(true)} />
          <button type="button" onClick={() => { setImageError(false); setToken(Date.now()) }}>REFRESH SNAPSHOT</button>
        </div>
      )}

      {imageError && (
        <div className="official-feed-error" role="alert">
          <strong>CALTRANS SNAPSHOT COULD NOT BE LOADED</strong>
          <span>The published image may be temporarily unavailable or blocked by the provider. Peekaboo does not probe for replacements.</span>
        </div>
      )}

      <div className="field-list official-feed-fields">
        <div className="field-row"><span>Source</span><strong>Caltrans CCTV</strong></div>
        {cam.route && <div className="field-row"><span>Route</span><strong>{cam.route}</strong></div>}
        {cam.direction && <div className="field-row"><span>Direction</span><strong>{cam.direction}</strong></div>}
        {cam.nearbyPlace && <div className="field-row"><span>Nearby place</span><strong>{cam.nearbyPlace}</strong></div>}
        {cam.county && <div className="field-row"><span>County</span><strong>{cam.county}</strong></div>}
        {cam.district !== null && <div className="field-row"><span>District</span><strong>{cam.district}</strong></div>}
        {cam.imageUpdateFrequency && <div className="field-row"><span>Image refresh field</span><strong>{cam.imageUpdateFrequency}</strong></div>}
        {cam.sourceRecordAt && <div className="field-row"><span>Source record updated</span><strong>{new Date(cam.sourceRecordAt).toLocaleString()}</strong></div>}
        <div className="field-row"><span>Coordinates</span><strong>{cam.lat.toFixed(5)}, {cam.lon.toFixed(5)}</strong></div>
      </div>

      <a className="osm-link official-feed-link" href={CALTRANS_QUICKMAP_URL} target="_blank" rel="noopener noreferrer">OPEN CALTRANS QUICKMAP ↗</a>

      <p className="official-feed-disclaimer">Caltrans publishes recent camera snapshots and, for some cameras, a streaming-video URL. Peekaboo only uses those explicit official URLs. It does not scan cameras, discover exposed devices, or guess alternate feeds.</p>
    </aside>
  )
}

function SourcePanel({ enabled, loading, error, count, streams, snapshots, inService, dirty, sourceInfo, onToggle, onRefresh }) {
  return (
    <section className="panel caltrans-source-panel">
      <div className="panel-heading"><span>OFFICIAL TRAFFIC CAMS</span><span>CALTRANS</span></div>
      <p className="microcopy">Queries the official Caltrans CCTV ArcGIS service for the current map viewport. These cameras are independent of OSM and are not included in the OSM change ledger.</p>
      <div className="official-source-grid caltrans-source-grid">
        <div><span>Current view</span><strong>{dirty ? 'STALE' : count || '—'}</strong></div>
        <div><span>Video URLs</span><strong>{dirty ? '—' : streams}</strong></div>
        <div><span>Snapshots</span><strong>{dirty ? '—' : snapshots}</strong></div>
        <div><span>In service</span><strong>{dirty ? '—' : inService}</strong></div>
      </div>
      {dirty && <div className="caltrans-stale-note"><strong>VIEW MOVED</strong><span>Refresh the current viewport before treating the loaded Caltrans camera count as local.</span></div>}
      {error && <div className="official-source-error"><strong>CALTRANS SOURCE UNAVAILABLE</strong><span>{error}</span></div>}
      {sourceInfo?.fetchedAt && !dirty && <div className="official-source-meta">{sourceInfo.cached ? 'SESSION CACHE' : 'LIVE CALTRANS API'} • {new Date(sourceInfo.fetchedAt).toLocaleTimeString()}</div>}
      <div className="official-source-actions">
        <button type="button" className={enabled ? 'active' : ''} onClick={onToggle}>{dirty && enabled ? 'REFRESH CALTRANS' : enabled ? 'HIDE CALTRANS CAMS' : loading ? 'LOADING CALTRANS…' : 'SHOW CALTRANS CAMS'}</button>
        <button type="button" onClick={onRefresh} disabled={loading}>{loading ? 'REFRESHING…' : 'REFRESH CURRENT VIEW'}</button>
      </div>
      <a href={CALTRANS_QUICKMAP_URL} target="_blank" rel="noopener noreferrer" className="official-source-external">CALTRANS QUICKMAP ↗</a>
    </section>
  )
}

export default function CaltransFeedEnhancer() {
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
        chip = document.getElementById('peekaboo-caltrans-chip-host')
        if (!chip) {
          chip = document.createElement('span')
          chip.id = 'peekaboo-caltrans-chip-host'
          chip.className = 'caltrans-chip-host'
          chips.appendChild(chip)
        }
        setChipHost((current) => current === chip ? current : chip)
      }

      const sidebar = document.querySelector('.sidebar')
      if (sidebar) {
        panel = document.getElementById('peekaboo-caltrans-panel-host')
        if (!panel) {
          panel = document.createElement('div')
          panel.id = 'peekaboo-caltrans-panel-host'
          const official = document.getElementById('peekaboo-official-source-panel-host')
          if (official?.nextSibling) sidebar.insertBefore(panel, official.nextSibling)
          else sidebar.appendChild(panel)
        }
        setPanelHost((current) => current === panel ? current : panel)
      }

      const stage = document.querySelector('.map-stage')
      if (stage) {
        drawer = document.getElementById('peekaboo-caltrans-drawer-host')
        if (!drawer) {
          drawer = document.createElement('div')
          drawer.id = 'peekaboo-caltrans-drawer-host'
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
    return map ? caltransBoundsFingerprint(map.getBounds()) : null
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
      const result = await fetchCaltransCctv(bounds, controller.signal, { force })
      setItems(result.items)
      setSourceInfo(result)
      setSelected(null)
    } catch (err) {
      if (err?.name !== 'AbortError') setError(err?.message || 'Could not load Caltrans public traffic cameras.')
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
    streams: items.filter((item) => item.hasStream).length,
    snapshots: items.filter((item) => item.hasImage).length,
    inService: items.filter((item) => item.service?.key === 'in-service').length,
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
      const marker = L.marker([cam.lat, cam.lon], { icon: caltransIcon(cam), keyboard: true })
      const mode = cam.hasStream ? 'VIDEO' : 'SNAPSHOT'
      marker.bindTooltip(`${cam.name} • CALTRANS ${mode} • ${cam.service.label}`, { direction: 'top', offset: [0, -12] })
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
      if (selected && document.querySelector('.detail-drawer.open:not(.caltrans-feed-drawer)')) setSelected(null)
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
          className={`${enabled ? 'active ' : ''}${dirty ? 'stale ' : ''}caltrans-chip`.trim()}
          aria-pressed={enabled}
          title={dirty ? 'Map moved since the Caltrans query. Refresh the current view.' : 'Official Caltrans public traffic cameras for the current viewport.'}
          onClick={toggle}
        >
          CALTRANS <strong>{loading ? '…' : dirty ? 'REFRESH' : items.length || ''}</strong>
        </button>,
        chipHost,
      )}

      {panelHost && createPortal(
        <SourcePanel
          enabled={enabled}
          loading={loading}
          error={error}
          count={items.length}
          streams={summary.streams}
          snapshots={summary.snapshots}
          inService={summary.inService}
          dirty={dirty}
          sourceInfo={sourceInfo}
          onToggle={toggle}
          onRefresh={() => loadSource(true)}
        />,
        panelHost,
      )}

      {drawerHost && selected && createPortal(<CaltransDrawer cam={selected} onClose={() => setSelected(null)} />, drawerHost)}

      {panelHost && enabled && !dirty && items.length > MAX_MAP_MARKERS && createPortal(
        <div className="official-marker-cap-note">{items.length} Caltrans cameras are in this queried view; only the nearest {MAX_MAP_MARKERS} are rendered. Zoom in and refresh to inspect the rest.</div>,
        panelHost,
      )}
    </>
  )
}
