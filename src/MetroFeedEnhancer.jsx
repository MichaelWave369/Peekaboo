import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import L from 'leaflet'
import { envelopeFingerprint } from './arcgisOfficialFeed.js'
import { getPeekabooMap } from './leafletRegistry.js'
import {
  MAJOR_METRO_COVERAGE,
  fetchCdotCameras,
  fetchIllinoisCameras,
} from './metroFeeds.js'

const MAX_MARKERS = 300

const SOURCE_CONFIGS = [
  {
    key: 'cdot',
    chip: 'DENVER / CDOT',
    short: 'CDOT',
    title: 'Colorado DOT / COtrip',
    sourceDescription: 'Official Colorado transportation-camera data currently exposed through a CDOT-owned GIS test host. Peekaboo treats that machine-readable endpoint as less stable than the public COtrip viewer and keeps the viewer as the authoritative fallback.',
    markerLetter: 'D',
    markerClass: 'denver',
    fetcher: fetchCdotCameras,
    viewerUrl: 'https://www.cotrip.org/',
    viewerLabel: 'OPEN COTRIP',
  },
  {
    key: 'illinois',
    chip: 'CHICAGO / IL',
    short: 'IL CAMS',
    title: 'Illinois public traffic cameras',
    sourceDescription: 'Public Illinois traffic-camera ArcGIS source used for traveler-information snapshots, including the Chicago region. Peekaboo does not infer that every individual record is owned by the same agency.',
    markerLetter: 'C',
    markerClass: 'chicago',
    fetcher: fetchIllinoisCameras,
    viewerUrl: 'https://www.gettingaroundillinois.com/',
    viewerLabel: 'OPEN GETTING AROUND ILLINOIS',
  },
]

function supportsNativeHls() {
  try {
    const video = document.createElement('video')
    return Boolean(video.canPlayType('application/vnd.apple.mpegurl') || video.canPlayType('application/x-mpegURL'))
  } catch {
    return false
  }
}

function markerIcon(source, cam) {
  const stale = cam.tooOld === true || cam.status?.key === 'inactive'
  const stream = cam.hasVideo
  return L.divIcon({
    className: '',
    html: `<div class="metro-feed-marker ${source.markerClass} ${stream ? 'stream' : 'snapshot'} ${stale ? 'source-stale' : ''}" aria-label="${source.title} public traffic camera"><span>${source.markerLetter}</span></div>`,
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

function MetroDrawer({ source, cam, onClose }) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoError, setVideoError] = useState(false)
  const [token, setToken] = useState(0)
  const nativeHls = useMemo(supportsNativeHls, [])

  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
    setVideoLoaded(false)
    setVideoError(false)
    setToken(0)
  }, [cam.id])

  const imageUrl = cam.snapshotUrl || (cam.hasImage ? cam.publishedUrl : null)
  const videoUrl = cam.hasVideo ? cam.publishedUrl : null
  const imageInline = Boolean(cam.inlineEligible && imageUrl && cam.hasImage)
  const videoInline = Boolean(cam.inlineEligible && videoUrl && cam.hasVideo && (cam.mediaKind !== 'hls' || nativeHls))
  const currentImage = imageUrl ? addCacheBuster(imageUrl, token) : null
  const sourceStatus = cam.status?.label || (cam.tooOld === true ? 'SOURCE SAYS IMAGE IS OLD' : cam.tooOld === false ? 'SOURCE DOES NOT FLAG IMAGE AS OLD' : 'SOURCE STATUS UNKNOWN')

  return (
    <aside className={`detail-drawer metro-feed-drawer ${source.markerClass} open`}>
      <button className="close-button" onClick={onClose} aria-label={`Close ${source.title} camera details`}>×</button>
      <div className="eyebrow">OFFICIAL METRO SOURCE / {source.short}</div>
      <h2>{cam.name}</h2>
      <div className={`metro-source-pill ${source.markerClass}`}>{cam.hasVideo ? 'PUBLISHED VIDEO' : cam.hasImage ? 'PUBLIC SNAPSHOT' : 'PUBLIC CAMERA LINK'}</div>

      <div className="metro-source-note">
        <strong>SOURCE RECEIPT</strong>
        <span>{cam.sourceLabel}</span>
        <code>{cam.id}</code>
        <p>{source.sourceDescription} This record remains separate from OpenStreetMap and is excluded from Peekaboo's OSM change ledger.</p>
      </div>

      <div className="metro-status-note">
        <strong>SOURCE STATUS</strong>
        <span>{sourceStatus}</span>
        {cam.ageInMinutes !== null && cam.ageInMinutes !== undefined && <p>Source-reported image age: approximately {cam.ageInMinutes} minute{cam.ageInMinutes === 1 ? '' : 's'}.</p>}
        {cam.warningAge && <p>{cam.warningAge}</p>}
      </div>

      {videoUrl && videoInline && !videoLoaded && (
        <button className="metro-media-load video" type="button" onClick={() => { setVideoError(false); setVideoLoaded(true) }}>LOAD PUBLISHED VIDEO</button>
      )}
      {videoUrl && !videoInline && (
        <a className="metro-media-open video" href={videoUrl} target="_blank" rel="noopener noreferrer">OPEN PUBLISHED VIDEO ↗</a>
      )}
      {videoLoaded && !videoError && videoInline && (
        <div className="metro-media-box">
          <video src={videoUrl} controls playsInline preload="metadata" onError={() => setVideoError(true)} />
          {cam.mediaKind === 'hls' && <small>Native HLS playback is browser-dependent and still depends on the source stream remaining available.</small>}
        </div>
      )}
      {videoError && (
        <div className="official-feed-error" role="alert">
          <strong>PUBLISHED VIDEO COULD NOT BE LOADED</strong>
          <span>The official media URL may be temporarily unavailable or incompatible with this browser. Peekaboo does not derive alternate stream paths.</span>
        </div>
      )}

      {imageUrl && imageInline && !imageLoaded && (
        <button className="metro-media-load image" type="button" onClick={() => { setImageError(false); setImageLoaded(true) }}>LOAD CURRENT SNAPSHOT</button>
      )}
      {imageUrl && !imageInline && (
        <a className="metro-media-open image" href={imageUrl} target="_blank" rel="noopener noreferrer">OPEN PUBLISHED SNAPSHOT ↗</a>
      )}
      {imageLoaded && !imageError && imageInline && (
        <div className="metro-media-box">
          <img src={currentImage} alt={cam.name} onError={() => setImageError(true)} />
          <button type="button" onClick={() => { setImageError(false); setToken(Date.now()) }}>REFRESH SNAPSHOT</button>
        </div>
      )}
      {imageError && (
        <div className="official-feed-error" role="alert">
          <strong>PUBLISHED SNAPSHOT COULD NOT BE LOADED</strong>
          <span>The official image may be temporarily unavailable or blocked by the provider. Peekaboo does not probe for replacements.</span>
        </div>
      )}

      {cam.publishedUrl && !cam.hasImage && !cam.hasVideo && (
        <a className="metro-media-open" href={cam.publishedUrl} target="_blank" rel="noopener noreferrer">OPEN OFFICIAL CAMERA LINK ↗</a>
      )}

      <div className="field-list official-feed-fields">
        <div className="field-row"><span>Source</span><strong>{source.short}</strong></div>
        {cam.road && <div className="field-row"><span>Road</span><strong>{cam.road}</strong></div>}
        {cam.routeId && <div className="field-row"><span>Route ID</span><strong>{cam.routeId}</strong></div>}
        {cam.direction && <div className="field-row"><span>Direction</span><strong>{cam.direction}</strong></div>}
        {cam.mileMarker !== null && cam.mileMarker !== undefined && <div className="field-row"><span>Mile marker</span><strong>{cam.mileMarker}</strong></div>}
        {cam.weatherStation !== null && cam.weatherStation !== undefined && <div className="field-row"><span>Weather-station flag</span><strong>{cam.weatherStation ? 'YES' : 'NO'}</strong></div>}
        <div className="field-row"><span>Coordinates</span><strong>{cam.lat.toFixed(5)}, {cam.lon.toFixed(5)}</strong></div>
      </div>

      <a className="osm-link official-feed-link" href={source.viewerUrl} target="_blank" rel="noopener noreferrer">{source.viewerLabel} ↗</a>
      <p className="official-feed-disclaimer">Only explicit source-published media links are offered. Peekaboo does not scan devices, guess stream paths, bypass authentication, or infer that a source-status field proves physical camera health.</p>
    </aside>
  )
}

function CoveragePanel({ states, onToggleSource, onRefreshSource }) {
  return (
    <section className="panel metro-coverage-panel">
      <div className="panel-heading"><span>MAJOR METROS</span><span>v1.6</span></div>
      <p className="microcopy">Coverage status is explicit: <strong>IN APP</strong> means Peekaboo has a source adapter; <strong>OFFICIAL VIEWER</strong> means the agency publishes cameras but no stable no-secret feed is integrated; <strong>KEY REQUIRED</strong> means the documented camera API requires credentials.</p>

      <div className="metro-source-controls">
        {SOURCE_CONFIGS.map((source) => {
          const state = states[source.key]
          const count = state?.items?.length || 0
          const status = state?.dirty
            ? 'VIEW MOVED'
            : state?.loading
              ? 'LOADING…'
              : `${count} IN QUERY${count > MAX_MARKERS ? ` • ${MAX_MARKERS} RENDERED` : ''}`
          return (
            <div className="metro-source-control" key={source.key}>
              <div><strong>{source.chip}</strong><span>{status}</span></div>
              <button type="button" className={state?.enabled ? 'active' : ''} onClick={() => onToggleSource(source.key)}>{state?.dirty && state?.enabled ? 'REFRESH' : state?.enabled ? 'HIDE' : 'SHOW'}</button>
              <button type="button" onClick={() => onRefreshSource(source.key)} disabled={state?.loading}>↻</button>
            </div>
          )
        })}
      </div>

      <div className="metro-coverage-list">
        {MAJOR_METRO_COVERAGE.map((metro) => (
          <a key={metro.city} href={metro.viewerUrl} target="_blank" rel="noopener noreferrer" className={`metro-coverage-row ${metro.status}`}>
            <span><strong>{metro.city}</strong><small>{metro.region} • {metro.source}</small></span>
            <b>{metro.status === 'in-app' ? 'IN APP' : metro.status === 'key-required' ? 'KEY REQUIRED' : 'OFFICIAL VIEWER'}</b>
          </a>
        ))}
      </div>
      <p className="metro-coverage-note">LA is already covered by Caltrans. Denver and Chicago are integrated here. NYC and Tucson have documented camera APIs but require developer keys. Miami, Detroit and Austin retain direct official-viewer links until a stable public integration contract is available.</p>
    </section>
  )
}

function SourceChip({ source, state, onClick }) {
  return (
    <button
      type="button"
      className={`metro-source-chip ${source.markerClass} ${state.enabled ? 'active' : ''} ${state.dirty ? 'stale' : ''}`.trim()}
      aria-pressed={state.enabled}
      title={state.dirty ? 'Map moved since this source query. Refresh before treating its count as current.' : source.sourceDescription}
      onClick={onClick}
    >
      {source.chip} <strong>{state.loading ? '…' : state.dirty ? 'REFRESH' : state.items.length || ''}</strong>
    </button>
  )
}

function createEmptySourceState() {
  return { enabled: false, items: [], loading: false, error: '', sourceInfo: null, dirty: false }
}

export default function MetroFeedEnhancer() {
  const [map, setMap] = useState(() => getPeekabooMap())
  const [mapTick, setMapTick] = useState(0)
  const [states, setStates] = useState(() => Object.fromEntries(SOURCE_CONFIGS.map((source) => [source.key, createEmptySourceState()])))
  const [selected, setSelected] = useState(null)
  const [chipHost, setChipHost] = useState(null)
  const [panelHost, setPanelHost] = useState(null)
  const [drawerHost, setDrawerHost] = useState(null)
  const layersRef = useRef(new Map())
  const abortRefs = useRef(new Map())

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
    if (!map) return undefined
    SOURCE_CONFIGS.forEach((source) => {
      const layer = L.layerGroup().addTo(map)
      layersRef.current.set(source.key, layer)
    })
    return () => {
      layersRef.current.forEach((layer) => {
        layer.clearLayers()
        map.removeLayer(layer)
      })
      layersRef.current.clear()
    }
  }, [map])

  useEffect(() => () => {
    abortRefs.current.forEach((controller) => controller.abort())
    abortRefs.current.clear()
  }, [])

  useEffect(() => {
    let chips = null
    let panel = null
    let drawer = null
    const attach = () => {
      const chipBar = document.querySelector('.map-filter-chips')
      if (chipBar) {
        chips = document.getElementById('peekaboo-metro-chip-host')
        if (!chips) {
          chips = document.createElement('span')
          chips.id = 'peekaboo-metro-chip-host'
          chips.className = 'metro-chip-host'
          chipBar.appendChild(chips)
        }
        setChipHost((current) => current === chips ? current : chips)
      }

      const sidebar = document.querySelector('.sidebar')
      if (sidebar) {
        panel = document.getElementById('peekaboo-metro-panel-host')
        if (!panel) {
          panel = document.createElement('div')
          panel.id = 'peekaboo-metro-panel-host'
          sidebar.appendChild(panel)
        }
        setPanelHost((current) => current === panel ? current : panel)
      }

      const stage = document.querySelector('.map-stage')
      if (stage) {
        drawer = document.getElementById('peekaboo-metro-drawer-host')
        if (!drawer) {
          drawer = document.createElement('div')
          drawer.id = 'peekaboo-metro-drawer-host'
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
      if (chips?.isConnected) chips.remove()
      if (panel?.isConnected) panel.remove()
      if (drawer?.isConnected) drawer.remove()
    }
  }, [])

  const currentFingerprint = useMemo(() => {
    void mapTick
    return map ? envelopeFingerprint(map.getBounds()) : null
  }, [map, mapTick])

  useEffect(() => {
    setStates((current) => {
      let changed = false
      const next = { ...current }
      SOURCE_CONFIGS.forEach((source) => {
        const state = current[source.key]
        const dirty = Boolean(state.sourceInfo?.fingerprint && currentFingerprint && state.sourceInfo.fingerprint !== currentFingerprint)
        if (dirty !== state.dirty) {
          next[source.key] = { ...state, dirty }
          changed = true
        }
      })
      return changed ? next : current
    })
  }, [currentFingerprint])

  const loadSource = async (sourceKey, force = false) => {
    const source = SOURCE_CONFIGS.find((item) => item.key === sourceKey)
    if (!source || !map) return
    abortRefs.current.get(sourceKey)?.abort()
    const controller = new AbortController()
    abortRefs.current.set(sourceKey, controller)
    setStates((current) => ({ ...current, [sourceKey]: { ...current[sourceKey], loading: true, error: '' } }))
    try {
      const result = await source.fetcher(map.getBounds(), controller.signal, { force })
      setStates((current) => ({
        ...current,
        [sourceKey]: { ...current[sourceKey], items: result.items, sourceInfo: result, loading: false, error: '', dirty: false },
      }))
      setSelected((current) => current?.sourceKey === sourceKey ? null : current)
    } catch (error) {
      if (error?.name !== 'AbortError') {
        setStates((current) => ({ ...current, [sourceKey]: { ...current[sourceKey], loading: false, error: error?.message || `${source.title} unavailable.` } }))
      }
    } finally {
      if (!controller.signal.aborted) abortRefs.current.delete(sourceKey)
    }
  }

  const toggleSource = (sourceKey) => {
    const state = states[sourceKey]
    if (!state) return
    if (state.enabled && state.dirty) {
      loadSource(sourceKey, false)
      return
    }
    const enabled = !state.enabled
    setStates((current) => ({ ...current, [sourceKey]: { ...current[sourceKey], enabled } }))
    if (enabled && (!state.items.length || state.dirty) && !state.loading) loadSource(sourceKey, false)
  }

  useEffect(() => {
    SOURCE_CONFIGS.forEach((source) => {
      const layer = layersRef.current.get(source.key)
      const state = states[source.key]
      if (!layer || !state) return
      layer.clearLayers()
      if (!state.enabled || state.dirty) return

      let records = state.items
      if (records.length > MAX_MARKERS && map) {
        const center = map.getCenter()
        records = [...records]
          .sort((a, b) => ((a.lat - center.lat) ** 2 + (a.lon - center.lng) ** 2) - ((b.lat - center.lat) ** 2 + (b.lon - center.lng) ** 2))
          .slice(0, MAX_MARKERS)
      }

      records.forEach((cam) => {
        const marker = L.marker([cam.lat, cam.lon], { icon: markerIcon(source, cam), keyboard: true })
        const media = cam.hasVideo ? 'VIDEO' : cam.hasImage ? 'SNAPSHOT' : 'PUBLIC LINK'
        marker.bindTooltip(`${cam.name} • ${source.short} • ${media}`, { direction: 'top', offset: [0, -12] })
        marker.on('click', () => {
          document.querySelectorAll('.detail-drawer.open .close-button').forEach((button) => button.click())
          setSelected({ sourceKey: source.key, cam })
        })
        marker.addTo(layer)
      })
    })
  }, [states, map])

  useEffect(() => {
    if (!selected) return
    const state = states[selected.sourceKey]
    if (!state?.enabled || state.dirty || !state.items.some((cam) => cam.id === selected.cam.id)) setSelected(null)
  }, [states, selected])

  const selectedSource = selected ? SOURCE_CONFIGS.find((source) => source.key === selected.sourceKey) : null

  return (
    <>
      {chipHost && createPortal(
        <>{SOURCE_CONFIGS.map((source) => <SourceChip key={source.key} source={source} state={states[source.key]} onClick={() => toggleSource(source.key)} />)}</>,
        chipHost,
      )}

      {panelHost && createPortal(
        <>
          {Object.values(states).some((state) => state.error) && (
            <div className="metro-source-errors">
              {SOURCE_CONFIGS.map((source) => states[source.key].error ? <div key={source.key}><strong>{source.short} SOURCE UNAVAILABLE</strong><span>{states[source.key].error}</span></div> : null)}
            </div>
          )}
          <CoveragePanel states={states} onToggleSource={toggleSource} onRefreshSource={(key) => loadSource(key, true)} />
        </>,
        panelHost,
      )}

      {drawerHost && selected && selectedSource && createPortal(<MetroDrawer source={selectedSource} cam={selected.cam} onClose={() => setSelected(null)} />, drawerHost)}
    </>
  )
}
