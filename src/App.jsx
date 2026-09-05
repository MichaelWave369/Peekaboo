import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import {
  boundsAreaKm2,
  boundsFingerprint,
  CATEGORY_META,
  fetchSurveillance,
  mappingSignal,
  toGeoJSON,
} from './data.js'

const START = [40.7128, -74.006]
const START_ZOOM = 13
const MAX_AREA_KM2 = 2500

function defaultFilters() {
  return Object.fromEntries(Object.keys(CATEGORY_META).map((key) => [key, true]))
}

function parseInitialState() {
  const fallback = { center: START, zoom: START_ZOOM, filters: defaultFilters() }
  try {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const map = params.get('map')
    const layers = params.get('layers')
    const next = { ...fallback, filters: defaultFilters() }

    if (map) {
      const [zoomRaw, latRaw, lonRaw] = map.split('/')
      const zoom = Number(zoomRaw)
      const lat = Number(latRaw)
      const lon = Number(lonRaw)
      if (Number.isFinite(zoom) && Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        next.center = [lat, lon]
        next.zoom = Math.min(19, Math.max(3, zoom))
      }
    }

    if (layers !== null) {
      const active = new Set(layers.split(',').filter(Boolean))
      next.filters = Object.fromEntries(Object.keys(CATEGORY_META).map((key) => [key, active.has(key)]))
    }
    return next
  } catch {
    return fallback
  }
}

function makeMarkerIcon(category, selected) {
  const meta = CATEGORY_META[category] || CATEGORY_META.other
  return L.divIcon({
    className: '',
    html: `<div class="map-marker ${category} ${selected ? 'selected' : ''}" aria-label="${meta.label}"><span>${meta.glyph}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

function MapBridge({ onView, onScan, request }) {
  const map = useMap()

  const reportView = useCallback(() => {
    const center = map.getCenter()
    onView({ bounds: map.getBounds(), lat: center.lat, lon: center.lng, zoom: map.getZoom() })
  }, [map, onView])

  useMapEvents({
    moveend: reportView,
    zoomend: reportView,
  })

  useEffect(() => {
    reportView()
  }, [reportView])

  useEffect(() => {
    if (request.id > 0) onScan(map.getBounds(), request.force)
  }, [map, onScan, request])

  return null
}

function Field({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="field-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function endpointLabel(endpoint) {
  if (!endpoint) return '—'
  try {
    return new URL(endpoint).hostname
  } catch {
    return endpoint
  }
}

function formatTimestamp(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

export default function App() {
  const initial = useRef(parseInitialState())
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [bounds, setBounds] = useState(null)
  const [view, setView] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [request, setRequest] = useState({ id: 0, force: false })
  const [filters, setFilters] = useState(initial.current.filters)
  const [loadedFingerprint, setLoadedFingerprint] = useState('')
  const [loadedAreaKm2, setLoadedAreaKm2] = useState(0)
  const [queryInfo, setQueryInfo] = useState(null)
  const [utilityMessage, setUtilityMessage] = useState('')
  const abortRef = useRef(null)

  const areaKm2 = useMemo(() => (bounds ? boundsAreaKm2(bounds) : 0), [bounds])
  const currentFingerprint = useMemo(() => boundsFingerprint(bounds), [bounds])
  const viewDirty = Boolean(loadedFingerprint && currentFingerprint && loadedFingerprint !== currentFingerprint)
  const signalArea = loadedFingerprint ? loadedAreaKm2 : areaKm2
  const signal = useMemo(() => mappingSignal(items, signalArea), [items, signalArea])
  const filtered = useMemo(() => items.filter((item) => filters[item.category]), [items, filters])
  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(Object.keys(CATEGORY_META).map((key) => [key, 0]))
    items.forEach((item) => { counts[item.category] = (counts[item.category] || 0) + 1 })
    return counts
  }, [items])

  useEffect(() => {
    if (!view) return
    const activeLayers = Object.entries(filters).filter(([, enabled]) => enabled).map(([key]) => key).join(',')
    const hash = `map=${view.zoom}/${view.lat.toFixed(5)}/${view.lon.toFixed(5)}&layers=${activeLayers}`
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${hash}`)
  }, [view, filters])

  useEffect(() => {
    if (!utilityMessage) return
    const timer = setTimeout(() => setUtilityMessage(''), 2200)
    return () => clearTimeout(timer)
  }, [utilityMessage])

  const runQuery = useCallback(async (nextBounds, force = false) => {
    const area = boundsAreaKm2(nextBounds)
    if (area > MAX_AREA_KM2) {
      setError(`Zoom in before loading data. Current view is about ${Math.round(area).toLocaleString()} km²; Peekaboo caps live queries at ${MAX_AREA_KM2.toLocaleString()} km².`)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError('')
    const started = performance.now()

    try {
      const result = await fetchSurveillance(nextBounds, controller.signal, { force })
      setItems(result.items)
      setSelected((current) => result.items.find((item) => item.id === current?.id) || null)
      setLoadedAreaKm2(area)
      setLoadedFingerprint(result.fingerprint)
      setLastUpdated(new Date(result.fetchedAt))
      setQueryInfo({ ...result, durationMs: Math.max(0, Math.round(performance.now() - started)) })
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message || 'Could not load OpenStreetMap surveillance data.')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  const handleView = useCallback((nextView) => {
    setBounds(nextView.bounds)
    setView({ lat: nextView.lat, lon: nextView.lon, zoom: nextView.zoom })
  }, [])

  const requestScan = (force = false) => setRequest((current) => ({ id: current.id + 1, force }))
  const toggleFilter = (key) => setFilters((current) => ({ ...current, [key]: !current[key] }))

  const copyViewLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setUtilityMessage('VIEW LINK COPIED')
    } catch {
      const input = document.createElement('textarea')
      input.value = window.location.href
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      input.remove()
      setUtilityMessage('VIEW LINK COPIED')
    }
  }

  const exportGeoJSON = () => {
    if (!filtered.length) return
    const blob = new Blob([JSON.stringify(toGeoJSON(filtered), null, 2)], { type: 'application/geo+json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `peekaboo-${new Date().toISOString().slice(0, 10)}.geojson`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setUtilityMessage(`EXPORTED ${filtered.length} OBJECT${filtered.length === 1 ? '' : 'S'}`)
  }

  const scanLabel = loading ? 'QUERYING OPENSTREETMAP…' : viewDirty ? 'RESCAN CURRENT MAP' : 'SCAN CURRENT MAP'

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="eye-logo"><span /></div>
          <div>
            <h1>PEEKABOO</h1>
            <p>Public Eye Explorer for Known Area-Based Observation Objects</p>
          </div>
        </div>
        <div className="tagline">SEE WHAT SEES YOU.</div>
      </header>

      <main className="workspace">
        <aside className="sidebar">
          <section className="panel intro-panel">
            <div className="eyebrow">PUBLIC DATA / OPEN MAP</div>
            <h2>Mapped surveillance infrastructure</h2>
            <p>
              Peekaboo visualizes surveillance objects voluntarily documented in OpenStreetMap. It does not discover devices, access camera feeds, or imply that unmapped areas are camera-free.
            </p>
            <button className="load-button" onClick={() => requestScan(false)} disabled={loading || !bounds}>
              {scanLabel}
            </button>
            <button className="secondary-button" onClick={() => requestScan(true)} disabled={loading || !bounds}>
              FORCE FRESH QUERY
            </button>
            {lastUpdated && (
              <div className="timestamp">
                Loaded {lastUpdated.toLocaleTimeString()} {queryInfo?.cached ? '• session cache' : '• live query'}
              </div>
            )}
            {viewDirty && <div className="notice-box">Map moved after the last scan. Loaded objects and statistics still belong to the previous viewport.</div>}
            {error && <div className="error-box">{error}</div>}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <span>VISIBLE LAYERS</span>
              <span>{filtered.length}/{items.length}</span>
            </div>
            <div className="filter-list">
              {Object.entries(CATEGORY_META).map(([key, meta]) => (
                <label className="filter-row" key={key}>
                  <input type="checkbox" checked={filters[key]} onChange={() => toggleFilter(key)} />
                  <span className={`legend-dot ${key}`}>{meta.glyph}</span>
                  <span>{meta.label}</span>
                  <strong>{categoryCounts[key] || 0}</strong>
                </label>
              ))}
            </div>
          </section>

          <section className="panel signal-panel">
            <div className="panel-heading"><span>MAPPING SIGNAL</span><span>NOT COVERAGE</span></div>
            <div className="metric-grid">
              <div><span>Mapped density</span><strong>{signal.densityLabel}</strong></div>
              <div><span>Tag detail</span><strong>{signal.detailLabel}</strong></div>
              <div><span>{loadedFingerprint ? 'Loaded area' : 'View area'}</span><strong>{Math.round(signalArea).toLocaleString()} km²</strong></div>
              <div><span>Objects</span><strong>{items.length}</strong></div>
            </div>
            <p className="microcopy">These values are bound to the viewport that produced the loaded OSM records, not real-world surveillance completeness.</p>
          </section>

          <section className="panel data-tools">
            <div className="panel-heading"><span>DATA TOOLS</span><span>PUBLIC RECORDS</span></div>
            <div className="source-grid">
              <span>Endpoint</span><strong>{endpointLabel(queryInfo?.endpoint)}</strong>
              <span>Fetch path</span><strong>{queryInfo?.cached ? 'SESSION CACHE' : queryInfo ? `${queryInfo.attempts} ENDPOINT${queryInfo.attempts === 1 ? '' : 'S'}` : '—'}</strong>
              <span>Query time</span><strong>{queryInfo ? `${queryInfo.durationMs} ms` : '—'}</strong>
            </div>
            <div className="tool-buttons">
              <button onClick={copyViewLink}>COPY VIEW LINK</button>
              <button onClick={exportGeoJSON} disabled={!filtered.length}>EXPORT GEOJSON</button>
            </div>
            {utilityMessage && <div className="utility-message">{utilityMessage}</div>}
          </section>
        </aside>

        <section className="map-stage">
          <MapContainer center={initial.current.center} zoom={initial.current.zoom} minZoom={3} preferCanvas className="map-root">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapBridge onView={handleView} onScan={runQuery} request={request} />
            {filtered.map((item) => (
              <Marker
                key={item.id}
                position={[item.lat, item.lon]}
                icon={makeMarkerIcon(item.category, selected?.id === item.id)}
                eventHandlers={{ click: () => setSelected(item) }}
              >
                <Popup>
                  <strong>{item.name}</strong><br />
                  {CATEGORY_META[item.category]?.label || 'Surveillance object'}<br />
                  Zone: {item.zone}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
          <div className={`map-hud ${viewDirty ? 'warn' : ''}`}>
            <span className={loading ? 'pulse' : ''} />
            {loading ? 'LIVE OSM QUERY' : viewDirty ? 'VIEW MOVED • RESCAN' : queryInfo?.cached ? 'SESSION CACHE • PUBLIC OSM' : 'PUBLIC OSM DATA'}
          </div>
        </section>

        <aside className={`detail-drawer ${selected ? 'open' : ''}`}>
          {selected ? (
            <>
              <button className="close-button" onClick={() => setSelected(null)} aria-label="Close details">×</button>
              <div className="eyebrow">OBJECT / {selected.osmType.toUpperCase()} {selected.osmId}</div>
              <h2>{selected.name}</h2>
              <div className={`category-pill ${selected.category}`}>{CATEGORY_META[selected.category]?.label}</div>
              <div className="field-list">
                <Field label="Observed zone" value={selected.zone} />
                <Field label="Operator" value={selected.operator} />
                <Field label="Camera type" value={selected.cameraType} />
                <Field label="Direction" value={selected.direction} />
                <Field label="Indoor" value={selected.indoor} />
                <Field label="OSM version" value={selected.version} />
                <Field label="Record updated" value={formatTimestamp(selected.timestamp)} />
                <Field label="Changeset" value={selected.changeset} />
                <Field label="Coordinates" value={`${selected.lat.toFixed(5)}, ${selected.lon.toFixed(5)}`} />
              </div>
              <a className="osm-link" href={`https://www.openstreetmap.org/${selected.osmType}/${selected.osmId}`} target="_blank" rel="noreferrer">
                VIEW SOURCE OBJECT ↗
              </a>
              {selected.changeset && (
                <a className="secondary-link" href={`https://www.openstreetmap.org/changeset/${selected.changeset}`} target="_blank" rel="noreferrer">
                  VIEW SOURCE CHANGESET ↗
                </a>
              )}
              <details className="raw-tags">
                <summary>Raw OSM tags</summary>
                <pre>{JSON.stringify(selected.tags, null, 2)}</pre>
              </details>
            </>
          ) : (
            <div className="empty-detail">
              <div className="eye-logo big"><span /></div>
              <h2>Select an object</h2>
              <p>Click a mapped marker to inspect its public OpenStreetMap metadata and source provenance.</p>
            </div>
          )}
        </aside>
      </main>

      <footer>
        <span>PEEKABOO v0.2</span>
        <span>PUBLIC DATA • NO LIVE FEEDS • NO DEVICE DISCOVERY</span>
        <span>DATA © OPENSTREETMAP CONTRIBUTORS</span>
      </footer>
    </div>
  )
}
