import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { boundsAreaKm2, CATEGORY_META, fetchSurveillance, mappingSignal } from './data.js'

const START = [40.7128, -74.006]
const MAX_AREA_KM2 = 2500

function makeMarkerIcon(category, selected) {
  const meta = CATEGORY_META[category] || CATEGORY_META.other
  return L.divIcon({
    className: '',
    html: `<div class="map-marker ${category} ${selected ? 'selected' : ''}" aria-label="${meta.label}"><span>${meta.glyph}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  })
}

function MapBridge({ onBounds, requestToken }) {
  const map = useMap()
  useMapEvents({
    moveend: () => onBounds(map.getBounds()),
    zoomend: () => onBounds(map.getBounds()),
  })

  useEffect(() => {
    onBounds(map.getBounds())
  }, [map, onBounds])

  useEffect(() => {
    if (requestToken > 0) onBounds(map.getBounds(), true)
  }, [map, onBounds, requestToken])

  return null
}

function Field({ label, value }) {
  if (!value) return null
  return (
    <div className="field-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default function App() {
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [bounds, setBounds] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [requestToken, setRequestToken] = useState(0)
  const [filters, setFilters] = useState(() => Object.fromEntries(Object.keys(CATEGORY_META).map((key) => [key, true])))
  const abortRef = useRef(null)

  const areaKm2 = useMemo(() => (bounds ? boundsAreaKm2(bounds) : 0), [bounds])
  const signal = useMemo(() => mappingSignal(items, areaKm2), [items, areaKm2])
  const filtered = useMemo(() => items.filter((item) => filters[item.category]), [items, filters])

  const runQuery = useCallback(async (nextBounds) => {
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

    try {
      const next = await fetchSurveillance(nextBounds, controller.signal)
      setItems(next)
      setSelected((current) => next.find((item) => item.id === current?.id) || null)
      setLastUpdated(new Date())
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message || 'Could not load OpenStreetMap surveillance data.')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  const handleBounds = useCallback((nextBounds, force = false) => {
    setBounds(nextBounds)
    if (force) runQuery(nextBounds)
  }, [runQuery])

  const toggleFilter = (key) => setFilters((current) => ({ ...current, [key]: !current[key] }))

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
            <button className="load-button" onClick={() => setRequestToken((value) => value + 1)} disabled={loading || !bounds}>
              {loading ? 'QUERYING OPENSTREETMAP…' : 'SCAN CURRENT MAP'}
            </button>
            {lastUpdated && <div className="timestamp">Loaded {lastUpdated.toLocaleTimeString()}</div>}
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
                </label>
              ))}
            </div>
          </section>

          <section className="panel signal-panel">
            <div className="panel-heading"><span>MAPPING SIGNAL</span><span>NOT COVERAGE</span></div>
            <div className="metric-grid">
              <div><span>Mapped density</span><strong>{signal.densityLabel}</strong></div>
              <div><span>Tag detail</span><strong>{signal.detailLabel}</strong></div>
              <div><span>View area</span><strong>{Math.round(areaKm2).toLocaleString()} km²</strong></div>
              <div><span>Objects</span><strong>{items.length}</strong></div>
            </div>
            <p className="microcopy">These values describe the OSM records currently loaded, not real-world surveillance completeness.</p>
          </section>
        </aside>

        <section className="map-stage">
          <MapContainer center={START} zoom={13} minZoom={3} preferCanvas className="map-root">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapBridge onBounds={handleBounds} requestToken={requestToken} />
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
          <div className="map-hud">
            <span className={loading ? 'pulse' : ''} />
            {loading ? 'LIVE OSM QUERY' : 'PUBLIC OSM DATA'}
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
                <Field label="Coordinates" value={`${selected.lat.toFixed(5)}, ${selected.lon.toFixed(5)}`} />
              </div>
              <a className="osm-link" href={`https://www.openstreetmap.org/${selected.osmType}/${selected.osmId}`} target="_blank" rel="noreferrer">
                VIEW SOURCE OBJECT ↗
              </a>
              <details className="raw-tags">
                <summary>Raw OSM tags</summary>
                <pre>{JSON.stringify(selected.tags, null, 2)}</pre>
              </details>
            </>
          ) : (
            <div className="empty-detail">
              <div className="eye-logo big"><span /></div>
              <h2>Select an object</h2>
              <p>Click a mapped marker to inspect its public OpenStreetMap metadata.</p>
            </div>
          )}
        </aside>
      </main>

      <footer>
        <span>PEEKABOO v0.1</span>
        <span>PUBLIC DATA • NO LIVE FEEDS • NO DEVICE DISCOVERY</span>
        <span>DATA © OPENSTREETMAP CONTRIBUTORS</span>
      </footer>
    </div>
  )
}
